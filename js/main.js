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
