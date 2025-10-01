var PageTransitions = (function ($) {
"use strict";
    var sectionsContainer = $(".subpages"),
        isAnimating = false,
        pendingRoute = false,
        waitingForMenu = false,
        routeVersion = 0,
        transitionMotion,
        routeMenu,
        initialized = false,
        ajaxHandlersBound = false,
        support = Modernizr.cssanimations;

    function init(options) {
        if (initialized) return;
        initialized = true;
        routeMenu = options.menu;

        $('.pt-page').each( function() {
            var $page = $(this);
            $page.data('originalClassList', $page.attr('class'));
            setPageAvailable($page, false);
        });

        $('.pt-trigger').on("click", function (e) {
            e.preventDefault();
            var targetHref = $(this).attr('href');
            // Hash changes are the single navigation entry point, including queued clicks.
            if (location.hash === targetHref) routeCurrentHash();
            else location.hash = targetHref;
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

    function resolveCurrentRoute() {
        var links = $(routeMenu + ' a');
        var routes = links.map(function() { return $(this).attr('href'); }).get();
        var details = $('.ajax-page-load').map(function() { return $(this).attr('href'); }).get();
        return PortfolioRoutePolicy.resolve(location.hash, routes, details);
    }

    function routeCurrentHash() {
        var route = resolveCurrentRoute();
        if (!route) return showNotFound();
        if (isAnimating || waitingForMenu) { pendingRoute = true; return; }
        // Selecting the current page must not schedule a closure that can consume the next menu opening.
        if (route === '#' + sectionsContainer.data('current')) {
            ajaxLoader();
            return;
        }
        waitingForMenu = true;
        var version = ++routeVersion;
        var menuClosed = window.PortfolioSiteShell ? PortfolioSiteShell.closeMenu() : Promise.resolve();
        menuClosed.then(function () {
            if (version !== routeVersion) return;
            waitingForMenu = false;
            // A later request during drawer closure wins; never animate an obsolete hash.
            var target = resolveCurrentRoute();
            if (!target) return showNotFound();
            if (document.body.classList.contains('mobile-menu-open')) return routeCurrentHash();
            pendingRoute = false;
            var menuLink = $(routeMenu + ' a').filter(function() { return $(this).attr('href') === target; }).first();
            activeMenuItem(menuLink);
            Animate(menuLink);
            ajaxLoader();
        });
    }

    function setPageAvailable(page, available) {
        if (available) page.removeAttr('inert aria-hidden');
        else page.attr({ inert: '', 'aria-hidden': 'true' });
    }

    function showNotFound() {
        routeVersion++;
        waitingForMenu = false;
        if (window.PortfolioSiteShell) PortfolioSiteShell.closeMenu();
        if (transitionMotion) transitionMotion.cancel();
        var page = PortfolioNotFoundView.ensure(sectionsContainer[0]);
        var errorPage = $(page);
        errorPage.data('originalClassList', 'pt-page route-error');
        $('.pt-page').each(function() {
            $(this).attr('class', $(this).data('originalClassList'));
            setPageAvailable($(this), false);
        });
        isAnimating = false;
        pendingRoute = false;
        sectionsContainer.data('current', 'not-found');
        $('ul.site-main-menu li').removeClass('active');
        $('#page-ajax-loaded').hide();
        $('body').removeClass('ajax-page-visible');
        setPageAvailable(errorPage, true);
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
                mobile: window.matchMedia('(max-width: 991px), (hover: none) and (pointer: coarse)').matches,
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
                var moveFocus = $currentPage.length && $currentPage[0].contains(document.activeElement);
                setPageAvailable($currentPage, false);
                setPageAvailable($nextPage, true);

                $nextPage.scrollTop(0);
                document.dispatchEvent(new CustomEvent('portfolio:page-activate', { detail: { page: $nextPage[0] } }));

                if (selectedAnimNumber === 0 || !support) {
                    isAnimating = false;
                    onEndAnimation($pageWrapper, $nextPage, $currentPage, moveFocus);
                    return;
                }

                $currentPage.addClass(outClass);
                $nextPage.addClass(inClass);
                var version = routeVersion;
                transitionMotion = PortfolioMotionCompletion.wait([$currentPage[0], $nextPage[0]], 'animation');
                transitionMotion.finished.then(function () {
                    if (version !== routeVersion) return;
                    isAnimating = false;
                    onEndAnimation($pageWrapper, $nextPage, $currentPage, moveFocus);
                });

            }
            else {
                isAnimating = false;
            }


    }

    function onEndAnimation($pageWrapper, $nextPage, $currentPage, moveFocus) {
        resetPage($nextPage, $currentPage);
        if (moveFocus) {
            var heading = $nextPage.find('h1, h2').first();
            heading.attr('tabindex', '-1');
            if (heading.length) heading[0].focus({ preventScroll: true });
        }
        document.dispatchEvent(new CustomEvent('portfolio:page-settled', { detail: { page: $nextPage[0] } }));
        if (pendingRoute) { pendingRoute = false; routeCurrentHash(); }
    }

    function resetPage($nextPage, $currentPage) {
        $currentPage.attr('class', $currentPage.data('originalClassList'));
        $nextPage.attr('class', $nextPage.data('originalClassList') + ' pt-page-current');
    }

    return {
        init : init,
    };

})(jQuery);
