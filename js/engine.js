/* SignWheel browser chart engine.
 *
 * Computes a tropical natal chart entirely in the visitor's browser:
 * planet longitudes (Sun..Pluto), Ascendant, MC, Placidus cusps with an
 * Equal-house fallback where Placidus does not exist.
 *
 * Planet positions, Mercury..Neptune: VSOP87B series (Bureau des
 * Longitudes), truncated to terms above ~0.5 arcsec (js/vsop87.js,
 * data via the MIT-licensed astronomia package), evaluated at the
 * light-time-corrected instant, then moved from the J2000 ecliptic to
 * the apparent ecliptic of the date (precession in longitude plus
 * nutation in longitude). The Sun is the same treatment of the Earth's
 * series. The Moon uses the compact algorithm by Paul Schlyter with
 * its principal perturbation terms. Pluto uses Schlyter's Pluto series
 * plus a small correction fitted to JPL DE440 (see PLUTO_FIT below).
 *
 * Accuracy is measured, not assumed: tools/check-engine.js compares
 * this engine against the project's proven JPL DE440 reference values
 * (engine-proof/, itself verified against Swiss Ephemeris on 100
 * charts). The measured differences are published in BUILD-STATUS.md
 * and on the About / method page.
 *
 * Angles and houses port the project's own proven formulas
 * (engine-proof/astro_engine.py): apparent sidereal time, true
 * obliquity from the IAU polynomial plus the short nutation series,
 * the Ascendant hour-angle branch check, and Placidus cusps by
 * fixed-point iteration on each cusp point's own declination.
 *
 * Time zones use the IANA database built into the browser (Intl),
 * with the D10 edge rules: the offset used is printed, spring-forward
 * gap times and fall-back fold times are flagged, unknown time gives
 * no houses and a Moon day range, and display formatting truncates
 * instead of rounding across a sign boundary.
 */
"use strict";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars",
                 "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const rev = (x) => ((x % 360) + 360) % 360;
const sinD = (x) => Math.sin(x * D2R);
const cosD = (x) => Math.cos(x * D2R);

let VSOP = null;
if (typeof module !== "undefined" && typeof require === "function") {
  try { VSOP = require("./vsop87.js"); } catch (e) { VSOP = null; }
}
if (!VSOP && typeof window !== "undefined") VSOP = window.VSOP87;

/* ---------------------------------------------------------- ephemeris */

/* Schlyter day number: days since 2000 Jan 0.0 (JD 2451543.5). */
function dayNumber(utcMs) {
  const dt = new Date(utcMs);
  const Y = dt.getUTCFullYear(), M = dt.getUTCMonth() + 1, D = dt.getUTCDate();
  const ut = dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;
  const d = 367 * Y - Math.floor(7 * (Y + Math.floor((M + 9) / 12)) / 4)
          + Math.floor(275 * M / 9) + D - 730530;
  return d + ut / 24;
}

/* Evaluate one VSOP87B coordinate series at tau (Julian millennia from
 * J2000). Series are stored as powers of tau, each a list of
 * [amplitude, phase, frequency] terms: sum a*cos(b + c*tau) per power,
 * then Horner in tau. Result in radians (L, B) or AU (R). */
function vsopSum(series, tau) {
  const coeffs = [];
  for (let p = 0; p < series.length; p++) {
    let s = 0;
    const terms = series[p];
    for (let k = 0; k < terms.length; k++) s += terms[k][0] * Math.cos(terms[k][1] + terms[k][2] * tau);
    coeffs.push(s);
  }
  let res = 0;
  for (let p = coeffs.length - 1; p >= 0; p--) res = res * tau + coeffs[p];
  return res;
}

/* Heliocentric ecliptic rectangular coordinates (J2000), AU. */
function vsopRect(name, tau) {
  const data = VSOP[name];
  const L = vsopSum(data.L, tau), B = vsopSum(data.B, tau), R = vsopSum(data.R, tau);
  const cB = Math.cos(B);
  return { x: R * cB * Math.cos(L), y: R * cB * Math.sin(L), z: R * Math.sin(B), L, B, R };
}

