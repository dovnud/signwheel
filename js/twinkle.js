/* SignWheel living sky (home hero only): a small canvas of seeded
 * stars, each with its own brightness and twinkle beat, and a shooting
 * star every so often. Click a bright star and it answers with a soft
 * pulse and a handwritten note in the margin. Deterministic seed, so
 * the sky is the same sky on every visit. Reduced motion gets one
 * still frame. The rest of the site keeps the static star field. */
(function () {
  "use strict";
  var hero = document.querySelector(".hero");
  if (!hero) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var canvas = document.createElement("canvas");
  canvas.className = "sky-canvas";
  canvas.setAttribute("aria-hidden", "true");
  hero.insertBefore(canvas, hero.firstChild);
  var ctx = canvas.getContext("2d");

  var stars = [], W = 0, H = 0, pulses = [], meteor = null, nextMeteor = 0;
  var NOTES = [
    "noted. the sky keeps its own ledger",
    "a wish, filed under stars",
    "seen. the wheel turns on",
    "that one has been watching back",
    "marked in the margin, in pencil"
  ];
  var noteEl = null, noteTimer = 0;

  function build() {
    var r = hero.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(300, r.width); H = Math.max(300, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rand = rng(20261109);
    var count = Math.min(230, Math.round(W * H / 8500));
    stars = [];
    for (var i = 0; i < count; i++) {
      var mag = Math.pow(rand(), 2.6);            // few bright, many faint
      stars.push({
        x: rand() * W, y: rand() * H,
        r: 0.5 + (1 - mag) * 1.5,
        base: 0.25 + (1 - mag) * 0.75,
        phase: rand() * Math.PI * 2,
        speed: 0.4 + rand() * 1.1,
        warm: rand() < 0.22,
        bright: mag < 0.06
      });
    }
  }

  function drawStar(s, t) {
    var tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
    var a = s.base * (reduced ? 0.85 : tw);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 6.2832);
    ctx.fillStyle = s.warm ? "rgba(240,194,104," + a.toFixed(3) + ")" : "rgba(243,234,214," + a.toFixed(3) + ")";
    ctx.fill();
    if (s.bright && tw > 0.86 && !reduced) {       // cross sparkle at the peak of the twinkle
      var L = s.r * 7 * (tw - 0.86) * 7;
      ctx.strokeStyle = "rgba(240,194,104," + (0.5 * (tw - 0.86) * 7).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
      ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L);
      ctx.stroke();
    }
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) drawStar(stars[i], t);
    // shooting star
    if (!reduced) {
      if (!meteor && t > nextMeteor) {
        meteor = { x: W * (0.35 + Math.random() * 0.55), y: H * Math.random() * 0.3, vx: -(0.35 + Math.random() * 0.25), vy: 0.22 + Math.random() * 0.12, t0: t, life: 850 + Math.random() * 300 };
        nextMeteor = t + 16000 + Math.random() * 24000;
      }
      if (meteor) {
        var k = (t - meteor.t0) / meteor.life;
        if (k >= 1) meteor = null;
        else {
          var hx = meteor.x + meteor.vx * (t - meteor.t0), hy = meteor.y + meteor.vy * (t - meteor.t0);
          var tail = 90, fade = Math.sin(Math.PI * Math.min(1, k));
          var grad = ctx.createLinearGradient(hx, hy, hx - meteor.vx * tail * 2.2, hy - meteor.vy * tail * 2.2);
          grad.addColorStop(0, "rgba(243,234,214," + (0.85 * fade).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(243,234,214,0)");
          ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - meteor.vx * tail * 2.2, hy - meteor.vy * tail * 2.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, 6.2832); ctx.fillStyle = "rgba(255,250,235," + (0.9 * fade).toFixed(3) + ")"; ctx.fill();
        }
      }
    }
    // pulses from clicks
    pulses = pulses.filter(function (p) { return t - p.t0 < 900; });
    for (var j = 0; j < pulses.length; j++) {
      var p = pulses[j], q = (t - p.t0) / 900;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + q * 26, 0, 6.2832);
      ctx.strokeStyle = "rgba(240,194,104," + (0.55 * (1 - q)).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (!reduced && !document.hidden) requestAnimationFrame(frame);
  }

  function showNote(x, y) {
    if (!noteEl) {
      noteEl = document.createElement("div");
      noteEl.className = "sky-note hand";
      hero.appendChild(noteEl);
    }
    noteEl.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];
    noteEl.style.left = Math.min(Math.max(8, x - 30), W - 190) + "px";
    noteEl.style.top = Math.max(6, y - 44) + "px";
    noteEl.classList.add("on");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { noteEl.classList.remove("on"); }, 2800);
  }

  hero.addEventListener("click", function (e) {
    if (reduced) return;
    if (e.target.closest("a, button, input, select, textarea")) return;
    var r = hero.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 48;
    for (var i = 0; i < stars.length; i++) {
      var d = Math.hypot(stars[i].x - x, stars[i].y - y);
      if (d < bd) { bd = d; best = stars[i]; }
    }
    if (best) { pulses.push({ x: best.x, y: best.y, t0: performance.now() }); showNote(best.x, best.y); }
  });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (reduced) frame(0); }, 200);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !reduced) requestAnimationFrame(frame);
  });

  build();
  nextMeteor = performance.now() + 5000 + Math.random() * 6000;
  if (reduced) frame(0); else requestAnimationFrame(frame);
})();
