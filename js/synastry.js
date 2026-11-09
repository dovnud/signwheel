/* SignWheel synastry: cross-chart aspects between two natal charts.
 *
 * Pure computation, no DOM: given two planet-longitude maps from
 * Engine.computeChart, find every contact between one person's
 * planets and the other's, using the five standard aspect angles and
 * orbs that widen when the Sun or Moon is involved (the luminaries
 * carry the widest orbs in standard practice).
 *
 * Kinds: conjunction = "joined"; trine and sextile = "easy";
 * square and opposition = "hard". There is deliberately no score:
 * the reading is a verdict in words, assembled by the page from the
 * counts and the strongest written contacts (spec section 2, item 3).
 */
(function () {
  "use strict";

  const ASPECTS = [
    { key: "joined", angle: 0, kind: "joined", orb: 8 },
    { key: "sextile", angle: 60, kind: "easy", orb: 4 },
    { key: "square", angle: 90, kind: "hard", orb: 6 },
    { key: "trine", angle: 120, kind: "easy", orb: 6 },
    { key: "opposition", angle: 180, kind: "hard", orb: 8 },
  ];
  const LUMINARY_BONUS = 2;

  function separation(a, b) {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function pairKey(p1, p2, order) {
    return order.indexOf(p1) <= order.indexOf(p2) ? p1 + "|" + p2 : p2 + "|" + p1;
  }

  /* planetsA / planetsB: {Sun: lon, ...}. order: Engine.PLANETS. */
  function crossAspects(planetsA, planetsB, order) {
    const out = [];
    for (const pa of order) {
      for (const pb of order) {
        const sep = separation(planetsA[pa], planetsB[pb]);
        for (const asp of ASPECTS) {
          let limit = asp.orb;
          if (pa === "Sun" || pa === "Moon" || pb === "Sun" || pb === "Moon") limit += LUMINARY_BONUS;
          const orb = Math.abs(sep - asp.angle);
          if (orb <= limit) {
            out.push({ a: pa, b: pb, aspect: asp.key, kind: asp.kind, orb, sep });
            break; // a pair of planets can only be in one aspect
          }
        }
      }
    }
    out.sort((x, y) => x.orb - y.orb);
    return out;
  }

  function counts(aspects) {
    const c = { joined: 0, easy: 0, hard: 0, total: aspects.length };
    for (const a of aspects) c[a.kind]++;
    return c;
  }

  /* The written contacts: aspects whose planet pair has a text, in
   * orb order, split by kind, strongest first. */
  function written(aspects, texts, order) {
    const byKind = { joined: [], easy: [], hard: [] };
    for (const a of aspects) {
      const key = pairKey(a.a, a.b, order);
      if (texts[key]) byKind[a.kind].push({ ...a, key, text: texts[key][a.kind] });
    }
    return byKind;
  }

  const Synastry = { ASPECTS, separation, pairKey, crossAspects, counts, written };
  if (typeof module !== "undefined") module.exports = Synastry;
  if (typeof window !== "undefined") window.Synastry = Synastry;
})();
