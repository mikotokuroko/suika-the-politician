(() => {
  "use strict";
  const defaults = {
    bg: "#a3231b",
    ink: "#f2cf4a",
    red: "#7a1812",
    soft: "#e8d58a",
    border: "#d7a55d",
    button: "#f2cf4a",
    buttonText: "#7a1812",
    boardTop: "#a92a21",
    boardBottom: "#8f1d17",
    ballBorder: "#ffffff",
    guide: "#f2cf4a",
    effect: "#f2cf4a",
    overlay: "#a3231b",
    focus: "#ffffff",
  };
  let current = { ...defaults };
  function set(values) {
    for (const key of Object.keys(defaults)) {
      if (/^#[a-f0-9]{6}$/i.test(values[key])) current[key] = values[key];
      document.documentElement.style.setProperty(`--${key}`, current[key]);
    }
    document.dispatchEvent(new Event("palettechange"));
  }
  window.gamePalette = { defaults, get: () => ({ ...current }), set };
})();
