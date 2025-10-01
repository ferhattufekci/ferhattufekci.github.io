/**
 * preloader.js — Scale-out loading indicator
 * Portfolio: ferhattufekci.github.io
 *
 * Matches the portfolio template's pulse-and-fade interaction while keeping
 * cache-navigation and stalled-resource safeguards.
 */
(function () {
  "use strict";

  var preloader = document.querySelector(".preloader");
  if (!preloader) {
    return;
  }

  var finished = false;
  var failSafe = window.setTimeout(finish, 12000);

  function finish() {
    if (finished) {
      return;
    }
    finished = true;
    window.clearTimeout(failSafe);
    preloader.setAttribute("aria-busy", "false");
    preloader.classList.add("is-loaded");
    window.setTimeout(function () {
      if (preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
      }
    }, 800);
  }

  window.addEventListener("load", finish, { once: true });
  window.addEventListener("pageshow", finish, { once: true });

  if (document.readyState === "complete") {
    finish();
  }
})();
