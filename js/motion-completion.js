(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioMotionCompletion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function list(value) { return String(value || '').split(',').map(function (item) { return item.trim(); }); }
  function milliseconds(value) { return (parseFloat(value) || 0) * (/ms$/.test(value) ? 1 : 1000); }

  function duration(style, kind) {
    var names = list(kind === 'animation' ? style.animationName : style.transitionProperty);
    var times = list(style[kind + 'Duration']), delays = list(style[kind + 'Delay']);
    var iterations = list(style.animationIterationCount || '1');
    return names.reduce(function (longest, name, index) {
      if (!name || name === 'none') return longest;
      var count = kind === 'animation' ? parseFloat(iterations[index % iterations.length]) : 1;
      // An external infinite override must not permanently lock navigation.
      if (!isFinite(count)) count = 1;
      return Math.max(longest, milliseconds(times[index % times.length]) * count + milliseconds(delays[index % delays.length]), 0);
    }, 0);
  }

  function wait(elements, kind, environment) {
    var win = environment || root, cleanups = [], timer, frame, complete = false, resolve;
    var finished = new Promise(function (done) { resolve = done; });
    function finish() {
      if (complete) return;
      complete = true;
      win.clearTimeout(timer);
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      cleanups.forEach(function (cleanup) { cleanup(); });
      resolve();
    }
    var entries = elements.filter(Boolean).map(function (element) {
      var time = duration(win.getComputedStyle(element), kind);
      var animations = typeof element.getAnimations === 'function' ? element.getAnimations().filter(function (animation) {
        return animation.effect.target === element && (kind === 'animation' ? 'animationName' in animation : 'transitionProperty' in animation);
      }) : null;
      if (animations) {
        time = animations.reduce(function (longest, animation) {
          var remaining = animation.effect.getComputedTiming().endTime - (Number(animation.currentTime) || 0);
          return Math.max(longest, isFinite(remaining) ? remaining : time);
        }, 0);
      }
      return { element: element, time: time, animations: animations, done: time <= 0 };
    });
    function mark(entry) {
      entry.done = true;
      if (entries.every(function (item) { return item.done; })) finish();
    }
    entries.forEach(function (entry) {
      if (entry.done) return;
      var names = kind === 'animation' ? ['animationend', 'animationcancel', 'webkitAnimationEnd'] : ['transitionend', 'transitioncancel', 'webkitTransitionEnd'];
      function ended(event) {
        if (event.target !== entry.element) return;
        if (entry.animations ? entry.animations.every(function (animation) { return animation.playState === 'finished' || animation.playState === 'idle'; })
          : event.elapsedTime * 1000 >= entry.time) mark(entry);
      }
      names.forEach(function (name) { entry.element.addEventListener(name, ended); });
      cleanups.push(function () { names.forEach(function (name) { entry.element.removeEventListener(name, ended); }); });
      if (entry.animations) Promise.all(entry.animations.map(function (animation) {
        return animation.finished.catch(function () { /* CSS cancellation is a completion path. */ });
      })).then(function () { mark(entry); });
    });
    var budget = entries.reduce(function (longest, entry) { return Math.max(longest, entry.time); }, 0);
    if (budget === 0) finish();
    else timer = win.setTimeout(function () {
      // Complete on a paint boundary if events/promises were lost or rendering was interrupted.
      frame = win.requestAnimationFrame(finish);
    }, budget);
    return { finished: finished, cancel: finish };
  }

  return { duration: duration, wait: wait };
});
