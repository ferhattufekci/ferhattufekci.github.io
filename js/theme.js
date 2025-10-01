/**
 * theme.js — Dark / Light theme toggle
 * Portfolio: ferhattufekci.github.io
 *
 * Strategy:
 *  1. Inline FOWT-prevention script in <head> reads localStorage immediately.
 *  2. This module handles toggle interaction + OS preference on first visit.
 *  3. Theme applied via [data-theme="dark"] on <html>.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "ft-theme";
  var DARK = "dark";
  var LIGHT = "light";

  /* ── helpers ── */
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

    /* update all toggle buttons */
    var btns = document.querySelectorAll(".theme-toggle-btn");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var isDark = theme === DARK;
      btn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      btn.setAttribute("title", isDark ? "Light mode" : "Dark mode");
      /* swap icon text */
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

  /* ── initialise ── */
  function init() {
    var theme = getSaved() || getSystemPref();
    applyTheme(theme);

    /* attach click handlers to all toggle buttons */
    var btns = document.querySelectorAll(".theme-toggle-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", toggle);
    }

    /* listen for OS preference changes (live, no page reload) */
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

  /* run after DOM ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