/* Precession in longitude (arcsec) J2000 -> date, plus nutation in
 * longitude, both as a longitude shift. For planetary latitudes this
 * simple shift is accurate to a few arcseconds, far inside tolerance. */
function longitudeShiftDeg(utcMs) {
  const JD = utcMs / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  const psiArcsec = 5038.47875 * T - 1.07259 * T * T - 0.001612 * T * T * T;
  const { dpsi } = nutationArcsec(T);
  return (psiArcsec + dpsi) / 3600;
}

const LIGHT_DAYS_PER_AU = 0.0057755183;

function sunRectSchlyter(d) { // kept for the Moon's Ms and Pluto's geo shift
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = rev(356.0470 + 0.9856002585 * d);
  const E = M + e * R2D * sinD(M) * (1 + e * cosD(M));
  const xv = Math.cos(E * D2R) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * D2R);
  const v = Math.atan2(yv, xv) * R2D;
  const r = Math.hypot(xv, yv);
  const lon = rev(v + w);
  return { x: r * cosD(lon), y: r * sinD(lon), z: 0, lon, M, r };
}

function moonPos(d, sun) {
  const el = { N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.054900, M: 115.3654 + 13.0649929509 * d };
  const M = rev(el.M);
  let E = M + el.e * R2D * sinD(M) * (1 + el.e * cosD(M));
  for (let k = 0; k < 6; k++) E = E - (E - el.e * R2D * sinD(E) - M) / (1 - el.e * cosD(E));
  const xv = el.a * (cosD(E) - el.e);
  const yv = el.a * (Math.sqrt(1 - el.e * el.e) * sinD(E));
  const v = Math.atan2(yv, xv) * R2D;
  const r0 = Math.hypot(xv, yv);
  const u = v + el.w;
  const xh = r0 * (cosD(el.N) * cosD(u) - sinD(el.N) * sinD(u) * cosD(el.i));
  const yh = r0 * (sinD(el.N) * cosD(u) + cosD(el.N) * sinD(u) * cosD(el.i));
  const zh = r0 * (sinD(u) * sinD(el.i));
  let lon = rev(Math.atan2(yh, xh) * R2D);
  let lat = Math.atan2(zh, Math.hypot(xh, yh)) * R2D;
  let r = r0;
  const Ms = sun.M, Mm = el.M;
  const Lm = rev(el.N + el.w + el.M);
  const Ls = rev(282.9404 + 4.70935e-5 * d + sun.M);
  const D = rev(Lm - Ls);
  const F = rev(Lm - el.N);
  lon += -1.274 * sinD(Mm - 2 * D) + 0.658 * sinD(2 * D) - 0.186 * sinD(Ms)
         - 0.059 * sinD(2 * Mm - 2 * D) - 0.057 * sinD(Mm - 2 * D + Ms)
         + 0.053 * sinD(Mm + 2 * D) + 0.046 * sinD(2 * D - Ms)
         + 0.041 * sinD(Mm - Ms) - 0.035 * sinD(D) - 0.031 * sinD(Mm + Ms)
         - 0.015 * sinD(2 * F - 2 * D) + 0.011 * sinD(Mm - 4 * D);
  lat += -0.173 * sinD(F - 2 * D) - 0.055 * sinD(Mm - F - 2 * D)
         - 0.046 * sinD(Mm + F - 2 * D) + 0.033 * sinD(F + 2 * D)
         + 0.017 * sinD(2 * Mm + F);
  r += -0.58 * cosD(Mm - 2 * D) - 0.46 * cosD(2 * D);
  return { lon: rev(lon), lat, r };
}

/* Pluto: Schlyter's series, plus a correction fitted by least squares
 * to JPL DE440 heliocentric longitudes sampled every 100 days over
 * 1920-2030 (tools/fit-corrections.js; worst fitted residual 3.3
 * arc-minutes). Basis: [1, t, t^2, sin P, cos P], t in Julian
 * centuries from the Schlyter day number, P as in the series. */
