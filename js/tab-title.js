(() => {
  "use strict";


  const CONFIG = {
    tickMs: 900,

    favicon: {
      enabled: false,
      awayHref: "images/favicon-sad.png",  
    },
  };

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
    if (timerId) return;  

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

  if (document.hidden) onAway();
})();
