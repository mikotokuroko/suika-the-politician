const TRANSLATIONS = {
  实时预览: { en: "Live preview", fr: "Aperçu en direct" },
  预览画面: { en: "Preview screen", fr: "Écran à prévisualiser" },
  主题选择: { en: "Theme selection", fr: "Choix du thème" },
  主题与游戏配色预览: {
    en: "Theme selection and game color preview",
    fr: "Aperçu des thèmes et des couleurs du jeu",
  },
  预览结束画面: { en: "Preview game over", fr: "Aperçu de fin de partie" },
  "添加照片或选择一个默认主题以查看预览。": {
    en: "Add photos or select a built-in theme to preview.",
    fr: "Ajoutez des photos ou choisissez un thème pour le prévisualiser.",
  },
  "预览图片加载失败，请重试。": {
    en: "Preview images could not load. Please retry.",
    fr: "Impossible de charger les images de l’aperçu. Réessayez.",
  },
  复制分享链接: { en: "Copy share link", fr: "Copier le lien de partage" },
  "分享将在 14 天后自动删除，包括上传的照片。": {
    en: "Shared games and uploaded photos are automatically deleted after 14 days.",
    fr: "Les jeux partagés et les photos envoyées sont automatiquement supprimés après 14 jours.",
  },
  "到期时间：{date}。届时游戏及照片将自动删除。": {
    en: "Expires: {date}. The game and photos will be deleted automatically.",
    fr: "Expiration : {date}. Le jeu et les photos seront supprimés automatiquement.",
  },
  "分享已过期、已删除、不存在或尚未同步。新链接请稍后重试。": {
    en: "This share has expired, was deleted, is missing, or is still syncing. For a new link, retry shortly.",
    fr: "Ce partage a expiré, a été supprimé, est introuvable ou est en cours de synchronisation. Pour un nouveau lien, réessayez bientôt.",
  },
  "每个等级对应一张照片。点击保存分享才会上传裁剪后的照片，拥有链接的人都可以查看。":
    {
      en: "One photo per level. Cropped photos are uploaded only when you save and share. Anyone with the link can view them.",
      fr: "Une photo par niveau. Les photos recadrées sont envoyées uniquement lors du partage. Toute personne disposant du lien peut les voir.",
    },
  制作自己的游戏: { en: "Create your own game", fr: "Créer votre jeu" },
  删除此分享: { en: "Delete this shared game", fr: "Supprimer ce jeu partagé" },
  游戏名称: { en: "Game name", fr: "Nom du jeu" },
  分享中包含的默认主题: {
    en: "Default themes to include",
    fr: "Thèmes intégrés à inclure",
  },
  "全部取消勾选，朋友将只看到你的照片主题。": {
    en: "Uncheck all to share only your photo theme.",
    fr: "Décochez tout pour partager uniquement votre thème photo.",
  },
  游戏配色: { en: "Game colors", fr: "Couleurs du jeu" },
  "颜色会立即应用，游戏预览也会使用这些颜色。": {
    en: "Colors update immediately and carry into your game preview.",
    fr: "Les couleurs sont appliquées immédiatement, y compris dans l’aperçu du jeu.",
  },
  恢复默认配色: { en: "Reset colors", fr: "Réinitialiser les couleurs" },
  保存并分享: { en: "Save and share", fr: "Enregistrer et partager" },
  发送给朋友: { en: "Send to friends", fr: "Envoyer aux amis" },
  复制链接: { en: "Copy link", fr: "Copier le lien" },
  "私人删除链接（请保存，不要分享）": {
    en: "Private delete link (keep it; do not share)",
    fr: "Lien privé de suppression (à conserver, ne pas partager)",
  },
  复制删除链接: { en: "Copy delete link", fr: "Copier le lien de suppression" },
  "链接保存的是当前版本。修改后再次分享会生成新的链接。": {
    en: "This link preserves the saved version. Sharing after edits creates a new link.",
    fr: "Ce lien conserve la version enregistrée. Un nouveau partage après modification crée un autre lien.",
  },
  自定义照片: { en: "Custom photos", fr: "Photos personnalisées" },
  我的合成游戏: { en: "My merge game", fr: "Mon jeu de fusion" },
  页面背景: { en: "Page background", fr: "Fond de page" },
  主要文字: { en: "Main text", fr: "Texte principal" },
  面板背景: { en: "Panel background", fr: "Fond des panneaux" },
  次要文字: { en: "Secondary text", fr: "Texte secondaire" },
  边框: { en: "Borders", fr: "Bordures" },
  主要按钮: { en: "Primary buttons", fr: "Boutons principaux" },
  按钮文字: { en: "Button text", fr: "Texte des boutons" },
  游戏背景顶部: { en: "Board top", fr: "Haut du plateau" },
  游戏背景底部: { en: "Board bottom", fr: "Bas du plateau" },
  照片圆框: { en: "Photo outlines", fr: "Contour des photos" },
  投放与警戒线: {
    en: "Aim and limit lines",
    fr: "Lignes de visée et de limite",
  },
  合成效果: { en: "Merge effects", fr: "Effets de fusion" },
  结束画面背景: { en: "Game-over background", fr: "Fond de fin de partie" },
  焦点高亮: { en: "Focus highlight", fr: "Indicateur de sélection" },
  "分享不存在、已删除或尚未同步。新链接请稍后重试。": {
    en: "This share is missing, deleted, or still syncing. For a new link, retry shortly.",
    fr: "Ce partage est introuvable, supprimé ou en cours de synchronisation. Réessayez bientôt.",
  },
  "保存过于频繁，请一分钟后重试。": {
    en: "Too many saves. Try again in a minute.",
    fr: "Trop de sauvegardes. Réessayez dans une minute.",
  },
  "图片总大小超出限制，请减少照片后重试。": {
    en: "The photos exceed the size limit. Remove some photos and retry.",
    fr: "Les photos dépassent la taille maximale. Supprimez-en et réessayez.",
  },
  "暂时无法连接分享服务。请稍后重试，你的照片仍在此页面。": {
    en: "Sharing is temporarily unavailable. Retry shortly; your photos are still on this page.",
    fr: "Le partage est temporairement indisponible. Réessayez bientôt ; vos photos sont toujours sur cette page.",
  },
  "正在保存分享…": {
    en: "Saving your shared game…",
    fr: "Enregistrement du jeu partagé…",
  },
  "分享已保存。新链接可能需要约一分钟才能在其他地区打开。": {
    en: "Saved. New links may take about a minute to become available in other regions.",
    fr: "Enregistré. Le lien peut prendre environ une minute avant de fonctionner dans les autres régions.",
  },
  "链接已复制。": { en: "Link copied.", fr: "Lien copié." },
  "请选择并复制链接。": {
    en: "Select and copy the link.",
    fr: "Sélectionnez et copiez le lien.",
  },
  "分享服务尚未配置，可先在本地预览。": {
    en: "Sharing is not configured yet. You can preview locally.",
    fr: "Le partage n’est pas encore configuré. Vous pouvez prévisualiser en local.",
  },
  "正在加载分享…": {
    en: "Loading shared game…",
    fr: "Chargement du jeu partagé…",
  },
  重试: { en: "Retry", fr: "Réessayer" },
  "确定删除此分享？朋友将无法再打开它。": {
    en: "Delete this shared game? Friends will no longer be able to open it.",
    fr: "Supprimer ce jeu partagé ? Vos amis ne pourront plus l’ouvrir.",
  },
  "分享已删除。其他地区的缓存可能需要约一分钟更新。": {
    en: "Deleted. Cached copies in other regions may take about a minute to update.",
    fr: "Supprimé. Les copies en cache dans les autres régions peuvent prendre environ une minute à se mettre à jour.",
  },
  "点击任意图片调整裁剪。修改仅保存在此浏览器。": {
    en: "Click any image to adjust its crop. Changes are saved only in this browser.",
    fr: "Cliquez sur une image pour la recadrer. Les modifications sont enregistrées uniquement dans ce navigateur.",
  },
  "裁剪已保存到此浏览器。": {
    en: "Crop saved in this browser.",
    fr: "Cadrage enregistré dans ce navigateur.",
  },
  "裁剪已应用，但无法保存到浏览器。刷新后将恢复默认。": {
    en: "Crop applied, but browser storage is unavailable. Reloading will restore the default.",
    fr: "Cadrage appliqué, mais le stockage est indisponible. Le cadrage par défaut sera rétabli au rechargement.",
  },

  选择照片: { en: "Choose photos", fr: "Choisir des photos" },
  "最多 15 张 · 自动圆形裁剪": {
    en: "Up to 15 · Automatic circular crops",
    fr: "15 maximum · Cadrage circulaire automatique",
  },
  返回主题: { en: "Back to themes", fr: "Retour aux thèmes" },
  等级预览: { en: "Level preview", fr: "Aperçu des niveaux" },
  "从小到大，查看每个合成等级。": {
    en: "Preview each level of the theme.",
    fr: "Prévisualisez chaque niveau du thème.",
  },
  开始游戏: { en: "Play", fr: "Jouer" },

  合成大迈乎: {
    en: "Suika the Politician",
    fr: "Suika le Politicien",
  },
  选择你的合成主题: {
    en: "Choose your theme",
    fr: "Choisissez votre thème",
  },
  "＋ 自定义照片主题": {
    en: "＋ Create a photo theme",
    fr: "＋ Créer un thème photo",
  },
  制作你的主题: {
    en: "Create your theme",
    fr: "Créez votre thème",
  },
  "每个等级对应一张照片，按从小到大排列。照片仅在本浏览器中处理，本次打开期间保留。":
    {
      en: "Use one photo per level, ordered smallest to largest. Photos stay in this browser for this session.",
      fr: "Une photo par niveau, du plus petit au plus grand. Les photos restent dans ce navigateur pendant cette session.",
    },
  "等级数量（2–15）": {
    en: "Number of levels (2–15)",
    fr: "Nombre de niveaux (2–15)",
  },
  "添加照片（最多 15 张）": {
    en: "Add photos (up to 15)",
    fr: "Ajouter des photos (15 maximum)",
  },
  使用这个主题开始: {
    en: "Play with this theme",
    fr: "Jouer avec ce thème",
  },
  调整圆形裁剪: {
    en: "Adjust circular crop",
    fr: "Ajuster le cadrage circulaire",
  },
  圆形裁剪预览: {
    en: "Circular crop preview",
    fr: "Aperçu du cadrage circulaire",
  },
  缩放: {
    en: "Zoom",
    fr: "Zoom",
  },
  水平位置: {
    en: "Horizontal position",
    fr: "Position horizontale",
  },
  垂直位置: {
    en: "Vertical position",
    fr: "Position verticale",
  },
  取消: {
    en: "Cancel",
    fr: "Annuler",
  },
  保存裁剪: {
    en: "Save crop",
    fr: "Enregistrer le cadrage",
  },
  主题: {
    en: "Themes",
    fr: "Thèmes",
  },
  分数: {
    en: "Score",
    fr: "Score",
  },
  最高分: {
    en: "Best",
    fr: "Record",
  },
  音效: {
    en: "Sound effects",
    fr: "Effets sonores",
  },
  重来: {
    en: "Restart",
    fr: "Rejouer",
  },
  游戏区域: {
    en: "Game area",
    fr: "Zone de jeu",
  },
  "使用左右方向键移动，空格或向下方向键投放。": {
    en: "Aim with Left/Right. Drop with Space or Down.",
    fr: "Visez avec les flèches gauche/droite. Lâchez avec Espace ou la flèche bas.",
  },
  游戏结束: {
    en: "Game over",
    fr: "Partie terminée",
  },
  本局得分: {
    en: "Your score",
    fr: "Votre score",
  },
  再来一局: {
    en: "Play again",
    fr: "Rejouer",
  },
  语言: {
    en: "Language",
    fr: "Langue",
  },
  "已添加 {count} / {levels} 张照片。每个等级需要一张照片。": {
    en: "{count} / {levels} photos added. One photo is required per level.",
    fr: "{count} / {levels} photos ajoutées. Une photo est requise par niveau.",
  },
  "请输入 2 到 15 之间的整数等级数量。": {
    en: "Enter a whole number of levels from 2 to 15.",
    fr: "Saisissez un nombre entier de niveaux entre 2 et 15.",
  },
  "等级 {n}": {
    en: "Level {n}",
    fr: "Niveau {n}",
  },
  裁剪: {
    en: "Crop",
    fr: "Cadrer",
  },
  "重新裁剪等级 {n}": {
    en: "Recrop level {n}",
    fr: "Recadrer le niveau {n}",
  },
  "将等级 {n} 前移": {
    en: "Move level {n} earlier",
    fr: "Avancer le niveau {n}",
  },
  "将等级 {n} 后移": {
    en: "Move level {n} later",
    fr: "Reculer le niveau {n}",
  },
  删除: {
    en: "Remove",
    fr: "Supprimer",
  },
  "删除等级 {n}": {
    en: "Remove level {n}",
    fr: "Supprimer le niveau {n}",
  },
  "{count} 个等级 · 预览": {
    en: "{count} levels · Preview",
    fr: "{count} niveaux · Aperçu",
  },
  "正在加载主题…": {
    en: "Loading theme…",
    fr: "Chargement du thème…",
  },
  "主题图片加载失败，请重试。": {
    en: "Theme images could not load. Please retry.",
    fr: "Impossible de charger les images. Réessayez.",
  },
  "最多允许 15 张照片。请减少选择或删除已有照片。": {
    en: "Maximum 15 photos. Select fewer or remove existing photos.",
    fr: "15 photos maximum. Sélectionnez moins de photos ou supprimez-en.",
  },
  "无法读取：{files}。请使用 PNG、JPEG 或 WebP。": {
    en: "Could not read: {files}. Use PNG, JPEG or WebP.",
    fr: "Lecture impossible : {files}. Utilisez PNG, JPEG ou WebP.",
  },
  迈乎: {
    en: "Mywho",
    fr: "Mywho",
  },
  姆巴佩: {
    en: "Mbappé",
    fr: "Mbappé",
  },
  马克龙: {
    en: "Macron",
    fr: "Macron",
  },
  该内容在你所在的地区不可用: {
    en: "This content is unavailable in your region",
    fr: "Ce contenu est indisponible dans votre région",
  },
};
(() => {
  const supportedLanguages = ["zh", "en", "fr"];
  const preferredLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || "en"];
  let language =
    preferredLanguages
      .map((locale) => locale.toLowerCase().split(/[-_]/)[0])
      .find((locale) => supportedLanguages.includes(locale)) || "en";
  try {
    const saved = localStorage.getItem("mywho_language");
    if (supportedLanguages.includes(saved)) language = saved;
  } catch {}
  function t(key, values = {}) {
    const text = language === "zh" ? key : TRANSLATIONS[key]?.[language] || key;
    return text.replace(/\{(\w+)\}/g, (_, name) =>
      String(values[name] ?? `{${name}}`),
    );
  }
  function apply() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    document.title = t("合成大迈乎");
    document
      .querySelectorAll("[data-i18n]")
      .forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document
      .querySelectorAll("[data-i18n-label]")
      .forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
    document
      .querySelectorAll(".language-select")
      .forEach((el) => (el.value = language));
  }
  window.i18n = { t, apply };
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.querySelectorAll(".language-select").forEach((el) =>
      el.addEventListener("change", () => {
        language = el.value;
        try {
          localStorage.setItem("mywho_language", language);
        } catch {}
        apply();
        document.dispatchEvent(new Event("languagechange"));
      }),
    );
  });
})();
