/* Resume personality tooltip (T-4 A1: moved unchanged from an inline block in index.html).
   Runs where the inline block ran, at the end of body, after .resume-personality-info exists. */
/* CSS covers hover and focus; click toggling and outside/Escape dismissal support touch. */
(function () {
  var btn = document.querySelector(".resume-personality-info");
  var tip = document.getElementById("personality-info-tip");
  if (!btn || !tip) return;

  function close() {
    tip.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    // Suppress hover until pointer exit so closing by click also hides the CSS hover tooltip.
    btn.classList.add("suppress-hover-tip");
  }

  function open() {
    tip.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    btn.classList.remove("suppress-hover-tip");
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    if (tip.classList.contains("is-open")) {
      close();
    } else {
      open();
    }
  });

  btn.addEventListener("mouseleave", function () {
    if (!btn.matches(':focus-visible')) btn.classList.remove("suppress-hover-tip");
  });
  btn.addEventListener("blur", function () { btn.classList.remove("suppress-hover-tip"); });

  document.addEventListener("click", function (e) {
    if (e.target === btn || btn.contains(e.target)) return;
    if (tip.contains(e.target)) return;
    close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
