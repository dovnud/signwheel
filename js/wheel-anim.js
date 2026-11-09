/* SignWheel wheel motion: the wheel casts itself.
 * Rings and cusp lines draw in like an engraver's compass, planets
 * glide along the ring and settle with a soft spring overshoot, the
 * centre sun pops last. Plus a slow warm sheen that travels the rim,
 * like light catching record grooves (pure CSS, see .sheen).
 * Everything is progressive: no JS, no WAAPI, or reduced motion all
 * leave the finished static wheel, exactly as printed. */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function dashDraw(el, dur, delay) {
    var len;
    try { len = el.getTotalLength(); } catch (e) { return; }
    if (!len || !isFinite(len)) return;
    el.style.strokeDasharray = len + " " + len;
    el.style.strokeDashoffset = String(len);
    var anim = el.animate(
      [{ strokeDashoffset: String(len) }, { strokeDashoffset: "0" }],
      { duration: dur, delay: delay, easing: "cubic-bezier(.4,0,.2,1)", fill: "backwards" }
    );
    var clear = function () { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; };
    if (anim && anim.finished) anim.finished.then(clear, clear); else setTimeout(clear, dur + delay + 300);
  }

  function playOne(box) {
    var svg = box.querySelector("svg.wheel-svg");
    if (!svg) return;
    // the brass light sweep (CSS animates it; reduced motion freezes it)
    if (!box.querySelector(".sheen")) {
      box.classList.add("wheel-stage");
      var sheen = document.createElement("div");
      sheen.className = "sheen";
      sheen.setAttribute("aria-hidden", "true");
      box.appendChild(sheen);
    }
    if (reduced || !svg.animate) return;
    try {
      var rings = svg.querySelectorAll(".w-rings circle, .w-rings line");
      rings.forEach(function (el, i) { dashDraw(el, 850, i * 26); });
      var glyphs = svg.querySelectorAll(".w-rings text");
      glyphs.forEach(function (el, i) {
        el.animate([{ opacity: "0" }, { opacity: "1" }], { duration: 500, delay: 320 + i * 22, easing: "ease-out", fill: "backwards" });
      });
      var cusps = svg.querySelectorAll(".w-cusps line");
      cusps.forEach(function (el, i) { dashDraw(el, 550, 480 + i * 30); });
      var labels = svg.querySelectorAll(".w-cusps text, .w-etch");
      labels.forEach(function (el) {
        el.animate([{ opacity: "0" }, { opacity: "1" }], { duration: 600, delay: 900, easing: "ease-out", fill: "backwards" });
      });
      var planets = svg.querySelectorAll(".w-planet");
      planets.forEach(function (el, i) {
        el.animate(
          [{ transform: "rotate(-16deg)", opacity: "0" }, { transform: "rotate(0deg)", opacity: "1" }],
          { duration: 780, delay: 620 + i * 70, easing: "cubic-bezier(.25,1.35,.35,1)", fill: "backwards" }
        );
      });
      var centre = svg.querySelector(".w-centre");
      if (centre) {
        centre.animate(
          [{ transform: "scale(.4)", opacity: "0" }, { transform: "scale(1)", opacity: "1" }],
          { duration: 620, delay: 620 + planets.length * 70, easing: "cubic-bezier(.25,1.5,.35,1)", fill: "backwards" }
        );
      }
      // Safety: nothing may stay hidden if an animation is interrupted.
      setTimeout(function () {
        svg.querySelectorAll("circle, line").forEach(function (el) {
          el.style.strokeDasharray = ""; el.style.strokeDashoffset = "";
        });
      }, 3400);
    } catch (e) { /* the static wheel is already correct */ }
  }

  function play(scope) {
    if (!scope) return;
    var boxes = [];
    if (scope.classList && (scope.classList.contains("wheel-box") || scope.classList.contains("hero-wheel"))) boxes.push(scope);
    scope.querySelectorAll(".wheel-box, .hero-wheel").forEach(function (b) { boxes.push(b); });
    boxes.forEach(playOne);
  }

  window.WheelFX = { play: play };
})();
