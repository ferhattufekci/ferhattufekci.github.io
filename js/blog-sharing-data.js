/* Share data Interface shared by the browser adapter and Node contract tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioBlogSharingData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function prepareShareData(article) {
    var value = article && article.url;
    if (typeof value !== 'string' || !value || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return null;
    try {
      var parsed = new URL(value);
      if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return null;
    } catch (_) { return null; }
    return { title: String(article.title || ''), url: value };
  }
  function canUseNativeShare(environment, payload) {
    if (!payload || !environment.isSecureContext || typeof environment.share !== 'function') return false;
    try { return typeof environment.canShare !== 'function' || environment.canShare(payload) === true; }
    catch (_) { return false; }
  }
  return { prepareShareData: prepareShareData, canUseNativeShare: canUseNativeShare };
});
