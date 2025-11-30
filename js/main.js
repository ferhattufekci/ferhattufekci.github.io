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

  $(function () {
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

    // Rotating profile titles. Owl Carousel's fade mode positioned the
    // outgoing slide with a pixel offset that went stale when the mobile
    // viewport resized, so neighbouring titles overlapped or peeked in.
    // Crossfading stacked items (see .text-rotation in main.css) avoids that.
    $(".text-rotation").each(function () {
      var root = this;
      var items = $(root).children(".item").get();
      var reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var index = 0;

      function show(next) {
        items.forEach(function (item, i) {
          var active = i === next;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-hidden", active ? "false" : "true");
        });
        index = next;
      }

      show(0);
      root.classList.add("is-ready");
      if (items.length < 2 || reduceMotion) return;

      window.setInterval(function () {
        if (document.hidden) return;
        show((index + 1) % items.length);
      }, 1500);
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
