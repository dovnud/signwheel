/* Build the full SignWheel place list from the GeoNames dump.
 *
 * Source: GeoNames cities1000 (all populated places over 1,000 people),
 * countryInfo.txt for country names, admin1CodesASCII.txt for region
 * (state / province) names. GeoNames data is CC BY 4.0; the credit is
 * printed on /credits/ and on the chart pages.
 *
 * Run:  node tools/build-places.js
 * Input:  tools/geonames-src/{cities1000.txt,countryInfo.txt,admin1CodesASCII.txt}
 * Output: js/places/<letter>.json  (one chunk per first letter of the
 *         folded ASCII name, plus "0" for names that do not start a-z)
 *         js/places-data.js        (country table + chunk manifest)
 *
 * Chunk entry format (arrays, for size):
 *   [name, countryIndex, region, lat, lon, zoneIndex]
 * Country and zone names live in tables in js/places-data.js.
 * Entries inside a chunk are sorted by folded name, then population
 * (largest first), so the typeahead can rank by scan order.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "geonames-src");
const OUT = path.join(__dirname, "..", "js", "places");

function fold(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/ø/g, "o").replace(/Ø/g, "O")
          .replace(/æ/g, "ae").replace(/Æ/g, "Ae")
          .replace(/ß/g, "ss").replace(/đ/g, "d").replace(/Đ/g, "D")
          .replace(/ł/g, "l").replace(/Ł/g, "L")
          .toLowerCase();
}

/* country code -> name */
const countries = new Map();
for (const line of fs.readFileSync(path.join(SRC, "countryInfo.txt"), "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const f = line.split("\t");
  if (f[0] && f[4]) countries.set(f[0], f[4]);
}
const countryNames = [...new Set(countries.values())].sort();
const countryIdx = new Map(countryNames.map((n, i) => [n, i]));

/* "CC.ADM1" -> region name */
const regions = new Map();
for (const line of fs.readFileSync(path.join(SRC, "admin1CodesASCII.txt"), "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  if (f[0] && f[1]) regions.set(f[0], f[1]);
}

const rows = fs.readFileSync(path.join(SRC, "cities1000.txt"), "utf8").split("\n");
const zoneNames = [...new Set(rows.map((l) => l.split("\t")[17]).filter(Boolean))].sort();
const zoneIdx = new Map(zoneNames.map((n, i) => [n, i]));
const chunks = new Map(); // letter -> entries
let kept = 0, droppedNoTz = 0, droppedNoCountry = 0;
const seen = new Map(); // dedupe key -> population kept

for (const line of rows) {
  if (!line) continue;
  const f = line.split("\t");
  // geonameid, name, asciiname, alternatenames, lat, lon, fclass, fcode,
  // country, cc2, admin1, admin2, admin3, admin4, population, elevation,
  // dem, timezone, moddate
  const name = f[1], ascii = f[2] || f[1];
  const lat = Math.round(parseFloat(f[4]) * 10000) / 10000;
  const lon = Math.round(parseFloat(f[5]) * 10000) / 10000;
  const cc = f[8];
  const admin1 = f[10];
  const pop = parseInt(f[14], 10) || 0;
  const tz = f[17];
  if (!tz) { droppedNoTz++; continue; }
  const country = countries.get(cc);
  if (!country) { droppedNoCountry++; continue; }
  const region = regions.get(cc + "." + admin1) || "";
  const folded = fold(ascii);
  const key = folded + "|" + cc + "|" + admin1 + "|" + lat.toFixed(2) + "|" + lon.toFixed(2);
  if (seen.has(key) && seen.get(key) >= pop) continue;
  seen.set(key, pop);
  let letter = folded.charAt(0);
  if (!/^[a-z]$/.test(letter)) letter = "0";
  if (!chunks.has(letter)) chunks.set(letter, []);
  chunks.get(letter).push({ folded, pop, entry: [name, countryIdx.get(country), region, lat, lon, zoneIdx.get(tz)] });
  kept++;
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
let totalBytes = 0;
for (const [letter, list] of [...chunks.entries()].sort()) {
  list.sort((a, b) => (a.folded < b.folded ? -1 : a.folded > b.folded ? 1 : b.pop - a.pop));
  const data = list.map((x) => x.entry);
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, letter + ".json"), json);
  manifest[letter] = data.length;
  totalBytes += json.length;
  console.log("chunk " + letter + ": " + data.length + " places, " + (json.length / 1024).toFixed(0) + " KB");
}

const header = "/* SignWheel place data: country table and chunk manifest.\n" +
  " * Built by tools/build-places.js from GeoNames (CC BY 4.0, www.geonames.org).\n" +
  " * Chunk files live in js/places/<letter>.json and are loaded on demand\n" +
  " * by js/places.js. Entry format: [name, countryIndex, region, lat, lon, zoneIndex]. */\n";
fs.writeFileSync(path.join(__dirname, "..", "js", "places-data.js"),
  header + "\"use strict\";\nwindow.PLACES_COUNTRIES = " + JSON.stringify(countryNames) + ";\n" +
  "window.PLACES_ZONES = " + JSON.stringify(zoneNames) + ";\n" +
  "window.PLACES_MANIFEST = " + JSON.stringify(manifest) + ";\n");

console.log("kept " + kept + " places (" + seen.size + " after dedupe), dropped " +
  droppedNoTz + " without a time zone, " + droppedNoCountry + " without a country name");
console.log("total chunk size: " + (totalBytes / 1048576).toFixed(2) + " MB across " + chunks.size + " chunks");