const PLUTO_FIT = [-2.694375, 6.043159, 9.497854, -0.900141, -3.765304];
function plutoHelio(d) {
  const P = 238.9508 + 0.00400703 * d;
  let lon = P - 19.799 * sinD(P) + 19.848 * cosD(P) + 0.897 * sinD(2 * P) - 4.956 * cosD(2 * P)
            + 0.610 * sinD(3 * P) + 1.211 * cosD(3 * P) - 0.341 * sinD(4 * P) - 0.190 * cosD(4 * P)
            + 0.128 * sinD(5 * P) - 0.034 * cosD(5 * P) - 0.038 * sinD(6 * P) + 0.031 * cosD(6 * P);
  const lat = -3.9082 - 5.453 * sinD(P) - 14.975 * cosD(P) + 3.527 * sinD(2 * P) + 1.673 * cosD(2 * P)
              - 1.051 * sinD(3 * P) + 0.328 * cosD(3 * P) + 0.179 * sinD(4 * P) - 0.292 * cosD(4 * P)
              + 0.019 * sinD(5 * P) + 0.100 * cosD(5 * P) - 0.031 * sinD(6 * P) - 0.026 * cosD(6 * P);
  const r = 40.72 + 6.68 * sinD(P) + 6.90 * cosD(P) - 1.18 * sinD(2 * P) - 0.03 * cosD(2 * P)
            + 0.15 * sinD(3 * P) - 0.14 * cosD(3 * P);
  const t = d / 36525;
  lon += PLUTO_FIT[0] + PLUTO_FIT[1] * t + PLUTO_FIT[2] * t * t + PLUTO_FIT[3] * sinD(P) + PLUTO_FIT[4] * cosD(P);
  return { lon: rev(lon), lat, r };
}

/* Apparent geocentric tropical longitudes for Sun..Pluto at a UTC instant. */
function planetLongitudes(utcMs) {
  if (!VSOP) throw new Error("VSOP87 data not loaded");
  const JD = utcMs / 86400000 + 2440587.5;
  const tau = (JD - 2451545.0) / 365250;
  const shift = longitudeShiftDeg(utcMs);
  const earth = vsopRect("earth", tau);
  const out = {};
  // Sun: geocentric is the opposite of the Earth's heliocentric vector;
  // apparent longitude also carries the classic -20.49 arcsec aberration shift.
  out.Sun = rev(Math.atan2(-earth.y, -earth.x) * R2D + shift - 20.49 / 3600);
  for (const name of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]) {
    let p = vsopRect(name, tau);
    let gx = p.x - earth.x, gy = p.y - earth.y;
    const dist = Math.hypot(gx, gy, p.z - earth.z);
    p = vsopRect(name, tau - dist * LIGHT_DAYS_PER_AU / 365.25 / 1000);
    gx = p.x - earth.x; gy = p.y - earth.y;
    const label = name[0].toUpperCase() + name.slice(1);
    out[label] = rev(Math.atan2(gy, gx) * R2D + shift);
  }
  const d = dayNumber(utcMs);
  const sunS = sunRectSchlyter(d);
  const moon = moonPos(d, sunS);
  out.Moon = moon.lon;
  const pl = plutoHelio(d);
  const px = pl.r * cosD(pl.lon) * cosD(pl.lat) + sunS.x;
  const py = pl.r * sinD(pl.lon) * cosD(pl.lat) + sunS.y;
  out.Pluto = rev(Math.atan2(py, px) * R2D);
  return out;
}

/* Moon phase: illumination fraction and phase angle at a UTC instant. */
function moonPhase(utcMs) {
  const pos = planetLongitudes(utcMs);
  const elong = rev(pos.Moon - pos.Sun);
  const illum = (1 - cosD(elong)) / 2;
  return { moonLon: pos.Moon, sunLon: pos.Sun, elongation: elong, illum };
}

