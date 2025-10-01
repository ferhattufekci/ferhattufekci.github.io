/* The inline head script applies the saved theme before paint; this module handles user and OS changes. */
(function () {
  "use strict";

  var STORAGE_KEY = "ft-theme";
  var DARK = "dark";
  var LIGHT = "light";

  function getSystemPref() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? DARK
      : LIGHT;
  }

  function getSaved() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    var btns = document.querySelectorAll(".theme-toggle-btn");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var isDark = theme === DARK;
      btn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      btn.setAttribute("title", isDark ? "Light mode" : "Dark mode");
      var icon = btn.querySelector(".theme-toggle-icon");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    }
  }

  function toggle() {
    var current = document.documentElement.getAttribute("data-theme") || LIGHT;
    var next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
    save(next);
  }

  function init() {
    var theme = getSaved() || getSystemPref();
    applyTheme(theme);

    var btns = document.querySelectorAll(".theme-toggle-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", toggle);
    }

    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", function (e) {
          if (!getSaved()) {
            applyTheme(e.matches ? DARK : LIGHT);
          }
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
