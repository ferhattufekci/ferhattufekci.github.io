// Build embeds this source before stylesheets on every page to avoid a theme flash.
(function () {
  'use strict';
  var theme;
  try {
    theme = localStorage.getItem('ft-theme');
  } catch (error) {
    // Browser storage can be disabled; the operating-system preference still works.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
