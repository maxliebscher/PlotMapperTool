(function themeModule(PM) {
  "use strict";

  function applyTheme(theme) {
    const next = PM.THEMES.includes(theme) ? theme : "deep";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("pmTheme", next);
    } catch (_error) {
      // localStorage may be unavailable for file URLs in hardened browser setups.
    }
  }

  function nextTheme(current) {
    const index = PM.THEMES.indexOf(current);
    return PM.THEMES[(index + 1) % PM.THEMES.length] || PM.THEMES[0];
  }

  function savedTheme() {
    try {
      return localStorage.getItem("pmTheme") || "";
    } catch (_error) {
      return "";
    }
  }

  PM.Theme = {
    applyTheme,
    nextTheme,
    savedTheme
  };
})(globalThis.PM);
