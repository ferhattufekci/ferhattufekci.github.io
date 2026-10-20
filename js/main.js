(function ($) {
  "use strict";
  function portfolio_init() {
    var portfolio_grid = $(".portfolio-grid"),
      portfolio_filter = $(".portfolio-filters");

    if (portfolio_grid) {
      portfolio_grid.shuffle({
        speed: 450,
        itemSelector: "figure",
      });

      portfolio_filter.on("click", ".filter", function (e) {
        portfolio_grid.shuffle("update");
        e.preventDefault();
        $(".portfolio-filters .filter").parent().removeClass("active");
        $(this).parent().addClass("active");
        portfolio_grid.shuffle("shuffle", $(this).attr("data-group"));
      });
    }
  }

  $(window)
    .on("load", function () {
      var ptPage = $(".subpages");
      if (ptPage[0]) {
        PageTransitions.init({
          menu: "ul.site-main-menu",
        });
      }
    });

  $(document).on("ready", function () {
    var $portfolio_container = $(".portfolio-grid");
    $portfolio_container.imagesLoaded(function () {
      portfolio_init(this);
    });

    $(".sidebar-toggle").on("click", function () {
      $("#blog-sidebar").toggleClass("open");
    });

    $(".testimonials.owl-carousel").owlCarousel({
      nav: true,  
      items: 3,  
      loop: false,  
      navText: false,
      margin: 25,
      responsive: {
        0: { items: 1 },
        480: { items: 1 },
        768: { items: 2 },
        1200: { items: 2 },
      },
    });

    $(".clients.owl-carousel")
      .imagesLoaded()
      .owlCarousel({
        nav: true,  
        items: 2,  
        loop: false,  
        navText: false,
        margin: 10,
        autoHeight: false,
        responsive: {
          0: { items: 2 },
          768: { items: 4 },
          1200: { items: 6 },
        },
      });

    $(".text-rotation").owlCarousel({
      loop: true,
      dots: false,
      nav: false,
      margin: 0,
      items: 1,
      autoplay: true,
      autoplayHoverPause: false,
      autoplayTimeout: 1500,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
    });

    $(".form-control")
      .val("")
      .on("focusin", function () {
        $(this).parent(".form-group").addClass("form-group-focus");
      })
      .on("focusout", function () {
        if ($(this).val().length === 0) {
          $(this).parent(".form-group").removeClass("form-group-focus");
        }
      });

  });
})(jQuery);

(function () {
  const WAIT_ADSENSE_MS = 10000;  
  const WIDTH_POLL_MS = 250;  
  const WIDTH_STABLE_TICKS = 2;  
  const OBSERVE_TIMEOUT_MS = 20000;  

  function now() {
    return Date.now();
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  }

  function getWidth(el) {
    const rect = el.getBoundingClientRect();
    return Math.floor(rect.width || 0);
  }

  function hasCreative(ins) {
    return !!(
      ins.querySelector("iframe") ||
      ins.querySelector("img") ||
      ins.childElementCount > 0
    );
  }

  function markFilled(ins) {
    const container = ins.closest(".ads-resume-post-advertising");
    if (container) container.classList.add("is-filled");
  }

  function waitForAdsenseReady() {
    return new Promise((resolve) => {
      const start = now();
      const t = setInterval(() => {
        if (window.adsbygoogle) {
          clearInterval(t);
          resolve(true);
          return;
        }
        if (now() - start > WAIT_ADSENSE_MS) {
          clearInterval(t);
          resolve(false);
        }
      }, 200);
    });
  }

  function initOneIns(ins) {
    if (!ins || ins.dataset.adsInit === "1") return;

    if (!document.body.contains(ins)) return;

    // Wait for stable, nonzero width to avoid AdSense availableWidth=0 errors.
    let lastW = -1;
    let stable = 0;
    const start = now();

    const widthTimer = setInterval(() => {
      if (now() - start > OBSERVE_TIMEOUT_MS) {
        clearInterval(widthTimer);
        return;
      }

      if (!isVisible(ins)) return;

      const w = getWidth(ins);
      if (w <= 0) return;

      if (w === lastW) stable += 1;
      else stable = 0;

      lastW = w;

      if (stable >= WIDTH_STABLE_TICKS) {
        clearInterval(widthTimer);

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          ins.dataset.adsInit = "1";
        } catch (e) {
          // Retry once because the ad script may still be initializing.
          setTimeout(() => {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              ins.dataset.adsInit = "1";
            } catch (_) {}
          }, 800);
        }

        // An ad creative can arrive after the initial slot is inserted.
        const obs = new MutationObserver(() => {
          if (hasCreative(ins)) {
            markFilled(ins);
            obs.disconnect();
          }
          if (ins.getAttribute("data-ad-status") === "unfilled") {
            obs.disconnect();
          }
        });

        obs.observe(ins, { attributes: true, childList: true, subtree: true });

        setTimeout(() => {
          if (hasCreative(ins)) markFilled(ins);
        }, 900);

        setTimeout(() => obs.disconnect(), OBSERVE_TIMEOUT_MS);
      }
    }, WIDTH_POLL_MS);
  }

  function scan(root) {
    const scope = root || document;
    const list = scope.querySelectorAll(
      ".ads-resume-post-advertising.js-adsense ins.adsbygoogle",
    );
    list.forEach(initOneIns);
  }

  function observeAjaxInsertedAds() {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;

          if (
            n.matches &&
            n.matches(".ads-resume-post-advertising.js-adsense ins.adsbygoogle")
          ) {
            initOneIns(n);
            continue;
          }

          if (n.querySelector) {
            const insList = n.querySelectorAll(
              ".ads-resume-post-advertising.js-adsense ins.adsbygoogle",
            );
            insList.forEach(initOneIns);
          }
        }
      }
    });

    mo.observe(document.body, { childList: true, subtree: true });
  }

  async function boot() {
    const ok = await waitForAdsenseReady();
    if (!ok) return;

    scan(document);

    observeAjaxInsertedAds();

    // Layout changes can make previously hidden ad slots measurable.
    window.addEventListener("load", () => scan(document));
    window.addEventListener("resize", () =>
      setTimeout(() => scan(document), 250),
    );
    document.addEventListener("visibilitychange", () =>
      setTimeout(() => scan(document), 250),
    );

    document.addEventListener("click", () =>
      setTimeout(() => scan(document), 500),
    );
    window.addEventListener("hashchange", () =>
      setTimeout(() => scan(document), 500),
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
