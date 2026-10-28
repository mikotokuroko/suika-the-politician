(() => {
  "use strict";
  const cache = new Map();
  const t = (key, values) => window.i18n.t(key, values);
  async function load(source) {
    if (typeof source !== "string") return source;
    if (!cache.has(source)) {
      const image = new Image();
      image.src = source;
      const ready = image
        .decode()
        .then(() => image)
        .catch((error) => {
          cache.delete(source);
          throw error;
        });
      // Only built-in assets are cached; custom images should not accumulate.
      if (!source.startsWith("data:")) cache.set(source, ready);
      return ready;
    }
    return cache.get(source);
  }
  function panel(ctx, x, y, w, h, fill, stroke, radius = 20) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  function text(ctx, value, x, y, size, color, width, weight = "normal") {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px serif`;
    ctx.fillText(value, x, y, width);
  }
  function circle(ctx, image, settings, x, y, radius, palette) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = palette.red;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    if (image) {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const side = Math.min(width, height) / (settings?.zoom || 1);
      const sx = width * (settings?.cx ?? 0.5) - side / 2;
      const sy = height * (settings?.cy ?? 0.5) - side / 2;
      ctx.drawImage(
        image,
        sx,
        sy,
        side,
        side,
        x - radius,
        y - radius,
        radius * 2,
        radius * 2,
      );
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.ballBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  async function choices(game) {
    const items = [];
    if (game.images.length)
      items.push({
        name: t("自定义照片"),
        count: game.images.length,
        images: await Promise.all(game.images.slice(0, 4).map(load)),
      });
    for (const theme of window.BUILT_IN_THEMES.filter((theme) =>
      game.themes.includes(theme.id),
    )) {
      items.push({
        name: t(theme.name),
        count: theme.sources.length,
        images: [await load(theme.sources[0])],
        crop: theme.crops?.[0],
      });
    }
    return items;
  }
  async function render(game, mode = "selection", gameOver = false) {
    const items = await choices(game);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    const p = game.palette;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, 1200, 630);
    if (mode === "selection") {
      text(ctx, "SUIKA THE POLITICIAN", 48, 52, 20, p.soft, 1104);
      text(
        ctx,
        game.title || t("我的合成游戏"),
        48,
        112,
        46,
        p.ink,
        1104,
        "bold",
      );
      text(ctx, t("选择你的合成主题"), 48, 158, 25, p.soft, 1104);
      if (!items.length)
        text(
          ctx,
          t("添加照片或选择一个默认主题以查看预览。"),
          48,
          330,
          30,
          p.soft,
          1104,
        );
      const gap = 20;
      const width =
        (1104 - gap * (items.length - 1)) / Math.max(items.length, 1);
      items.forEach((item, index) => {
        const x = 48 + index * (width + gap);
        panel(ctx, x, 194, width, 330, p.red, p.border);
        circle(ctx, item.images[0], item.crop, x + width / 2, 285, 65, p);
        ctx.textAlign = "center";
        text(ctx, item.name, x + width / 2, 395, 32, p.ink, width - 24, "bold");
        text(
          ctx,
          t("{count} 个等级 · 预览", { count: item.count }),
          x + width / 2,
          435,
          22,
          p.soft,
          width - 24,
        );
        const extras = item.images.slice(1);
        extras.forEach((image, n) =>
          circle(
            ctx,
            image,
            null,
            x + width / 2 + (n - (extras.length - 1) / 2) * 48,
            480,
            18,
            p,
          ),
        );
        ctx.textAlign = "left";
      });
      panel(ctx, 48, 553, 250, 48, p.button, null, 12);
      text(ctx, t("开始游戏"), 72, 585, 25, p.buttonText, 202, "bold");
    } else {
      text(ctx, t("分数") + " 128", 48, 70, 28, p.ink, 250, "bold");
      text(ctx, t("最高分") + " 512", 48, 111, 22, p.soft, 250);
      panel(ctx, 48, 150, 220, 58, p.button, p.focus, 12);
      text(ctx, t("重来"), 74, 188, 26, p.buttonText, 168);
      panel(ctx, 48, 231, 220, 58, p.red, p.border, 12);
      text(ctx, t("主题"), 74, 269, 26, p.ink, 168);
      const gradient = ctx.createLinearGradient(0, 28, 0, 602);
      gradient.addColorStop(0, p.boardTop);
      gradient.addColorStop(1, p.boardBottom);
      panel(ctx, 320, 28, 832, 574, gradient, p.border);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(320, 28, 832, 574, 20);
      ctx.clip();
      ctx.strokeStyle = p.guide;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.moveTo(320, 170);
      ctx.lineTo(1152, 170);
      ctx.moveTo(735, 115);
      ctx.lineTo(735, 600);
      ctx.stroke();
      ctx.setLineDash([]);
      const images = items.flatMap((item) =>
        item.images.map((image) => ({ image, crop: item.crop })),
      );
      const ball = (index, x, y, r) => {
        const item = images[index % Math.max(images.length, 1)];
        circle(ctx, item?.image, item?.crop, x, y, r, p);
      };
      ball(0, 735, 90, 35);
      ball(1, 450, 536, 64);
      ball(2, 595, 507, 94);
      ball(0, 790, 503, 98);
      ball(3, 1002, 525, 76);
      ctx.strokeStyle = p.effect;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(790, 503, 111, 0, Math.PI * 2);
      ctx.stroke();
      if (gameOver) {
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = p.overlay;
        ctx.fillRect(320, 28, 832, 574);
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        text(ctx, t("游戏结束"), 736, 274, 52, p.ink, 740, "bold");
        text(ctx, t("本局得分") + " 128", 736, 326, 30, p.soft, 740);
        panel(ctx, 596, 366, 280, 65, p.button, p.focus);
        text(ctx, t("再来一局"), 736, 409, 28, p.buttonText, 240);
        ctx.textAlign = "left";
      }
      ctx.restore();
    }
    return canvas;
  }
  window.gamePreview = { render };
})();
