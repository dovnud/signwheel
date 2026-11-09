/* SignWheel chart wheel: draws the wheel as fine brass line work in
 * SVG, star-atlas style. Used for the home page "sky right now" hero
 * and for birth chart results. Ascendant sits on the left horizon,
 * longitudes run counter-clockwise, as on a printed chart. */
"use strict";

const VS = "\uFE0E"; // variation selector: force text (monochrome) presentation, never colour emoji
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map((g) => g + VS);
const PLANET_GLYPHS = {
  Sun: "☉" + VS, Moon: "☽" + VS, Mercury: "☿" + VS, Venus: "♀" + VS, Mars: "♂" + VS,
  Jupiter: "♃" + VS, Saturn: "♄" + VS, Uranus: "⛢" + VS, Neptune: "♆" + VS, Pluto: "♇" + VS,
};

function drawWheelSVG(opts) {
  const size = opts.size || 520;
  const cx = size / 2, cy = size / 2;
  const R_OUT = size * 0.485;          // outer rim
  const R_SIGN_IN = size * 0.395;      // sign ring inner edge
  const R_PLANET = size * 0.315;       // planet glyph ring
  const R_CUSP_IN = size * 0.115;      // where cusp lines stop
  const ref = (opts.asc === null || opts.asc === undefined) ? 0 : opts.asc;
  const pt = (lon, r) => {
    // Ascendant on the left horizon, Midheaven at the top, Descendant
    // right, IC at the bottom: as longitude grows past the Ascendant
    // the point drops below the eastern (left) horizon, which is the
    // orientation of a printed chart. Verified against the N1 test
    // chart: Libra rising, MC in Cancer at the top, Sun in the 9th
    // house upper right (afternoon birth).
    const phi = (180 + (lon - ref)) * Math.PI / 180;
    return [cx + r * Math.cos(phi), cy - r * Math.sin(phi)];
  };
  let s = "";
  s += '<svg class="wheel-svg" viewBox="-34 -34 ' + (size + 68) + " " + (size + 68) + '" role="img" aria-label="Astrological chart wheel">';
  // rings
  s += '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="' + R_OUT + '"/>';
  s += '<circle class="ring-faint" cx="' + cx + '" cy="' + cy + '" r="' + (R_OUT - 3) + '"/>';
  s += '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="' + R_SIGN_IN + '"/>';
  s += '<circle class="ring-faint" cx="' + cx + '" cy="' + cy + '" r="' + R_CUSP_IN + '"/>';
  // sign segments
  for (let i = 0; i < 12; i++) {
    const lon0 = i * 30, lonMid = lon0 + 15;
    const [tx1, ty1] = pt(lon0, R_SIGN_IN), [tx2, ty2] = pt(lon0, R_OUT);
    s += '<line class="cusp" x1="' + tx1 + '" y1="' + ty1 + '" x2="' + tx2 + '" y2="' + ty2 + '"/>';
    const [gx, gy] = pt(lonMid, (R_OUT + R_SIGN_IN) / 2 + size * 0.012);
    s += '<text class="sign-glyph" x="' + gx + '" y="' + gy + '" font-size="' + size * 0.052 + '" text-anchor="middle" dominant-baseline="middle">' + SIGN_GLYPHS[i] + "</text>";
    const [nx, ny] = pt(lonMid, (R_OUT + R_SIGN_IN) / 2 - size * 0.030);
    s += '<text class="sign-name" x="' + nx + '" y="' + ny + '" font-size="' + size * 0.016 + '" text-anchor="middle" dominant-baseline="middle">' + Engine.SIGNS[i].slice(0, 3).toUpperCase() + "</text>";
  }
  // house cusps
  if (opts.cusps) {
    for (let i = 0; i < 12; i++) {
      const major = i === 0 || i === 3 || i === 6 || i === 9;
      const [x1, y1] = pt(opts.cusps[i], R_CUSP_IN), [x2, y2] = pt(opts.cusps[i], R_SIGN_IN);
      s += '<line class="' + (major ? "cusp-major" : "cusp") + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }
    if (opts.asc !== null && opts.asc !== undefined) {
      const [ax, ay] = pt(opts.asc, R_OUT + size * 0.028);
      s += '<text class="angle-label" x="' + ax + '" y="' + ay + '" font-size="' + size * 0.024 + '" text-anchor="middle">ASC</text>';
    }
    if (opts.mc !== null && opts.mc !== undefined) {
      const [mx, my] = pt(opts.mc, R_OUT + size * 0.028);
      s += '<text class="angle-label" x="' + mx + '" y="' + my + '" font-size="' + size * 0.024 + '" text-anchor="middle">MC</text>';
    }
  }
  // planets, with a simple radial stagger when two land close together
  const entries = Object.keys(opts.planets).map((name) => ({ name, lon: opts.planets[name] })).sort((a, b) => a.lon - b.lon);
  let lastLon = -999, level = 0;
  for (const e of entries) {
    if (e.lon - lastLon < 8) level = (level + 1) % 3; else level = 0;
    lastLon = e.lon;
    const r = R_PLANET + (level - 1) * size * 0.052;
    const [x, y] = pt(e.lon, r);
    const [lx, ly] = pt(e.lon, R_SIGN_IN - size * 0.012);
    const [ix, iy] = pt(e.lon, r);
    s += '<line class="cusp" x1="' + lx + '" y1="' + ly + '" x2="' + ix + '" y2="' + iy + '" stroke-opacity="0.14"/>';
    s += '<text class="planet-glyph" x="' + x + '" y="' + y + '" font-size="' + size * 0.047 + '" text-anchor="middle" dominant-baseline="middle">' + PLANET_GLYPHS[e.name] + "</text>";
    const within = e.lon - 30 * Math.floor(e.lon / 30);
    const deg = Math.floor(within);
    const [dx, dy] = pt(e.lon, r - size * 0.045);
    s += '<text class="planet-deg" x="' + dx + '" y="' + dy + '" font-size="' + size * 0.020 + '" text-anchor="middle" dominant-baseline="middle">' + deg + "°</text>";
  }
  // centre: a small brass sun disc
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + size * 0.016 + '" fill="none" stroke="var(--gold)" stroke-opacity="0.8"/>';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + size * 0.004 + '" fill="var(--gold)"/>';
  s += "</svg>";
  return s;
}

if (typeof module !== "undefined") module.exports = { drawWheelSVG, SIGN_GLYPHS, PLANET_GLYPHS };
if (typeof window !== "undefined") { window.drawWheelSVG = drawWheelSVG; window.PLANET_GLYPHS = PLANET_GLYPHS; }
