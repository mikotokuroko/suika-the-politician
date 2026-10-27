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
    context.fillStyle = "#7a1812";
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
        editing = photo;
        $("crop-zoom").value = photo.settings.zoom;
        $("crop-x").value = photo.settings.x;
        $("crop-y").value = photo.settings.y;
        previewCrop();
        $("crop-dialog").showModal();
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
      x: Number($("crop-x").value),
      y: Number($("crop-y").value),
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
    $("crop-dialog").close();
    renderPhotos();
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

  window.BUILT_IN_THEMES.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card";
    const preview = document.createElement("img");
    loadImage(theme.sources[0])
      .then((image) => {
        preview.src = crop(image, theme.crops?.[0] || defaults()).toDataURL();
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
          crop(image, theme.crops?.[index] || defaults()),
        );
        previewImages.forEach((canvas, index) => {
          const item = document.createElement("li");
          const image = document.createElement("img");
          image.src = canvas.toDataURL();
          image.alt = t("等级 {n}", { n: index + 1 });
          image.dataset.previewLevel = index + 1;
          const number = document.createElement("span");
          number.textContent = index + 1;
          number.setAttribute("aria-hidden", "true");
          item.append(image, number);
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
  });

  $("preview-back").addEventListener("click", () => {
    previewRequest++;
    busy = false;
    updateStatus();
    $("level-screen").hidden = true;
    $("theme-screen").hidden = false;
    const index = window.BUILT_IN_THEMES.indexOf(selectedTheme);
    $("theme-options").children[index]?.focus();
  });
  $("preview-play").addEventListener("click", () => {
    if (!busy && previewImages.length) start(previewImages);
  });

  $("customize").addEventListener("click", () => {
    $("custom-form").hidden = false;
    $("level-count").focus();
    updateStatus();
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
    $("customize").focus();
  });
  document.addEventListener("languagechange", () => {
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
  updateStatus();
})();
