/* SignWheel star field: crisp generated points, observatory-plate
 * style. One tiny element per layer, stars drawn as box-shadows, so
 * the whole sky costs three DOM nodes and no images. Deterministic
 * seed, so every page has the same sky. */
(function () {
  "use strict";
  // Small deterministic PRNG (mulberry32) so the sky is stable.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function layer(cls, count, seed, bright) {
    var rand = rng(seed);
    var w = Math.max(document.documentElement.clientWidth, 1200);
    var h = Math.max(document.documentElement.clientHeight, 900);
    var shadows = [];
    for (var i = 0; i < count; i++) {
      var x = Math.floor(rand() * w), y = Math.floor(rand() * h);
      var a = bright ? (0.55 + rand() * 0.45) : (0.25 + rand() * 0.5);
      shadows.push(x + "px " + y + "px 0 0 rgba(243,234,214," + a.toFixed(2) + ")");
    }
    var el = document.createElement("div");
    el.className = "stars " + cls;
    el.style.boxShadow = shadows.join(",");
    return el;
  }
  function build() {
    var host = document.querySelector(".starfield");
    if (!host) return;
    host.appendChild(layer("small", 170, 1234567, false));
    host.appendChild(layer("", 70, 7654321, true));
    host.appendChild(layer("twinkle", 26, 24681357, true));
    // A few bright stars get a fine cross sparkle, engraved-plate style.
    var rand = rng(112233);
    var w = Math.max(document.documentElement.clientWidth, 1200);
    var h = Math.max(document.documentElement.clientHeight, 900);
    var svg = '<svg width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">';
    for (var i = 0; i < 9; i++) {
      var x = Math.floor(rand() * w), y = Math.floor(rand() * h), r = 5 + rand() * 5;
      svg += '<g stroke="rgba(240,194,104,0.7)" stroke-width="1">' +
        '<line x1="' + (x - r) + '" y1="' + y + '" x2="' + (x + r) + '" y2="' + y + '"/>' +
        '<line x1="' + x + '" y1="' + (y - r) + '" x2="' + x + '" y2="' + (y + r) + '"/></g>' +
        '<circle cx="' + x + '" cy="' + y + '" r="1.4" fill="rgba(243,234,214,0.95)"/>';
    }
    var wrap = document.createElement("div");
    wrap.innerHTML = svg;
    host.appendChild(wrap.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
