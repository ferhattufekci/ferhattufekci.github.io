/* PLEASE DO NOT COPY AND PASTE THIS CODE. */
(function () {
  var w = window,
    C = "___grecaptcha_cfg",
    cfg = (w[C] = w[C] || {}),
    N = "grecaptcha";
  var gr = (w[N] = w[N] || {});
  gr.ready =
    gr.ready ||
    function (f) {
      (cfg["fns"] = cfg["fns"] || []).push(f);
    };
  w["__recaptcha_api"] = "https://www.google.com/recaptcha/api2/";
  (cfg["render"] = cfg["render"] || []).push("onload");
  w["__google_recaptcha_client"] = true;
  var d = document,
    po = d.createElement("script");
  po.type = "text/javascript";
  po.async = true;
  po.charset = "utf-8";
  po.src =
    "https://www.gstatic.com/recaptcha/releases/zIriijn3uj5Vpknvt_LnfNbF/recaptcha__en.js";
  po.crossOrigin = "anonymous";
  po.integrity =
    "sha384-8mJgBUBw4uTWF9Ooxgb4sUuO9jKtaVm1I+8vb0qpxxX3cafec7ovH+goM3yD4UyO";
  var e = d.querySelector("script[nonce]"),
    n = e && (e["nonce"] || e.getAttribute("nonce"));
  if (n) {
    po.setAttribute("nonce", n);
  }
  var s = d.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(po, s);
})();