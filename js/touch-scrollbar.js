/* Touch scrollbar: the desktop scrollbar design, drawn for phones and tablets.
 *
 * Desktop browsers render the ::-webkit-scrollbar rules in main.css and
 * dark-theme.css: a 5px bar with a --color-scrollbar-thumb thumb, a slategrey
 * outline and a --color-surface track. Mobile browsers use overlay scrollbars
 * instead (iOS WebKit, Android Chrome) and ignore those rules, so the native
 * indicator shows only during a swipe and, in the light theme, is barely
 * visible against the white page. Colour rules alone cannot fix that.
 *
 * Where the browser draws no classic scrollbar (zero gutter) on a coarse
 * pointer, this script hides the native indicator and draws one element in the
 * same design beside the active scroll owner. It is decorative
 * (aria-hidden, pointer-events: none): scrolling stays native, so touch,
 * keyboard and assistive technology behave exactly as before.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var bar = null;
  var thumb = null;
  var owner = null;
  var frame = 0;
  var watcher = null;
  var watched = null;

  function coarsePointer() {
    return !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }

  // A styled probe reports a 5px gutter wherever ::-webkit-scrollbar renders,
  // and 0 where the browser only draws overlay scrollbars.
  function overlayScrollbars() {
    var probe = document.createElement("div");
    probe.className = "touch-scrollbar-probe";
    document.body.appendChild(probe);
    var gutter = probe.offsetWidth - probe.clientWidth;
    probe.parentNode.removeChild(probe);
    return gutter === 0;
  }

  function scrolls(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el === document.scrollingElement) return el.scrollHeight > window.innerHeight + 1;
    return /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1;
  }

  // The scroll owner differs by page: .pt-page on About Me, an inner
  // .page-content-panel on Resume, Projects and Blog, the document elsewhere.
  function findOwner() {
    var current = document.querySelector(".pt-page-current");
    var candidates = current
      ? [current].concat(Array.prototype.slice.call(current.querySelectorAll(".page-content-panel, .single-page-content")))
      : [];
    candidates.push(document.scrollingElement);
    for (var i = 0; i < candidates.length; i++) if (scrolls(candidates[i])) return candidates[i];
    return null;
  }

  function render() {
    frame = 0;
    owner = findOwner();
    // The owner's box moves when the header or viewport changes height; follow it.
    if (watcher && owner !== watched) {
      if (watched) watcher.unobserve(watched);
      if (owner) watcher.observe(owner);
      watched = owner;
    }
    if (!owner) {
      bar.hidden = true;
      return;
    }
    var isDocument = owner === document.scrollingElement;
    var rect = isDocument
      ? { top: 0, bottom: window.innerHeight, right: root.clientWidth }
      : owner.getBoundingClientRect();
    var top = Math.max(rect.top, 0);
    var height = Math.min(rect.bottom, window.innerHeight) - top;
    var viewHeight = isDocument ? window.innerHeight : owner.clientHeight;
    var range = owner.scrollHeight - viewHeight;
    if (height <= 0 || range <= 0) {
      bar.hidden = true;
      return;
    }
    var thumbHeight = Math.max(Math.round((height * viewHeight) / owner.scrollHeight), 24);
    var offset = Math.round(((height - thumbHeight) * owner.scrollTop) / range);
    bar.hidden = false;
    bar.style.top = top + "px";
    bar.style.height = height + "px";
    bar.style.left = rect.right - bar.offsetWidth + "px";
    thumb.style.height = thumbHeight + "px";
    thumb.style.transform = "translateY(" + Math.min(Math.max(offset, 0), height - thumbHeight) + "px)";
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(render);
  }

  // Scroll events do not bubble; capture them all and redraw for vertical scrollers only.
  function onScroll(event) {
    var target = event.target === document ? document.scrollingElement : event.target;
    if (target === owner || scrolls(target)) schedule();
  }

  function reset() {
    if (frame) window.cancelAnimationFrame(frame);
    render();
  }

  function start() {
    if (bar) return;
    bar = document.createElement("div");
    bar.className = "touch-scrollbar";
    bar.setAttribute("aria-hidden", "true");
    bar.hidden = true;
    thumb = document.createElement("div");
    thumb.className = "touch-scrollbar-thumb";
    bar.appendChild(thumb);
    document.body.appendChild(bar);
    root.classList.add("has-touch-scrollbar");

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", reset, { passive: true });
    window.addEventListener("hashchange", reset);
    // Page switches move .pt-page-current and slide the pages; follow the new owner.
    document.addEventListener("animationend", reset, true);
    document.addEventListener("transitionend", schedule, true);
    // Blog and Projects fill their panels after load; keep the thumb size current.
    if (window.ResizeObserver) {
      watcher = new ResizeObserver(schedule);
      watcher.observe(document.body);
    }
    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
    window.addEventListener("load", reset);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset);
    reset();
  }

  function init() {
    if (coarsePointer() && overlayScrollbars()) start();
  }

  window.touchScrollbar = { start: start, update: reset };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