const PHASE_NAMES = [
  [0.0339, "New Moon"], [0.2161, "Waxing Crescent"], [0.2839, "First Quarter"],
  [0.4661, "Waxing Gibbous"], [0.5339, "Full Moon"], [0.7161, "Waning Gibbous"],
  [0.7839, "Last Quarter"], [0.9661, "Waning Crescent"], [1.0001, "New Moon"],
];
function phaseName(elongDeg) {
  const f = elongDeg / 360;
  for (const [limit, name] of PHASE_NAMES) if (f < limit) return name;
  return "New Moon";
}

/* ------------------------------------------------- sidereal and angles */

function meanObliquityDeg(T) {
  return (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}
function nutationArcsec(T) {
  const Om = (125.04452 - 1934.136261 * T) * D2R;
  const L = (280.4665 + 481267.6153 * T) * D2R;
  const Lp = (218.3165 + 481267.8813 * T) * D2R;
  const dpsi = -17.20 * Math.sin(Om) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lp) + 0.21 * Math.sin(2 * Om);
  const deps = 9.20 * Math.cos(Om) + 0.57 * Math.cos(2 * L) + 0.10 * Math.cos(2 * Lp) - 0.09 * Math.cos(2 * Om);
  return { dpsi, deps };
}
/* Greenwich apparent sidereal time (degrees) and true obliquity. */
function siderealAndObliquity(utcMs) {
  const JD = utcMs / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
           + 0.000387933 * T * T - T * T * T / 38710000;
  gmst = rev(gmst);
  const { dpsi, deps } = nutationArcsec(T);
  const epsTrue = meanObliquityDeg(T) + deps / 3600;
  const gast = rev(gmst + (dpsi / 3600) * cosD(epsTrue));
  return { gast, eps: epsTrue };
}

function ascMc(utcMs, lat, lonEast) {
  const { gast, eps } = siderealAndObliquity(utcMs);
  const ramcDeg = rev(gast + lonEast);
  const ramc = ramcDeg * D2R, epsR = eps * D2R, phi = lat * D2R;
  let mc = rev(Math.atan2(Math.tan(ramc), Math.cos(epsR)) * R2D);
  if (Math.abs(rev(mc - ramcDeg + 180) - 180) > 90) mc = rev(mc + 180);
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(epsR) + Math.tan(phi) * Math.sin(epsR));
  let asc = rev(Math.atan2(y, x) * R2D);
  // Branch check (port of the proven fix): the true Ascendant has a
  // negative hour angle, H in (180, 360); flip if we landed on the
  // setting point.
  const ascR = asc * D2R;
  const raAsc = rev(Math.atan2(Math.sin(ascR) * Math.cos(epsR), Math.cos(ascR)) * R2D);
  const H = rev(ramcDeg - raAsc);
  if (H > 0 && H < 180) asc = rev(asc + 180);
  return { asc, mc };
}

class PlacidusError extends Error {}

function cuspLongitude(ramcDeg, epsR, phiR, fractionOf, frac) {
  let dec = 0, ra = ramcDeg * D2R;
  for (let k = 0; k < 50; k++) {
    const cosDsa = -Math.tan(phiR) * Math.tan(dec);
    if (Math.abs(cosDsa) > 1) {
      throw new PlacidusError("semi-arc undefined: |tan(lat)*tan(decl)| = " + Math.abs(cosDsa).toFixed(3) + " > 1");
    }
    const dsa = Math.acos(cosDsa) * R2D;
    const nsa = 180 - dsa;
    const raNewDeg = fractionOf === "day" ? ramcDeg + frac * dsa : ramcDeg + dsa + frac * nsa;
    const raNew = rev(raNewDeg) * D2R;
    let lam = Math.atan2(Math.tan(raNew), Math.cos(epsR));
    if (Math.cos(raNew) < 0) lam += Math.PI;
    const decNew = Math.asin(Math.sin(epsR) * Math.sin(lam));
    const diff = Math.abs(rev((raNew - ra) * R2D + 180) - 180);
    ra = raNew; dec = decNew;
    if (diff < 1e-8) break;
  }
  let lam = Math.atan2(Math.tan(ra), Math.cos(epsR));
  if (Math.cos(ra) < 0) lam += Math.PI;
  return rev(lam * R2D);
}

