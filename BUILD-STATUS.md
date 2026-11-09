# SignWheel site: build status

Last updated: 2026-11-08 (build wave 3). Local files only. Nothing is
deployed, no DNS, no Cloudflare changes. The domain purchase runs in
parallel elsewhere; this folder is built as if signwheel.com is ours.

Total HTML pages in the site: 204 (9 wave 1-2 pages, 195 wave 3
library pages). Sitemap: /sitemap.xml with all 204 URLs.
robots.txt allows all and points at the sitemap.

## Design direction (owner's order, 2026-11-08)

The owner ordered: "I want cool cosmic design." This overrides the
earlier warm-paper-first framing where the two conflict. As built:

- Deep night-sky ink ground (#0a0e1c, blue-black, not pure black).
- A generated star field: crisp points drawn as box-shadows on three
  DOM nodes plus a few engraved cross-sparkle stars, deterministic
  seed, no images. Film grain over everything (SVG noise, 5.5%).
- The chart wheel as hero, drawn in SVG like a brass-and-ink
  instrument: fine gold rings and cusp lines, monochrome gold sign
  and planet glyphs (text presentation forced, never colour emoji),
  soft glow on the wheel only.
- Warm gold/amber (#d9a441 family) as the single accent family,
  cream text, display serif (Palatino family stack) for headlines,
  letter-spaced small caps labels, handwritten accent font reserved
  for small margin notes ("worth knowing").
- Anti-slop rules kept in force: no gradient washes, no
  glassmorphism, no generic card grids, no emoji icons. One panel
  style only: flat ink plate with a double-rule brass border.
- Mobile first, static HTML/CSS/JS, no framework, no webfonts.

## What is built

Pages (all complete for this wave):

- `/` home: live "sky right now" wheel computed by the engine in the
  browser, tonight's moon line, how it works, the trust pitch.
- `/birth-chart/`: the tool. Date, time, "I don't know my time"
  option, place typeahead over the bundled city list. Result: SVG
  wheel, settings line printing the time zone and the exact offset
  used, edge-case note box, placements table to the arc-minute,
  big-three readings (Sun, Moon, Rising) from the starter texts,
  then (wave 3) the full reading below, entertainment line and
  accuracy footnote beside the result.
  Save/share with no account: charts saved in localStorage with
  open/delete and a delete-all control; share links encode the
  chart in the URL hash (the part browsers never send to servers),
  with the FINE-PRINT link warning printed next to the button; a
  copy-as-text share card.
- `/moon-phase/`: tonight's moon drawn as an SVG disc, phase name,
  percent lit, Moon sign, plus a 7-day table, all computed live by
  the same engine. This is the cluster-1 hub stub done properly;
  the tools hub content lives on the home page for now.
- `/compatibility/` (wave 2): two birth forms reusing the chart
  form, picker and engine. Computes both charts and every
  cross-chart contact, then gives what the leaders provably lack
  (research E6): a plain-words verdict (where the pair is easy,
  where it rubs, what to do with that), counts by contact kind, the
  full contact table with plain planet meanings, and a share card
  (copy-as-text summary plus a #p= hash link that rebuilds the pair
  reading). NO percentage score anywhere, by design: the verdict
  says so on the page. Readings come from 30 original texts
  (`js/texts-synastry.js`: Sun-Moon, Sun-Sun, Moon-Moon, Venus-Mars,
  Venus-Venus, Mars-Mars, Sun-Venus, Moon-Venus, Mercury-Mercury,
  Sun-Mars, each in joined / easy / hard form), conditional words,
  no outcome promises.
- `/ephemeris/` (wave 2): the cluster-1 checkable-accuracy page.
  A date picker (today by default) shows all ten planet positions
  at midday UTC computed live by the engine, with a retrograde flag
  worked out by sampling the next day's position (verified against
  known periods: Mercury and Venus flag correctly for March 2025),
  plus a 7-day table of Sun and Moon positions with phase names.
- `/about/`: "How we calculate", the anti-scam trust page: method,
  measured accuracy table, how to check us against astro.com, the
  honest edges (offset printed, clock-change flags, far-north
  fallback labelled, no guessing without a time, no rounding across
  a sign boundary), and the accuracy-vs-meaning boundary.
- `/privacy/`: privacy policy, true of this build (no cookies set,
  no analytics, no ads in this version), the locked one-sentence
  promise leads the footer of every page.
- `/disclaimer/`: entertainment disclaimer per FINE-PRINT section 2.
- `/credits/`: VSOP87 (Bureau des Longitudes) via astronomia (MIT),
  Schlyter algorithms (Moon, Pluto), IANA tz database, NASA JPL
  DE440 as the accuracy reference, Swiss Ephemeris credited as a
  test reference only. Place data is now GeoNames under CC BY 4.0
  and the credit is printed in its required form on /credits/, on
  the chart page, and in every footer (wave 2).

Engine and data (`js/`):

- `engine.js`: full chart computation in the browser. Tropical
  zodiac, Placidus with Equal fallback, sidereal time, precession
  and nutation to apparent longitude, DST gap/fold resolution from
  the browser's IANA time zone data, all spec D10 edge behaviour.
- `vsop87.js` (30 KB): VSOP87B series (Bureau des Longitudes) for
  Mercury to Neptune and the Earth, shortened by `tools/build-vsop87.js`
  to every term that can move a position by about half an arcsecond
  or more (927 of 35,080 terms). Planets are computed at the
  light-time-corrected instant, the way the reference does.
- Moon: Paul Schlyter's compact algorithm with full perturbations.
- Pluto: Schlyter series plus a small correction fitted by us to
  JPL DE440 samples 1920-2030 (fit residual worst 3.3 arc-minutes;
  final measured worst below).
- `cities.js`: 230 major birthplaces, name/country/lat/lon/IANA
  zone, including every test-case city. Still the instant first
  layer of place search (hand-checked results rank first).
- Place list, full (wave 2): `tools/build-places.js` turns the
  GeoNames cities1000 dump (source kept in `tools/geonames-src/`)
  into `js/places/<letter>.json`: 171,811 populated places over
  1,000 people, name / country / region / lat / lon / IANA zone,
  8.5 MB across 27 letter chunks (largest single chunk about
  1.1 MB before the gzip any static host applies). `js/places.js`
  fetches only the chunk for the first letter being typed, caches
  it, merges and de-duplicates against the curated list;
  `js/place-picker.js` is the shared typeahead wiring now used by
  the birth chart form and both compatibility forms. If a chunk
  cannot be fetched, search degrades to the curated list alone.
- `synastry.js` + `texts-synastry.js` (wave 2): cross-aspect
  computation (five standard angles; orbs 8/8/6/6/4 degrees, plus 2
  when the Sun or Moon is involved) and the 30 written pair texts
  plus plain planet meanings and plain aspect names.
- `texts-starter.js`: 36 original plain-word starter readings
  (Sun, Moon, Rising x 12 signs), conditional language, no health,
  money, legal or outcome claims, no em dashes.
- `wheel.js`: the SVG wheel renderer. Orientation verified against
  test chart N1: Libra rising on the left, Cancer MC at the top,
  afternoon Sun in the 9th house upper right.
- `stars.js`, `chart-ui.js`: sky field; form/typeahead/result/
  save/share logic.

## Engine accuracy: measured, not promised

Check: `node tools/check-engine.js` in this folder. It runs the ten
standard cases N1-N10 (from `../experiments/TEST-CASES.md`) through
the browser engine and diffs every value against
`tools/reference-n1-n10.json`, generated from the proven Python
prototype (NASA JPL DE440 via Skyfield, itself matched to Swiss
Ephemeris on 100 charts in `../ENGINE-PROOF.md`). To regenerate the
reference: run the prototype on the N1-N10 inputs (see
`tools/check-engine.js` header of the experiment log; the JSON is
committed, regeneration is only needed if the case set changes).

Latest run, worst differences vs the JPL reference:

| Body | Worst |
|---|---|
| Sun | 0.13 arc-minutes |
| Mercury | 0.41 |
| Venus | 0.25 |
| Mars | 0.34 |
| Jupiter | 0.36 |
| Saturn | 0.38 |
| Uranus | 0.37 |
| Neptune | 0.36 |
| Pluto | 1.57 |
| Moon | 3.12 |
| Asc / MC / cusps | 0.45 or less |

Sign flips: 0. Offset, DST status and house system matched the
reference on all 10 cases. Verdict: PASS, well inside the v1
tolerance (5 arc-minutes planets, 10 Moon). The Moon is the least
precise line, as expected from a compact algorithm; the number is
published on the About page rather than hidden.

Route history, for the record: a compact hand algorithm (Schlyter
for all planets) was tried first and failed honestly on the outer
planets (Neptune off by about 200 arc-minutes). Fitted corrections
closed most gaps but Saturn stayed near 10 arc-minutes, so the
planets moved to real VSOP87B data, which is what ships.

## Browser QA (headless Chromium, phone viewport 420px)

- Home: hero wheel renders, moon line computes.
- Chart form end to end for N1: typeahead pick, settings line
  (UTC-04:00, Placidus), Sun Gemini 24°23' exactly as the reference,
  big-three reading renders.
- N4 far north: Equal fallback note shown. N6 DST gap: note shown
  with the reading used. N9 unknown time: no houses, Moon day range
  named in Sagittarius to Capricorn.
- Save flow: chart saved, listed, reopenable. Share flow: hash link
  copied, and a fresh page opened from the link rebuilds the chart.
- Moon page: disc, phase name and week table render.
- Only console error seen was the favicon 404, fixed with an inline
  SVG favicon on every page.

## Wave 2 browser QA (headless Chromium, phone viewport 420px)

Driver: `tools/qa-wave2.js` (puppeteer-core + the Playwright-cache
Chromium, local static server). 25 of 25 checks passed:

- Compatibility end to end for the fixed S1 pair (N1: 1990-06-15
  14:30 New York, named Sam; partner: 1988-09-22 09:00 Boston,
  named Jo): both places picked from the list, both wheels drawn,
  verdict story reads "found 26 contacts: 5 joined, 10 flowing or
  friendly, and 11 with friction", all three written sections
  present (flows, joined, rubs), named headings, full contact
  table, no percentage score anywhere, share card copies as text,
  and the #p= share link rebuilds the whole pair reading on a
  fresh page load.
- Ephemeris renders: ten planet rows with motion flags, seven day
  Sun/Moon table, settings line, and changing the date recomputes.
- Place proof: typing "Marfa" offers Marfa, Texas, United States
  (30.31°N, 104.02°W, America/Chicago), picked and confirmed.
  Marfa is NOT in the old 230-city starter list (checked: zero
  matches in js/cities.js); it comes from the GeoNames chunks.
- Birth chart regression after the picker refactor: N1 still
  draws with Sun Gemini 24°23' exactly, UTC-04:00, Placidus.
- No page errors on any of the three pages.
- `node tools/check-engine.js` re-run after the place change:
  PASS, same worst numbers as wave 1 (Moon 3.12 arc-minutes,
  Pluto 1.57, zero sign flips, zero tolerance misses).

## Wave 3: full chart reading + the library as pages

- FULL READING in the chart result (`js/chart-ui.js`): under the
  big three (kept, same words), a "Your whole chart, placement by
  placement" section reads every placement that has a written
  text: all ten planets in their signs (Sun and Moon from the
  starter texts, Mercury to Pluto from `js/texts-wave1.js`), each
  block headed "Venus in Scorpio" with a sign, degree and house
  line, plus planet-in-house readings for Sun, Moon, Mercury,
  Venus and Mars when the chart has houses. Unknown-time charts
  get the sign readings only, with the honest notes kept (no
  houses; a Moon that changes sign that day shows both readings,
  as the big three already did). Every reading block links to its
  own library page. Opening a saved chart runs the same render,
  so a saved chart now lands on its full reading: the saved-chart
  reading view gap is closed.
- LIBRARY PAGES, generated by `tools/build-library.js` from the
  same two text files (real static HTML, not JS-rendered):
  - `/planets/<planet>/<sign>/`: 120 planet-in-sign pages. Each
    carries a plain-words framing of what a planet in a sign is,
    the text verbatim, a "read yours" plate naming the placement
    and linking the chart tool, and a next-clicks strip (the same
    planet in the other 11 signs, the other 9 planets in this
    sign, the sign page, the tool, the hubs).
  - `/houses/<planet>/<n>/`: 60 planet-in-house pages for the
    five planets with house texts, same pattern (strip: the same
    planet in the other 11 houses, the other 4 planets in this
    house, the tool, the hubs). The page states plainly that
    houses need a birth time.
  - `/signs/<sign>/`: 12 sign pages assembled honestly from what
    exists: the Sun, Moon and rising starter readings for the
    sign, a note that the long sign portrait is still being
    written, and links to all ten planet-in-sign pages for the
    sign. No new long texts were invented for these.
  - Hubs: `/library/` (the three families), `/planets/` (all 120
    readings grouped by planet), `/houses/` (all 60 grouped by
    planet, plus the twelve house topics in plain words).
  - Every existing page gained a Library link in header and
    footer nav, so no library page is an orphan: home to library
    hub to family hub to any reading is three clicks.
  - `sitemap.xml` covers all 204 pages; `robots.txt` allows all
    and names the sitemap.
- Wave 3 QA (`tools/qa-wave3.js`, headless Chromium, 420px phone
  width, its own static server): 28 of 28 checks passed. The
  Venus in Scorpio page, Sun in the ninth house page, Gemini sign
  page and library hub all render with their texts, framings and
  strips (24, 18 and 14 strip links respectively). The N1 chart
  renders exactly 18 reading blocks: big three first (Sun in
  Gemini, Moon in Pisces, Rising in Libra), then all ten planets
  in sign, then five house readings (Sun ninth, Moon sixth,
  Mercury eighth, Venus eighth, Mars sixth). An unknown-time
  Berlin chart renders 13 blocks, none of them a house reading.
  No page errors. `node tools/check-engine.js` re-run: PASS,
  unchanged numbers (Moon worst 3.12 arc-minutes, Pluto 1.57,
  zero sign flips).

## Not built yet (planned, in spec order)

- Daily transits ("your daily sky") and its email layer: first
  expansion per the red-teamed launch order, after the friction
  layer proves itself.
- The rest of cluster 1 routes (moon sign calendar, void-of-course,
  Mercury retrograde dates as their own pages).
- Planet-in-house pages for Jupiter, Saturn, Uranus, Neptune and
  Pluto (60 more): the texts are not written yet, so the pages do
  not exist; the houses hub says so.
- The long sign archetype portraits (the 12 sign pages currently
  assemble the finished Sun, Moon and rising pieces and say the
  portrait is still being written).
- Aspect pages (up to 225, in demand order), the compatibility
  pair library (78), Sun x Ascendant pages (144), birthdays (366),
  calendar depth, famous charts: later clusters per spec section 3.2.
- The interpretation library beyond the 192 chart texts and the
  30 synastry texts (about 1,160 pieces planned in the spec),
  including the per-sign Moon-day-range handling pages.
- A typed-coordinates fallback for the rare birthplace missing
  even from the full list.

## Blockers and pre-launch gates

- Domain: signwheel.com purchase is in flight in parallel (owner
  approved, Cloudflare Registrar). Nothing here is deployed.
- Legal: `/privacy/` and `/disclaimer/` are drafted from the locked
  FINE-PRINT texts and are accurate for this build, but the spec
  requires attorney review before public launch, and any paid
  reports still require the 50-state fortune-telling survey first.
  No paid feature exists in this build.
- The legal operator name and contact details for the privacy page
  are not filled in yet; launch needs them.
- No analytics or ads in this build by design; if added later, the
  privacy page must change first (it says so, on the page).
