var PageTransitions = (function ($) {
"use strict";
    var sectionsContainer = $(".subpages"),
        isAnimating = false,
        pendingRoute = false,
        routeMenu,
        initialized = false,
        ajaxHandlersBound = false,
        animEndEventNames = {
            'WebkitAnimation'   : 'webkitAnimationEnd',
            'OAnimation'        : 'oAnimationEnd',
            'msAnimation'       : 'MSAnimationEnd',
            'animation'         : 'animationend'
        },

        animEndEventName = animEndEventNames[Modernizr.prefixed('animation')],

        support = Modernizr.cssanimations;

    function init(options) {
        if (initialized) return;
        initialized = true;
        routeMenu = options.menu;

        $('.pt-page').each( function() {
            var $page = $(this);
            $page.data('originalClassList', $page.attr('class'));
        });

        $('.pt-trigger').on("click", function (e) {
            e.preventDefault();
            if (isAnimating) {
                return false;
            }
            var pageTrigger = $(this),
                targetHref = pageTrigger.attr('href'),
                // Logo and photo triggers highlight the matching navigation link rather than the clicked non-menu element.
                menuLinkForTarget = $(routeMenu + ' a').filter(function() { return $(this).attr('href') === targetHref; }).first();

            activeMenuItem( menuLinkForTarget.length ? menuLinkForTarget : pageTrigger );

            Animate( pageTrigger );

            location.hash = targetHref;

        });

        $('body').append('<div id="page-ajax-loaded" class="page-ajax-loaded animated rotateInDownRight"></div>');
        $(window).on('hashchange.portfolioRoutes', routeCurrentHash);
        if (!location.hash) location.hash = $(routeMenu + ' a').first().attr('href');
        routeCurrentHash();

        ajaxLoader();

        $(".lmpixels-arrow-right").click(function() {
            var activeItem = $('.site-main-menu li.active');
            activeItem.next("li").children("a").click();
            if ( !activeItem.length || activeItem.is(':last-child') ) {
                $('.site-main-menu li:first-child').children("a").click();
            }
        });

        $(".lmpixels-arrow-left").click(function() {
            var activeItem = $('.site-main-menu li.active');
            activeItem.prev("li").children("a").click();
            if ( !activeItem.length || activeItem.is(':first-child') ) {
                $('.site-main-menu li:last-child').children("a").click();
            }
        });
    }

    function routeCurrentHash() {
        var links = $(routeMenu + ' a');
        var routes = links.map(function() { return $(this).attr('href'); }).get();
        var details = $('.ajax-page-load').map(function() { return $(this).attr('href'); }).get();
        var target = PortfolioRoutePolicy.resolve(location.hash, routes, details);
        if (!target) return showNotFound();
        var menuLink = links.filter(function() { return $(this).attr('href') === target; }).first();
        if (isAnimating) { pendingRoute = true; return; }
        activeMenuItem(menuLink);
        Animate(menuLink);
        ajaxLoader();
    }

    function showNotFound() {
        var page = PortfolioNotFoundView.ensure(sectionsContainer[0]);
        var errorPage = $(page);
        errorPage.data('originalClassList', 'pt-page route-error');
        $('.pt-page').each(function() {
            $(this).off('.pageTransition').attr('class', $(this).data('originalClassList'));
        });
        isAnimating = false;
        pendingRoute = false;
        sectionsContainer.data('current', 'not-found');
        $('ul.site-main-menu li').removeClass('active');
        $('#page-ajax-loaded').hide();
        $('body').removeClass('ajax-page-visible');
        PortfolioNotFoundView.activate(page);
    }

    function activeMenuItem(item) {
        if ( !item || !$(item).length ) {
            return false;
        }

        var navLink = $(item);
        navLink = navLink['0'];
        navLink = $(navLink.parentNode);
            
        if(navLink) {
            $('ul.site-main-menu li').removeClass('active');
            navLink.addClass('active');
        }
    }

    function ajaxLoader() {
        var ajaxLoadedContent = $('#page-ajax-loaded');

        function showContent() {
            ajaxLoadedContent.removeClass('rotateOutDownRight closed');
            ajaxLoadedContent.show();
            $('body').addClass('ajax-page-visible');
        }

        function hideContent() {
            $('#page-ajax-loaded').addClass('rotateOutDownRight closed');
            $('body').removeClass('ajax-page-visible');
            setTimeout(function(){
                $('#page-ajax-loaded.closed').html('');
                ajaxLoadedContent.hide();
            }, 500);
        }

        var href = $('.ajax-page-load').each(function(){
            href = $(this).attr('href');
            if(location.hash == location.hash.split('/')[0] + '/' + href.substr(0,href.length-5)){
                var toLoad =  $(this).attr('href');
                showContent();
                ajaxLoadedContent.load(toLoad + ' .zoom-container');
                return false;
            }
        });

        if (ajaxHandlersBound) return;
        ajaxHandlersBound = true;
        $(document)
            .on("click",".site-main-menu, #ajax-page-close-button", function (e) {  
                e.preventDefault();
                hideContent();
                location.hash = location.hash.split('/')[0];
            })
            .on("click",".ajax-page-load", function () {  
                var hash = location.hash.split('/')[0] + '/' + $(this).attr('href').substr(0,$(this).attr('href').length-5);
                location.hash = hash;
                showContent();

                return false;
            });
    }

    function Animate($pageTrigger) {
        var targetId = $pageTrigger.attr('href').split('#')[1],
            currentId = sectionsContainer.data('current'),
            navLinks = $('.site-main-menu .pt-trigger'),
            safeAnimation = PortfolioPageTransitionPolicy.select({
                mobile: window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches,
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                fromIndex: navLinks.index(navLinks.filter('[href="#' + currentId + '"]')),
                toIndex: navLinks.index(navLinks.filter('[href="#' + targetId + '"]')),
            });

        if (safeAnimation === null && !($pageTrigger.attr('data-animation'))) {
            var animNumber = parseInt(Math.floor(Math.random() * 67) + 1);
            $pageTrigger.data('animation',animNumber);
        }

        var animation = safeAnimation !== null ? String(safeAnimation) : $pageTrigger.data('animation').toString(),
            gotoPage, inClass, outClass, selectedAnimNumber;

        if(animation.indexOf('-') != -1) {
            var randomAnimList = animation.split('-');
            selectedAnimNumber = parseInt(randomAnimList[(Math.floor(Math.random() * randomAnimList.length))]);
        }
        else {
            selectedAnimNumber = parseInt(animation);
        }

        if (selectedAnimNumber > 67) {
            alert("Transition.js : Invalid 'data-animation' attribute configuration. Animation number should not be greater than 67");
            return false;
        }

        var classes = PortfolioPageAnimations.get(selectedAnimNumber);
        if (!classes) return false;
        inClass = classes.inClass;
        outClass = classes.outClass;

        var $pageWrapper = sectionsContainer,
            currentPageId = $pageWrapper.data('current'), tempPageIndex,
            linkhref = $pageTrigger.attr('href').split("#"),
            gotoPage = linkhref[1];
            
            tempPageIndex = currentPageId;

            var $currentPage = $('section[data-id="' + currentPageId + '"]');

            currentPageId = gotoPage;

            if (tempPageIndex != currentPageId) {
                isAnimating = true;

                $pageWrapper.data('current', currentPageId);


                var $nextPage = $('section[data-id='+currentPageId+']').addClass('pt-page-current');

                $nextPage.scrollTop(0);
                document.dispatchEvent(new CustomEvent('portfolio:page-activate', { detail: { page: $nextPage[0] } }));

                if (selectedAnimNumber === 0 || !support) {
                    onEndAnimation($pageWrapper, $nextPage, $currentPage);
                    isAnimating = false;
                    return;
                }

                var currentFinished = !$currentPage.length,
                    nextFinished = false,
                    transitionEvent = animEndEventName + '.pageTransition';

                function finishTransition() {
                    if (!currentFinished || !nextFinished) return;
                    $currentPage.off(transitionEvent);
                    $nextPage.off(transitionEvent);
                    onEndAnimation($pageWrapper, $nextPage, $currentPage);
                    isAnimating = false;
                }

                $currentPage.addClass(outClass).on(transitionEvent, function(event) {
                    if (event.target !== this) return;
                    currentFinished = true;
                    finishTransition();
                });

                $nextPage.addClass(inClass).on(transitionEvent, function(event) {
                    if (event.target !== this) return;
                    nextFinished = true;
                    finishTransition();
                });

            }
            else {
                isAnimating = false;
            }


    }

    function onEndAnimation($pageWrapper, $nextPage, $currentPage) {
        resetPage($nextPage, $currentPage);
        document.dispatchEvent(new CustomEvent('portfolio:page-settled', { detail: { page: $nextPage[0] } }));
        if (pendingRoute) { pendingRoute = false; setTimeout(routeCurrentHash, 0); }
    }

    function resetPage($nextPage, $currentPage) {
        $currentPage.attr('class', $currentPage.data('originalClassList'));
        $nextPage.attr('class', $nextPage.data('originalClassList') + ' pt-page-current');
    }

    return {
        init : init,
    };

})(jQuery);
