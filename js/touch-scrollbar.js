/* Touch scrollbar: the desktop scrollbar design, drawn for phones and tablets.
 *
 * Desktop browsers render the ::-webkit-scrollbar rules in main.css and
 * dark-theme.css: a 5px bar with a --color-scrollbar-thumb thumb, a slategrey
 * outline and a --color-surface track. On touch devices the native indicator
 * is unreliable: Android Chrome shows an overlay only during a swipe, and an
 * iPhone in-app browser rendered the styled rules as a space-taking bar whose
 * light thumb was invisible and whose gutter later disappeared, reflowing the
 * page. Colour rules alone cannot fix that.
 *
 * On a coarse pointer (the same media query that dark-theme.css uses to hide
 * the native scrollbar before the first paint) this script draws one element
 * in that design, with the same colour tokens, beside the active scroll owner. It does not measure or depend
 * on the native scrollbar, so starting it never changes the layout. It is decorative
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

  // A page slides in on the first load and on every page switch (css pt-page-move*
  // animations, about 300 ms). Its box is then somewhere across the screen, and during a
  // switch two pages are current at once, so a bar measured then was drawn in the middle
  // of the screen and jumped along with the slide. No bar is drawn while a current page
  // is still animating; animationend redraws it once the page has settled.
  function animating(page) {
    if (typeof page.getAnimations === "function") {
      return page.getAnimations().some(function (animation) {
        return animation.playState === "running" || animation.playState === "pending";
      });
    }
    var name = getComputedStyle(page).animationName;
    return !!name && name !== "none";
  }

  function pageInMotion() {
    var pages = document.querySelectorAll(".pt-page-current");
    for (var i = 0; i < pages.length; i++) if (animating(pages[i])) return true;
    return false;
  }

  function render() {
    frame = 0;
    if (pageInMotion()) {
      bar.hidden = true;
      return;
    }
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
    // Measure the panel and the visual viewport in document coordinates. Fixed
    // layers can move independently of the panel during an iOS pinch or pan.
    var viewport = window.visualViewport;
    var scale = viewport ? viewport.scale : 1;
    var viewTop = viewport ? viewport.pageTop : window.scrollY || 0;
    var viewLeft = viewport ? viewport.pageLeft : window.scrollX || 0;
    var viewBottom = viewTop + (viewport ? viewport.height : window.innerHeight);
    var viewRight = viewLeft + (viewport ? viewport.width : root.clientWidth);
    var origin = root.getBoundingClientRect();
    var isDocument = owner === document.scrollingElement;
    var rect = isDocument ? origin : owner.getBoundingClientRect();
    var panelTop = isDocument ? 0 : rect.top - origin.top;
    var top = Math.max(viewTop, panelTop);
    var bottom = Math.min(viewBottom, isDocument ? owner.scrollHeight : rect.bottom - origin.top);
    var right = Math.min(viewRight, isDocument ? root.clientWidth : rect.right - origin.left);
    var left = Math.max(viewLeft, isDocument ? 0 : rect.left - origin.left);
    var height = bottom - top;
    if (height <= 0 || right <= left) {
      bar.hidden = true;
      return;
    }
    var range = owner.scrollHeight - height;
    var position = isDocument ? top : owner.scrollTop + top - panelTop;
    var thumbHeight = Math.min(height, Math.max(24 / scale, height * height / owner.scrollHeight));
    var offset = range > 0 ? Math.round((height - thumbHeight) * position / range) : 0;
    var body = document.body.getBoundingClientRect();
    bar.style.setProperty("--touch-scrollbar-scale", scale);
    bar.style.top = top + origin.top - body.top + "px";
    bar.style.right = body.right - origin.left - right + "px";
    bar.style.height = height + "px";
    bar.hidden = false;
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
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule, { passive: true });
      window.visualViewport.addEventListener("scroll", schedule, { passive: true });
    }
    window.addEventListener("hashchange", reset);
    // Page switches move .pt-page-current and slide the pages; follow the new owner.
    document.addEventListener("animationend", reset, true);
    document.addEventListener("animationcancel", reset, true);
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
    if (coarsePointer()) start();
  }

  window.touchScrollbar = { start: start, update: reset };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
