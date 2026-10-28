(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = window.i18n.t;
  const api = window.SHARING_API;
  let saving = false;
  let previewMode = "selection";
  let previewGameOver = false;
  let previewRequest = 0;
  let previewFrame = 0;
  function showExpiry(element, expiresAt) {
    if (!Number.isFinite(expiresAt)) return;
    element.dataset.expiresAt = expiresAt;
    element.hidden = false;
    const date = new Date(expiresAt * 1000);
    const formatted = new Intl.DateTimeFormat(document.documentElement.lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
    element.textContent = t("到期时间：{date}。届时游戏及照片将自动删除。", {
      date: formatted,
    });
  }
  document.addEventListener("languagechange", () => {
    document
      .querySelectorAll("[data-expires-at]")
      .forEach((element) =>
        showExpiry(element, Number(element.dataset.expiresAt)),
      );
  });
  const colorNames = {
    bg: "页面背景",
    ink: "主要文字",
    red: "面板背景",
    soft: "次要文字",
    border: "边框",
    button: "主要按钮",
    buttonText: "按钮文字",
    boardTop: "游戏背景顶部",
    boardBottom: "游戏背景底部",
    ballBorder: "照片圆框",
    guide: "投放与警戒线",
    effect: "合成效果",
    overlay: "结束画面背景",
    focus: "焦点高亮",
  };
  const selectedThemes = () =>
    Array.from(
      document.querySelectorAll("#included-themes input:checked"),
      (input) => input.value,
    );
  for (const theme of window.BUILT_IN_THEMES) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = theme.id;
    checkbox.checked = true;
    const name = document.createElement("span");
    name.dataset.i18n = theme.name;
    name.textContent = t(theme.name);
    label.append(checkbox, name);
    $("included-themes").append(label);
    checkbox.addEventListener("change", updateShare);
    checkbox.addEventListener("change", schedulePreview);
  }
  for (const [key, name] of Object.entries(colorNames)) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "color";
    input.value = window.gamePalette.get()[key];
    input.dataset.color = key;
    const span = document.createElement("span");
    span.dataset.i18n = name;
    span.textContent = t(name);
    label.append(input, span);
    $("palette-controls").append(label);
    input.addEventListener("input", () =>
      window.gamePalette.set({ [key]: input.value }),
    );
  }
  $("reset-palette").addEventListener("click", () => {
    window.gamePalette.set(window.gamePalette.defaults);
    document.querySelectorAll("[data-color]").forEach((input) => {
      input.value = window.gamePalette.defaults[input.dataset.color];
    });
  });
  function updateShare() {
    $("share-game").disabled =
      saving ||
      !api ||
      !window.themePicker.canShare() ||
      (!window.themePicker.count() && !selectedThemes().length);
  }
  function errorMessage(error) {
    if (error.code === "not_found")
      return t("分享已过期、已删除、不存在或尚未同步。新链接请稍后重试。");
    if (error.code === "rate_limited")
      return t("保存过于频繁，请一分钟后重试。");
    if (error.code === "too_large")
      return t("图片总大小超出限制，请减少照片后重试。");
    return t("暂时无法连接分享服务。请稍后重试，你的照片仍在此页面。");
  }
  async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, {
      ...options,
      signal: AbortSignal.timeout(45000),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      const error = new Error("Sharing request failed");
      error.code = (await response.json().catch(() => ({}))).error;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  function makeLink(id, token) {
    const link = new URL(location.href);
    link.search = "";
    link.searchParams.set("game", id);
    link.hash = token ? `delete=${token}` : "";
    return link.href;
  }
  $("share-game").addEventListener("click", async () => {
    if ($("share-game").disabled) return;
    const game = {
      version: 1,
      title: $("game-title").value.trim() || t("我的合成游戏"),
      ...window.themePicker.snapshot(),
      themes: selectedThemes(),
      palette: window.gamePalette.get(),
    };
    saving = true;
    updateShare();
    $("share-status").textContent = t("正在保存分享…");
    try {
      const saved = await request("/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });
      $("share-link").value = makeLink(saved.id);
      $("delete-link").value = makeLink(saved.id, saved.deleteToken);
      $("share-result").hidden = false;
      showExpiry($("share-expiry"), saved.expiresAt);
      $("share-status").textContent = t(
        "分享已保存。新链接可能需要约一分钟才能在其他地区打开。",
      );
      $("share-link").focus();
      $("share-link").select();
    } catch (error) {
      $("share-status").textContent = errorMessage(error);
    } finally {
      saving = false;
      updateShare();
    }
  });
  for (const [button, input] of [
    ["copy-share", "share-link"],
    ["copy-delete", "delete-link"],
  ]) {
    $(button).addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($(input).value);
        $("share-status").textContent = t("链接已复制。");
      } catch {
        $(input).focus();
        $(input).select();
        $("share-status").textContent = t("请选择并复制链接。");
      }
    });
  }
  document.addEventListener("photoschange", updateShare);
  async function renderPreview() {
    const current = ++previewRequest;
    if ($("custom-form").hidden) return;
    try {
      const canvas = await window.gamePreview.render(
        {
          title: $("game-title").value.trim() || t("我的合成游戏"),
          images: window.themePicker.previewImages(),
          themes: selectedThemes(),
          palette: window.gamePalette.get(),
        },
        previewMode,
        previewGameOver,
      );
      if (current !== previewRequest) return;
      $("color-preview").getContext("2d").drawImage(canvas, 0, 0);
      $("color-preview-status").textContent = "";
    } catch {
      if (current !== previewRequest) return;
      $("color-preview").getContext("2d").clearRect(0, 0, 1200, 630);
      $("color-preview-status").textContent = t("预览图片加载失败，请重试。");
    }
  }
  function schedulePreview() {
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(renderPreview);
  }
  ["photoschange", "palettechange", "languagechange"].forEach((event) =>
    document.addEventListener(event, schedulePreview),
  );
  $("game-title").addEventListener("input", schedulePreview);
  $("customize").addEventListener("click", schedulePreview);
  for (const mode of ["selection", "board"]) {
    $(
      mode === "selection" ? "preview-selection" : "preview-board",
    ).addEventListener("click", () => {
      previewMode = mode;
      $("preview-selection").setAttribute(
        "aria-pressed",
        String(mode === "selection"),
      );
      $("preview-board").setAttribute("aria-pressed", String(mode === "board"));
      $("preview-game-over").hidden = mode !== "board";
      schedulePreview();
    });
  }
  $("preview-game-over").addEventListener("click", () => {
    previewGameOver = !previewGameOver;
    $("preview-game-over").setAttribute(
      "aria-pressed",
      String(previewGameOver),
    );
    schedulePreview();
  });
  if (!api)
    $("share-status").textContent = t("分享服务尚未配置，可先在本地预览。");
  updateShare();

  const id = new URLSearchParams(location.search).get("game");
  let deleteToken = new URLSearchParams(location.hash.slice(1)).get("delete");
  // Keep the private delete token out of analytics and subsequent navigation.
  if (deleteToken)
    history.replaceState(null, "", location.pathname + location.search);
  if (!id) return;
  let gameLoaded = false;
  window.addEventListener("hashchange", () => {
    const token = new URLSearchParams(location.hash.slice(1)).get("delete");
    if (!token) return;
    deleteToken = token;
    history.replaceState(null, "", location.pathname + location.search);
    if (gameLoaded) $("delete-shared").hidden = false;
  });
  $("theme-selection").hidden = true;
  $("custom-form").hidden = true;
  $("shared-actions").hidden = false;
  async function loadShared() {
    $("theme-status").textContent = t("正在加载分享…");
    try {
      if (!api || !/^[a-f0-9]{32}$/.test(id))
        throw Object.assign(new Error(), { code: "not_found" });
      const game = await request(`/games/${id}`);
      if (
        game.version !== 1 ||
        !Array.isArray(game.images) ||
        !Array.isArray(game.themes)
      )
        throw new Error("Invalid game");
      window.gamePalette.set(game.palette);
      window.themePicker.showShared(game);
      showExpiry($("shared-expiry"), game.expiresAt);
      gameLoaded = true;
      if (!$("copy-shared-link")) {
        const copy = document.createElement("button");
        copy.id = "copy-shared-link";
        copy.type = "button";
        copy.className = "secondary-button";
        copy.dataset.i18n = "复制分享链接";
        copy.textContent = t("复制分享链接");
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(makeLink(id));
            $("theme-status").textContent = t("链接已复制。");
          } catch {
            $("shared-link-fallback").hidden = false;
            $("shared-link-fallback").focus();
            $("shared-link-fallback").select();
          }
        });
        const fallback = document.createElement("input");
        fallback.id = "shared-link-fallback";
        fallback.type = "url";
        fallback.readOnly = true;
        fallback.hidden = true;
        fallback.value = makeLink(id);
        fallback.setAttribute("aria-label", t("发送给朋友"));
        $("shared-actions").append(copy, fallback);
      }
      $("theme-status").textContent = "";
      if (deleteToken) $("delete-shared").hidden = false;
      $("retry-shared")?.remove();
    } catch (error) {
      $("theme-status").textContent = errorMessage(error);
      if (!$("retry-shared")) {
        const retry = document.createElement("button");
        retry.id = "retry-shared";
        retry.className = "secondary-button";
        retry.type = "button";
        retry.dataset.i18n = "重试";
        retry.textContent = t("重试");
        retry.addEventListener("click", loadShared);
        $("shared-actions").append(retry);
      }
    }
  }
  $("delete-shared").addEventListener("click", async () => {
    if (!confirm(t("确定删除此分享？朋友将无法再打开它。"))) return;
    $("delete-shared").disabled = true;
    try {
      await request(`/games/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${deleteToken}` },
      });
      window.mergeGame.pause();
      $("app").hidden = true;
      $("level-screen").hidden = true;
      $("theme-screen").hidden = false;
      $("theme-selection").hidden = true;
      $("delete-shared").hidden = true;
      $("copy-shared-link")?.remove();
      $("shared-link-fallback")?.remove();
      $("shared-expiry").hidden = true;
      $("theme-status").textContent = t(
        "分享已删除。其他地区的缓存可能需要约一分钟更新。",
      );
    } catch (error) {
      $("theme-status").textContent = errorMessage(error);
      $("delete-shared").disabled = false;
    }
  });
  loadShared();
})();