function placidusCusps(utcMs, lat, lonEast) {
  const { gast, eps } = siderealAndObliquity(utcMs);
  const ramcDeg = rev(gast + lonEast);
  const epsR = eps * D2R, phiR = lat * D2R;
  const { asc, mc } = ascMc(utcMs, lat, lonEast);
  const c11 = cuspLongitude(ramcDeg, epsR, phiR, "day", 1 / 3);
  const c12 = cuspLongitude(ramcDeg, epsR, phiR, "day", 2 / 3);
  const c2 = cuspLongitude(ramcDeg, epsR, phiR, "night", 1 / 3);
  const c3 = cuspLongitude(ramcDeg, epsR, phiR, "night", 2 / 3);
  const ic = rev(mc + 180), desc = rev(asc + 180);
  return [asc, c2, c3, ic, rev(c11 + 180), rev(c12 + 180), desc, rev(c2 + 180), rev(c3 + 180), mc, c11, c12];
}

function equalCusps(asc) {
  return Array.from({ length: 12 }, (_, i) => rev(asc + 30 * i));
}

/* --------------------------------------------------------- time zones */

const dtfCache = {};
function dtf(tz) {
  if (!dtfCache[tz]) {
    dtfCache[tz] = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }
  return dtfCache[tz];
}
/* UTC offset of zone tz at a UTC instant, in ms (local minus UTC). */
function tzOffsetMs(tz, utcMs) {
  const parts = {};
  for (const p of dtf(tz).formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUTC - Math.floor(utcMs / 1000) * 1000;
}
function localParts(tz, utcMs) {
  const parts = {};
  for (const p of dtf(tz).formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  return { y: +parts.year, m: +parts.month, d: +parts.day, H: +parts.hour % 24, Mi: +parts.minute };
}
function offsetLabel(offMs) {
  const totalMin = Math.round(offMs / 60000);
  const sign = totalMin >= 0 ? "+" : "-";
  const a = Math.abs(totalMin);
  return "UTC" + sign + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
}

/* Resolve a local birth date + "HH:MM" in an IANA zone to a UTC instant,
 * applying D10 rules 2 and 3. Returns {utcMs, offsetMs, offsetLabel,
 * status: "ok"|"gap"|"fold", note}. */
function resolveLocalTime(dateStr, hhmm, tz) {
  const [Y, Mo, D] = dateStr.split("-").map(Number);
  const [H, Mi] = hhmm.split(":").map(Number);
  const localAsUTC = Date.UTC(Y, Mo - 1, D, H, Mi);
  const matches = (utcMs) => {
    const p = localParts(tz, utcMs);
    return p.y === Y && p.m === Mo && p.d === D && p.H === H && p.Mi === Mi;
  };
  const offsets = new Set();
  for (const probe of [localAsUTC - 86400000, localAsUTC, localAsUTC + 86400000]) {
    offsets.add(tzOffsetMs(tz, probe - tzOffsetMs(tz, probe)));
  }
  const candidates = [...offsets].map((off) => ({ off, utc: localAsUTC - off }))
                                 .filter((c) => matches(c.utc));
  if (candidates.length >= 2) {
    candidates.sort((a, b) => a.utc - b.utc); // earliest UTC = first occurrence
    const chosen = candidates[0];
    return {
      utcMs: chosen.utc, offsetMs: chosen.off, offsetLabel: offsetLabel(chosen.off),
      status: "fold",
      note: "Local time " + hhmm + " happens twice in " + tz + " (the clocks went back). " +
            "We used the FIRST time it happened, offset " + offsetLabel(chosen.off) +
            "; the second time would be " + offsetLabel(candidates[1].off) + ".",
    };
  }
  if (candidates.length === 1) {
    const c = candidates[0];
    return { utcMs: c.utc, offsetMs: c.off, offsetLabel: offsetLabel(c.off), status: "ok", note: "" };
  }
  // Gap: use the offset in force just before the jump (fold=0 reading).
  const offBefore = tzOffsetMs(tz, localAsUTC - 86400000);
  const utc = localAsUTC - offBefore;
  return {
    utcMs: utc, offsetMs: offBefore, offsetLabel: offsetLabel(offBefore),
    status: "gap",
    note: "Local time " + hhmm + " never existed in " + tz + " (the clocks jumped forward over it). " +
          "We worked the chart out with the offset from just before the jump, " + offsetLabel(offBefore) +
          ", and we are telling you rather than hiding it.",
  };
}

/* ------------------------------------------------------------ display */

function formatPosition(lon) {
  lon = rev(lon);
  const sign = SIGNS[Math.floor(lon / 30)];
  const within = lon - 30 * Math.floor(lon / 30);
  const deg = Math.floor(within);
  const minute = Math.floor((within - deg) * 60); // truncate, never round (D10 rule 6)
  return sign + " " + deg + "°" + String(minute).padStart(2, "0") + "′";
}
function signOf(lon) { return SIGNS[Math.floor(rev(lon) / 30)]; }

function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const span = rev(b - a), pos = rev(lon - a);
    if (pos < span || span === 0) return i + 1;
  }
  return 12;
}

