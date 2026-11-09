/* SignWheel place search.
 *
 * Two layers:
 *  1. The curated starter list (js/cities.js, global CITIES): about 230
 *     major birthplaces, checked by hand. Always in memory, instant.
 *  2. The full world list from GeoNames (CC BY 4.0): about 172,000
 *     populated places, split into one JSON chunk per first letter
 *     (js/places/<letter>.json, built by tools/build-places.js). The
 *     chunk for the first letter of what you type is fetched on
 *     demand and cached; nothing is downloaded until you search.
 *
 * search(query) returns a promise of up to 9 matches: curated matches
 * first (they are hand-checked), then full-list matches, de-duplicated.
 * Ranking inside each layer: name starts with the query, then a word
 * of the name starts with it, then the name contains it, then the
 * region or country contains it. If the full list cannot be fetched
 * (for example the page was opened as a file), the curated list still
 * answers on its own.
 */
(function () {
  "use strict";

  function fold(s) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ø/g, "o").replace(/Ø/g, "O")
      .replace(/æ/g, "ae").replace(/Æ/g, "Ae")
      .replace(/ß/g, "ss").replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/ł/g, "l").replace(/Ł/g, "L")
      .toLowerCase();
  }

  function label(c) {
    return c.name + (c.region ? ", " + c.region : "") + ", " + c.country;
  }

  function score(foldedName, foldedLabel, q) {
    if (foldedName.startsWith(q)) return 0;
    const words = foldedName.split(/[\s\-\/']+/);
    for (const w of words) if (w.startsWith(q)) return 1;
    if (foldedName.includes(q)) return 2;
    if (foldedLabel.includes(q)) return 3;
    return -1;
  }

  function searchIn(list, q, limit) {
    const hits = [];
    for (let i = 0; i < list.length && hits.length < 60; i++) {
      const c = list[i];
      const f = c._f || (c._f = fold(c.name));
      const fl = c._fl || (c._fl = fold(label(c)));
      const s = score(f, fl, q);
      if (s >= 0) hits.push({ c, s, i });
    }
    hits.sort((a, b) => a.s - b.s || a.i - b.i);
    return hits.slice(0, limit).map((h) => h.c);
  }

  const chunkCache = {};
  function loadChunk(letter) {
    if (chunkCache[letter]) return chunkCache[letter];
    chunkCache[letter] = fetch("/js/places/" + letter + ".json")
      .then((r) => { if (!r.ok) throw new Error("chunk " + letter + " " + r.status); return r.json(); })
      .then((rows) => rows.map((a) => ({
        name: a[0],
        country: window.PLACES_COUNTRIES[a[1]],
        region: a[2] || "",
        lat: a[3], lon: a[4],
        tz: window.PLACES_ZONES[a[5]],
      })))
      .catch(() => []);
    return chunkCache[letter];
  }

  function dedupeKey(c) {
    return fold(c.name) + "|" + c.country + "|" + c.lat.toFixed(2) + "|" + c.lon.toFixed(2);
  }

  function search(query) {
    const q = fold((query || "").trim());
    if (q.length < 2) return Promise.resolve([]);
    const local = typeof CITIES !== "undefined" ? searchIn(CITIES, q, 9) : [];
    let letter = q.charAt(0);
    if (!/^[a-z]$/.test(letter)) letter = "0";
    return loadChunk(letter).then((chunk) => {
      const seen = new Set(local.map(dedupeKey));
      const merged = local.slice();
      for (const c of searchIn(chunk, q, 12)) {
        if (merged.length >= 9) break;
        const k = dedupeKey(c);
        if (!seen.has(k)) { seen.add(k); merged.push(c); }
      }
      return merged;
    });
  }

  window.Places = { fold, label, search, loadChunk };
})();
