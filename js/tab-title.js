// /js/tab-title.js
(() => {
  "use strict";

  /**
   * Personal site-friendly tab UX:
   * - Language-aware (TR -> Turkish, else English)
   * - Subtle animation + message rotation when tab is hidden
   * - Restores original title when focused
   * - Optional favicon swap (off by default)
   */

  const CONFIG = {
    // Title update interval while away (ms)
    tickMs: 900,

    // Optional: swap favicon while away (keep OFF for job-search professionalism)
    favicon: {
      enabled: false,
      // Provide absolute or relative paths if enabled:
      awayHref: "images/favicon-sad.png", // e.g. "images/favicon-sad.png"
    },
  };

  // Future-proof i18n map (add more languages later)
  const I18N = {
    tr: {
      frames: ["😶  Bir yere mi gittin?", "😔  Geri gel...", "👋  Buradayım."],
    },
    en: {
      frames: ["😶  Stepped away?", "😔  Come back...", "👋  I’m here."],
    },
  };

  const DEFAULT_LANG = "en";

  const resolveLanguage = () => {
    const lang = (navigator.language || navigator.userLanguage || DEFAULT_LANG)
      .toLowerCase()
      .slice(0, 2);
    return I18N[lang] ? lang : DEFAULT_LANG;
  };

  const getFaviconLink = () =>
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');

  const originalTitle = document.title;
  const lang = resolveLanguage();
  const frames = I18N[lang].frames;

  let timerId = null;
  let frameIndex = 0;

  const originalFaviconHref = (() => {
    const link = getFaviconLink();
    return link ? link.getAttribute("href") : null;
  })();

  const setFavicon = (href) => {
    if (!href) return;

    let link = getFaviconLink();
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  };

  const stopAnimation = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    frameIndex = 0;
  };

  const startAnimation = () => {
    if (timerId) return; // already running

    // Immediately set a frame for instant feedback
    document.title = frames[frameIndex % frames.length];
    frameIndex += 1;

    timerId = setInterval(() => {
      document.title = frames[frameIndex % frames.length];
      frameIndex += 1;
    }, CONFIG.tickMs);
  };

  const onAway = () => {
    startAnimation();

    if (CONFIG.favicon.enabled && CONFIG.favicon.awayHref) {
      setFavicon(CONFIG.favicon.awayHref);
    }
  };

  const onBack = () => {
    stopAnimation();
    document.title = originalTitle;

    if (CONFIG.favicon.enabled && originalFaviconHref) {
      setFavicon(originalFaviconHref);
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) onAway();
    else onBack();
  });

  // Safety: if page loads hidden (rare), keep state consistent
  if (document.hidden) onAway();
})();
