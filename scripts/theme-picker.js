(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const t = window.i18n.t;
  const photos = [];
  let busy = false;
  let editing = null;
  let selectedTheme = null;
  let previewImages = [];
  let previewRequest = 0;
  let sharedMode = false;
  let savedCrops = {};
  try {
    const stored = JSON.parse(
      localStorage.getItem("mywho_theme_crops") || "{}",
    );
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      for (const [source, settings] of Object.entries(stored)) {
        if (
          settings &&
          Number.isFinite(settings.zoom) &&
          settings.zoom >= 0.5 &&
          settings.zoom <= 4 &&
          Number.isFinite(settings.cx) &&
          settings.cx >= 0 &&
          settings.cx <= 1 &&
          Number.isFinite(settings.cy) &&
          settings.cy >= 0 &&
          settings.cy <= 1
        )
          savedCrops[source] = settings;
      }
    }
  } catch {}
  const themeCrop = (theme, index) =>
    (theme.shared ? null : savedCrops[theme.sources[index]]) ||
    theme.crops?.[index] ||
    defaults();

  function openCrop(photo) {
    editing = photo;
    const side =
      Math.min(photo.image.naturalWidth, photo.image.naturalHeight) /
      photo.settings.zoom;
    $("crop-zoom").value = photo.settings.zoom;
    $("crop-x").value =
      photo.settings.cx ??
      ((photo.image.naturalWidth - side) * photo.settings.x + side / 2) /
        photo.image.naturalWidth;
    $("crop-y").value =
      photo.settings.cy ??
      ((photo.image.naturalHeight - side) * photo.settings.y + side / 2) /
        photo.image.naturalHeight;
    previewCrop();
    $("crop-dialog").showModal();
  }
  const defaults = () => ({ zoom: 1, x: 0.5, y: 0.5 });
  const levelCount = () => Number($("level-count").value);
  const validCount = () =>
    Number.isInteger(levelCount()) && levelCount() >= 2 && levelCount() <= 15;

  async function loadImage(source) {
    const image = new Image();
    image.src = source;
    await image.decode();
    return image;
  }

  function crop(image, settings, canvas = document.createElement("canvas")) {
    canvas.width = canvas.height = 320;
    const context = canvas.getContext("2d");
    const side =
      Math.min(image.naturalWidth, image.naturalHeight) / settings.zoom;
    const x =
      settings.cx == null
        ? (image.naturalWidth - side) * settings.x
        : image.naturalWidth * settings.cx - side / 2;
    const y =
      settings.cy == null
        ? (image.naturalHeight - side) * settings.y
        : image.naturalHeight * settings.cy - side / 2;
    context.clearRect(0, 0, 320, 320);
    context.save();
    context.beginPath();
    context.arc(160, 160, 160, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = window.gamePalette.get().red;
    context.fillRect(0, 0, 320, 320);
    context.drawImage(image, x, y, side, side, 0, 0, 320, 320);
    context.restore();
    return canvas;
  }

  function updateStatus() {
    $("photo-status").textContent = validCount()
      ? t("已添加 {count} / {levels} 张照片。每个等级需要一张照片。", {
          count: photos.length,
          levels: levelCount(),
        })
      : t("请输入 2 到 15 之间的整数等级数量。");
    $("play-custom").disabled =
      busy || !validCount() || photos.length !== levelCount();
    $("photo-files").disabled = busy;
    document.dispatchEvent(new Event("photoschange"));
    document
      .querySelectorAll(".theme-card, #customize")
      .forEach((button) => (button.disabled = busy));
  }

  function renderPhotos() {
    $("photo-list").replaceChildren();
    photos.forEach((photo, index) => {
      const item = document.createElement("li");
      const preview = document.createElement("img");
      preview.src = photo.cropped.toDataURL("image/png");
      preview.alt = `${t("等级 {n}", { n: index + 1 })}: ${photo.name}`;
      const caption = document.createElement("span");
      caption.textContent = t("等级 {n}", { n: index + 1 });
      item.append(preview, caption);
      function action(text, label, callback, disabled = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.setAttribute("aria-label", label);
        button.disabled = disabled || busy;
        button.addEventListener("click", callback);
        item.append(button);
      }
      action(t("裁剪"), t("重新裁剪等级 {n}", { n: index + 1 }), () => {
        openCrop(photo);
      });
      action(
        "↑",
        t("将等级 {n} 前移", { n: index + 1 }),
        () => {
          [photos[index - 1], photos[index]] = [
            photos[index],
            photos[index - 1],
          ];
          renderPhotos();
        },
        index === 0,
      );
      action(
        "↓",
        t("将等级 {n} 后移", { n: index + 1 }),
        () => {
          [photos[index + 1], photos[index]] = [
            photos[index],
            photos[index + 1],
          ];
          renderPhotos();
        },
        index === photos.length - 1,
      );
      action(t("删除"), t("删除等级 {n}", { n: index + 1 }), () => {
        photos.splice(index, 1);
        renderPhotos();
      });
      $("photo-list").append(item);
    });
    updateStatus();
  }

  function cropSettings() {
    return {
      zoom: Number($("crop-zoom").value),
      cx: Number($("crop-x").value),
      cy: Number($("crop-y").value),
    };
  }
  function previewCrop() {
    if (editing) crop(editing.image, cropSettings(), $("crop-preview"));
  }
  ["crop-zoom", "crop-x", "crop-y"].forEach((id) =>
    $(id).addEventListener("input", previewCrop),
  );
  $("crop-cancel").addEventListener("click", () => $("crop-dialog").close());
  $("crop-save").addEventListener("click", () => {
    editing.settings = cropSettings();
    editing.cropped = crop(editing.image, editing.settings);
    if (editing.save) editing.save(editing);
    else renderPhotos();
    $("crop-dialog").close();
  });
  $("crop-dialog").addEventListener("close", () => {
    editing = null;
  });

  function start(images) {
    $("theme-screen").hidden = true;
    $("level-screen").hidden = true;
    $("app").hidden = false;
    window.mergeGame.start(images);
    $("choose-theme").focus();
  }

  function addThemeCard(theme) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card";
    const preview = document.createElement("img");
    loadImage(theme.sources[0])
      .then((image) => {
        preview.src = theme.preCropped
          ? theme.sources[0]
          : crop(image, themeCrop(theme, 0)).toDataURL();
      })
      .catch(() => {
        preview.src = theme.sources[0];
      });
    preview.alt = "";
    const name = document.createElement("strong");
    name.textContent = t(theme.name);
    name.dataset.i18n = theme.name;
    const detail = document.createElement("span");
    detail.textContent = t("{count} 个等级 · 预览", {
      count: theme.sources.length,
    });
    detail.dataset.levels = theme.sources.length;
    button.append(preview, name, detail);
    button.addEventListener("click", async () => {
      if (busy) return;
      const request = ++previewRequest;
      selectedTheme = theme;
      previewImages = [];
      $("level-heading").textContent = t(theme.name);
      $("level-preview-list").replaceChildren();
      $("preview-play").disabled = true;
      $("theme-screen").hidden = true;
      $("level-screen").hidden = false;
      $("level-screen").scrollTop = 0;
      $("preview-back").focus();
      $("preview-status").textContent = t("正在加载主题…");
      busy = true;
      updateStatus();
      try {
        const images = await Promise.all(theme.sources.map(loadImage));
        if (request !== previewRequest) return;
        previewImages = images.map((image, index) =>
          theme.preCropped ? image : crop(image, themeCrop(theme, index)),
        );
        previewImages.forEach((canvas, index) => {
          const item = document.createElement("li");
          const image = document.createElement("img");
          image.src = theme.preCropped ? canvas.src : canvas.toDataURL();
          image.alt = t("等级 {n}", { n: index + 1 });
          image.dataset.previewLevel = index + 1;
          const number = document.createElement("span");
          number.textContent = index + 1;
          number.setAttribute("aria-hidden", "true");
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "level-crop-button";
          edit.dataset.cropLevel = index + 1;
          edit.setAttribute(
            "aria-label",
            t("重新裁剪等级 {n}", { n: index + 1 }),
          );
          edit.append(image, number);
          edit.disabled = !!theme.shared;
          edit.addEventListener("click", () =>
            openCrop({
              image: images[index],
              settings: themeCrop(theme, index),
              save(photo) {
                savedCrops[theme.sources[index]] = photo.settings;
                previewImages[index] = photo.cropped;
                image.src = photo.cropped.toDataURL();
                if (index === 0) preview.src = image.src;
                try {
                  localStorage.setItem(
                    "mywho_theme_crops",
                    JSON.stringify(savedCrops),
                  );
                  $("preview-status").textContent = t("裁剪已保存到此浏览器。");
                } catch {
                  $("preview-status").textContent = t(
                    "裁剪已应用，但无法保存到浏览器。刷新后将恢复默认。",
                  );
                }
              },
            }),
          );
          item.append(edit);
          $("level-preview-list").append(item);
        });
        $("preview-status").textContent = "";
        $("preview-play").disabled = false;
      } catch {
        if (request === previewRequest)
          $("preview-status").textContent = t("主题图片加载失败，请重试。");
      } finally {
        if (request === previewRequest) {
          busy = false;
          updateStatus();
        }
      }
    });
    $("theme-options").append(button);
  }
  window.BUILT_IN_THEMES.forEach(addThemeCard);

  $("preview-back").addEventListener("click", () => {
    previewRequest++;
    busy = false;
    updateStatus();
    $("level-screen").hidden = true;
    $("theme-screen").hidden = false;
    const index = window.BUILT_IN_THEMES.indexOf(selectedTheme);
    $("theme-options").children[Math.max(0, index)]?.focus();
  });
  $("preview-play").addEventListener("click", () => {
    if (!busy && previewImages.length) start(previewImages);
  });

  $("customize").addEventListener("click", () => {
    $("custom-form").hidden = false;
    $("theme-selection").hidden = true;
    $("level-count").focus();
    updateStatus();
  });
  $("custom-back").addEventListener("click", () => {
    $("custom-form").hidden = true;
    $("theme-selection").hidden = false;
    $("customize").focus();
  });
  $("level-count").addEventListener("input", updateStatus);
  $("photo-files").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 15) {
      $("photo-status").textContent = t(
        "最多允许 15 张照片。请减少选择或删除已有照片。",
      );
      return;
    }
    busy = true;
    renderPhotos();
    const failures = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        // Bound retained image memory while preserving enough detail for recropping.
        const scale = Math.min(
          1,
          1600 / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const buffer = document.createElement("canvas");
        buffer.width = Math.max(1, Math.round(image.naturalWidth * scale));
        buffer.height = Math.max(1, Math.round(image.naturalHeight * scale));
        buffer
          .getContext("2d")
          .drawImage(image, 0, 0, buffer.width, buffer.height);
        const retained = await loadImage(buffer.toDataURL("image/png"));
        const settings = defaults();
        photos.push({
          name: file.name,
          image: retained,
          settings,
          cropped: crop(retained, settings),
        });
      } catch {
        failures.push(file.name);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    busy = false;
    renderPhotos();
    if (failures.length)
      $("photo-status").textContent +=
        " " +
        t("无法读取：{files}。请使用 PNG、JPEG 或 WebP。", {
          files: failures.join(", "),
        });
  });
  $("custom-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy || !validCount() || photos.length !== levelCount()) return;
    start(photos.map((photo) => photo.cropped));
  });
  $("choose-theme").addEventListener("click", () => {
    window.mergeGame.pause();
    $("app").hidden = true;
    $("theme-screen").hidden = false;
    if (sharedMode) document.querySelector("#theme-options button")?.focus();
    else $("customize").focus();
  });
  document.addEventListener("languagechange", () => {
    document
      .querySelectorAll("[data-crop-level]")
      .forEach((button) =>
        button.setAttribute(
          "aria-label",
          t("重新裁剪等级 {n}", { n: button.dataset.cropLevel }),
        ),
      );
    document.querySelectorAll("[data-preview-level]").forEach((image) => {
      image.alt = t("等级 {n}", { n: image.dataset.previewLevel });
    });
    renderPhotos();
    document.querySelectorAll("[data-levels]").forEach(
      (el) =>
        (el.textContent = t("{count} 个等级 · 预览", {
          count: el.dataset.levels,
        })),
    );
    if (busy) $("theme-status").textContent = t("正在加载主题…");
    else $("theme-status").textContent = "";
  });
  window.themePicker = {
    count() {
      return photos.length;
    },
    snapshot() {
      return {
        images: photos.map((photo) =>
          photo.cropped.toDataURL("image/webp", 0.85),
        ),
        levels: photos.length,
      };
    },
    canShare() {
      return (
        !busy &&
        (photos.length === 0 ||
          (validCount() && photos.length === levelCount()))
      );
    },
    showShared(game) {
      sharedMode = true;
      $("custom-form").hidden = true;
      $("customize").hidden = true;
      $("theme-selection").hidden = false;
      $("theme-options").replaceChildren();
      $("theme-heading").removeAttribute("data-i18n");
      $("theme-heading").textContent = game.title;
      document.querySelector(
        "#level-screen p[data-i18n='点击任意图片调整裁剪。修改仅保存在此浏览器。']",
      ).hidden = true;
      if (game.images.length)
        addThemeCard({
          id: "custom",
          name: "自定义照片",
          sources: game.images,
          shared: true,
          preCropped: true,
        });
      window.BUILT_IN_THEMES.filter((theme) =>
        game.themes.includes(theme.id),
      ).forEach((theme) => addThemeCard({ ...theme, shared: true }));
    },
  };
  updateStatus();
})();