/* -------------------------------------------------------------- chart */

function computeChart(dateStr, hhmm, lat, lonEast, tz) {
  const flags = [], notes = [];
  if (hhmm === null || hhmm === undefined || hhmm === "") {
    const noon = resolveLocalTime(dateStr, "12:00", tz);
    const planets = planetLongitudes(noon.utcMs);
    const range = {};
    for (const t of ["00:00", "12:00", "23:59"]) {
      const r = resolveLocalTime(dateStr, t, tz);
      range[t] = planetLongitudes(r.utcMs).Moon;
    }
    const signs = [...new Set(Object.values(range).map(signOf))];
    flags.push("TIME_UNKNOWN");
    notes.push("Birth time unknown: no rising sign, no houses. Planet positions are shown at midday. " +
      "The Moon that day runs from " + formatPosition(range["00:00"]) + " to " + formatPosition(range["23:59"]) +
      (signs.length > 1 ? ", and it changes sign during the day (" + signs.join(" / ") + "), so both Moon signs are possible." : "."));
    return { planets, asc: null, mc: null, cusps: null, houseSystem: null, flags, notes, resolved: noon, moonDayRange: range, dateStr, hhmm: null, lat, lonEast, tz };
  }
  const res = resolveLocalTime(dateStr, hhmm, tz);
  const planets = planetLongitudes(res.utcMs);
  const { asc, mc } = ascMc(res.utcMs, lat, lonEast);
  if (res.status === "gap") { flags.push("DST_GAP_TIME"); notes.push(res.note); }
  if (res.status === "fold") { flags.push("DST_FOLD_TIME"); notes.push(res.note); }
  let cusps, houseSystem;
  try {
    cusps = placidusCusps(res.utcMs, lat, lonEast);
    houseSystem = "Placidus";
  } catch (e) {
    if (!(e instanceof PlacidusError)) throw e;
    cusps = equalCusps(asc);
    houseSystem = "Equal (fallback)";
    flags.push("PLACIDUS_UNDEFINED");
    notes.push("Placidus houses cannot be drawn for this chart (" + e.message + "). At this far north or south latitude the " +
      "Placidus system breaks down, so Equal houses from the rising sign are shown instead, and we say so on the chart.");
  }
  return { planets, asc, mc, cusps, houseSystem, flags, notes, resolved: res, moonDayRange: null, dateStr, hhmm, lat, lonEast, tz };
}

const Engine = { SIGNS, PLANETS, planetLongitudes, moonPhase, phaseName, ascMc, placidusCusps,
                 equalCusps, PlacidusError, resolveLocalTime, formatPosition, signOf, houseOf, computeChart };
if (typeof module !== "undefined") module.exports = Engine;
if (typeof window !== "undefined") window.Engine = Engine;
