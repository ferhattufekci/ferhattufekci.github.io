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
