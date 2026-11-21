/* Sync timestamps and the Resume definition share one tooltip interaction. */
(function () {
  "use strict";

  var activeHost = null;
  var pinned = false;

  function hostFor(target) {
    return target instanceof Element ? target.closest("[data-tooltip-host]") : null;
  }

  function close() {
    if (!activeHost) return;
    activeHost.classList.remove("tip-visible", "tip-open", "tip-above");
    activeHost = null;
    pinned = false;
  }

  function show(host) {
    var tip = host.querySelector(".sync-badge-tip");
    if (!tip) return;
    if (activeHost !== host) close();
    activeHost = host;
    host.classList.add("tip-visible");
    host.style.removeProperty("--tip-offset");

    var anchor = host.getBoundingClientRect();
    var panel = host.closest(".pt-page");
    var top = panel ? Math.max(0, panel.getBoundingClientRect().top) : 0;
    var needed = tip.offsetHeight + 8;
    host.classList.toggle("tip-above", anchor.top - top >= needed);

    var box = tip.getBoundingClientRect();
    var inset = 8;
    var shift = Math.max(0, inset - box.left) -
      Math.max(0, box.right + inset - document.documentElement.clientWidth);
    if (shift) host.style.setProperty("--tip-offset", -shift + "px");
  }

  document.addEventListener("pointerover", function (event) {
    if (event.pointerType === "touch" || !window.matchMedia("(any-hover: hover)").matches) return;
    var host = hostFor(event.target);
    if (host && !host.contains(event.relatedTarget)) show(host);
  });
  document.addEventListener("pointerout", function (event) {
    var host = hostFor(event.target);
    if (!host || host !== activeHost || pinned || host.contains(event.relatedTarget)) return;
    if (!host.matches(":focus-visible") && !host.querySelector(":focus-visible")) close();
  });
  document.addEventListener("focusin", function (event) {
    var host = hostFor(event.target);
    if (host && event.target.matches(":focus-visible")) show(host);
  });
  document.addEventListener("focusout", function (event) {
    if (activeHost && activeHost.contains(event.target) && !activeHost.contains(event.relatedTarget)) close();
  });
  // A tap on noninteractive content need not synthesize a click on WebKit.
  document.addEventListener("pointerdown", function (event) {
    if (activeHost && !activeHost.contains(event.target)) close();
  }, true);
  document.addEventListener("click", function (event) {
    var host = hostFor(event.target);
    if (!host) return close();
    if (event.target.closest(".sync-badge-tip")) return;
    if (host === activeHost && pinned) return close();
    show(host);
    if (activeHost === host) {
      pinned = true;
      host.classList.add("tip-open");
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
  });
  window.addEventListener("hashchange", close);
  window.addEventListener("resize", close);
})();
