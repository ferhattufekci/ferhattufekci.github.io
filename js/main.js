/*
 * Template Name: Kerge - Resume / CV / vCard Template
 * Author: lmpixels
 * Author URL: http://themeforest.net/user/lmpixels
 * Version: 2.4
 */

(function ($) {
  "use strict";
  // Portfolio subpage filters
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
  // /Portfolio subpage filters

  // Contact form validator
  $(function () {
    $("#contact_form").validator();

    $("#contact_form").on("submit", function (e) {
      if (!e.isDefaultPrevented()) {
        var url = "contact_form/contact_form.php";

        $.ajax({
          type: "POST",
          url: url,
          data: $(this).serialize(),
          success: function (data) {
            var messageAlert = "alert-" + data.type;
            var messageText = data.message;

            var alertBox =
              '<div class="alert ' +
              messageAlert +
              ' alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>' +
              messageText +
              "</div>";
            if (messageAlert && messageText) {
              $("#contact_form").find(".messages").html(alertBox);
              $("#contact_form")[0].reset();
            }
          },
        });
        return false;
      }
    });
  });
  // /Contact form validator

  // Hide Mobile menu
  function mobileMenuHide() {
    var windowWidth = $(window).width(),
      siteHeader = $("#site_header");

    if (windowWidth < 992) {
      siteHeader.addClass("mobile-menu-hide");
      setTimeout(function () {
        siteHeader.addClass("animate");
      }, 500);
    } else {
      siteHeader.removeClass("animate");
    }
  }
  // /Hide Mobile menu

  //On Window load & Resize
  $(window)
    .on("load", function () {
      //Load
      // Animation on Page Loading
      $(".preloader").fadeOut(800, "linear");

      // initializing page transition.
      var ptPage = $(".subpages");
      if (ptPage[0]) {
        PageTransitions.init({
          menu: "ul.site-main-menu",
        });
      }
    })
    .on("resize", function () {
      //Resize
      mobileMenuHide();
    });

  // On Document Load
  $(document).on("ready", function () {
    // Initialize Portfolio grid
    var $portfolio_container = $(".portfolio-grid");
    $portfolio_container.imagesLoaded(function () {
      portfolio_init(this);
    });

    // Blog grid init
    var $container = $(".blog-masonry");
    $container.imagesLoaded(function () {
      $container.masonry();
    });

    // Mobile menu
    $(".menu-toggle").on("click", function () {
      $("#site_header").addClass("animate");
      $("#site_header").toggleClass("mobile-menu-hide");
    });

    // Mobile menu hide on main menu item click
    $(".site-main-menu").on("click", "a", function (e) {
      mobileMenuHide();
    });

    // Sidebar toggle
    $(".sidebar-toggle").on("click", function () {
      $("#blog-sidebar").toggleClass("open");
    });

    // Testimonials Slider
    $(".testimonials.owl-carousel").owlCarousel({
      nav: true, // Show next/prev buttons.
      items: 3, // The number of items you want to see on the screen.
      loop: false, // Infinity loop. Duplicate last and first items to get loop illusion.
      navText: false,
      margin: 25,
      responsive: {
        // breakpoint from 0 up
        0: { items: 1 },
        480: { items: 1 },
        768: { items: 2 },
        1200: { items: 2 },
      },
    });

    $(".clients.owl-carousel")
      .imagesLoaded()
      .owlCarousel({
        nav: true, // Show next/prev buttons.
        items: 2, // The number of items you want to see on the screen.
        loop: false, // Infinity loop. Duplicate last and first items to get loop illusion.
        navText: false,
        margin: 10,
        autoHeight: false,
        responsive: {
          0: { items: 2 },
          768: { items: 4 },
          1200: { items: 6 },
        },
      });

    // Text rotation
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

    // Lightbox init
    $("body").magnificPopup({
      delegate: "a.lightbox",
      type: "image",
      removalDelay: 300,
      mainClass: "mfp-fade",
      image: {
        titleSrc: "title",
        gallery: { enabled: true },
      },
      iframe: {
        markup:
          '<div class="mfp-iframe-scaler">' +
          '<div class="mfp-close"></div>' +
          '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>' +
          '<div class="mfp-title mfp-bottom-iframe-title"></div>' +
          "</div>",
        patterns: {
          youtube: { index: "youtube.com/", id: null, src: "%id%?autoplay=1" },
          vimeo: {
            index: "vimeo.com/",
            id: "/",
            src: "//player.vimeo.com/video/%id%?autoplay=1",
          },
          gmaps: { index: "//maps.google.", src: "%id%&output=embed" },
        },
        srcAction: "iframe_src",
      },
      callbacks: {
        markupParse: function (template, values, item) {
          values.title = item.el.attr("title");
        },
      },
    });

    $(".ajax-page-load-link").magnificPopup({
      type: "ajax",
      removalDelay: 300,
      mainClass: "mfp-fade",
      gallery: { enabled: true },
    });

    //Form Controls
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

    //Google Maps
    $("#map").googleMap({ zoom: 16 });
    $("#map").addMarker({
      address: "S601 Townsend Street, San Francisco, California, USA",
    });
  });
})(jQuery);

/* =========================================================
   ADSENSE – FINAL (AJAX/POPUP SAFE + MOBILE WIDTH-STABLE)
   - Works with MagnificPopup AJAX pages (#ajax-page content)
   - Prevents: No slot size for availableWidth=0
   - Initializes ads inserted later via AJAX
   ========================================================= */
(function () {
  const WAIT_ADSENSE_MS = 10000; // wait for window.adsbygoogle
  const WIDTH_POLL_MS = 250; // check width stability
  const WIDTH_STABLE_TICKS = 2; // stable width ticks before push
  const OBSERVE_TIMEOUT_MS = 20000; // stop observing one ad after

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

    // Must be in DOM
    if (!document.body.contains(ins)) return;

    // Width must be stable and >0 (fixes availableWidth=0)
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

        // Push once
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          ins.dataset.adsInit = "1";
        } catch (e) {
          // Retry once (script may still be initializing)
          setTimeout(() => {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              ins.dataset.adsInit = "1";
            } catch (_) {}
          }, 800);
        }

        // Observe for creative arrival (iframe may come late in AJAX)
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

        // Quick delayed check
        setTimeout(() => {
          if (hasCreative(ins)) markFilled(ins);
        }, 900);

        // Safety stop
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
    // MagnificPopup loads AJAX content later -> watch the DOM
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;

          // If the added node itself is an ins
          if (
            n.matches &&
            n.matches(".ads-resume-post-advertising.js-adsense ins.adsbygoogle")
          ) {
            initOneIns(n);
            continue;
          }

          // Or contains any ads blocks
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

    // Init existing ads
    scan(document);

    // Init ads added later via AJAX blog pages
    observeAjaxInsertedAds();

    // Re-scan after layout changes (mobile rotations, menu, transitions)
    window.addEventListener("load", () => scan(document));
    window.addEventListener("resize", () =>
      setTimeout(() => scan(document), 250),
    );
    document.addEventListener("visibilitychange", () =>
      setTimeout(() => scan(document), 250),
    );

    // If your template switches subpages via clicks/hash, this helps
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
