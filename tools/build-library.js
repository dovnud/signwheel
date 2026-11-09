/* SignWheel library generator (wave 3).
 *
 * Builds the combinatorial reading library as real static HTML from
 * the same text data the chart result uses (js/texts-starter.js and
 * js/texts-wave1.js), so one text lives on three surfaces: its own
 * page, the chart result, and later the paid report (spec section 3.3).
 *
 * Families generated:
 *   /planets/<planet>/<sign>/   120  planet in sign (10 x 12)
 *   /houses/<planet>/<n>/        60  planet in house (5 x 12)
 *   /signs/<sign>/               12  sign pages, assembled from the
 *                                    Sun, Moon and rising starter
 *                                    texts plus doorways onward
 *   /planets/                     1  family hub
 *   /houses/                      1  family hub
 *   /library/                     1  library index hub
 * Plus sitemap.xml (the whole site) and robots.txt (allow all).
 *
 * Run:  node tools/build-library.js
 * Local files only. Nothing here deploys anything.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STARTER = require(path.join(ROOT, "js", "texts-starter.js"));
const WAVE1 = require(path.join(ROOT, "js", "texts-wave1.js"));

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ELEMENTS = { Aries: "fire", Taurus: "earth", Gemini: "air", Cancer: "water",
  Leo: "fire", Virgo: "earth", Libra: "air", Scorpio: "water",
  Sagittarius: "fire", Capricorn: "earth", Aquarius: "air", Pisces: "water" };

/* The planet's job, in the same plain words the texts themselves use. */
const PLANETS = [
  { name: "Sun", slug: "sun", job: "identity, vitality, and the wish to be seen" },
  { name: "Moon", slug: "moon", job: "feelings, comfort, and needs" },
  { name: "Mercury", slug: "mercury", job: "thinking, speaking, and learning" },
  { name: "Venus", slug: "venus", job: "affection, attraction, taste, and closeness" },
  { name: "Mars", slug: "mars", job: "drive, desire, temper, and action" },
  { name: "Jupiter", slug: "jupiter", job: "growth, confidence, and the search for meaning" },
  { name: "Saturn", slug: "saturn", job: "effort, limits, patience, and experience" },
  { name: "Uranus", slug: "uranus", job: "change, independence, and fresh perspectives" },
  { name: "Neptune", slug: "neptune", job: "imagination, sympathy, and dreams" },
  { name: "Pluto", slug: "pluto", job: "deep change and candor about power" },
];
const HOUSE_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars"];

const ORD_WORD = ["", "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
const HOUSE_TOPICS = ["",
  "how you come across, and how you begin things",
  "money, belongings, and what you value",
  "everyday talk, learning, siblings, and short trips",
  "home, family, and your roots",
  "fun, romance, making things, and children",
  "daily work, routines, and looking after yourself",
  "close partners, in love and in work",
  "what you share with others: money, trust, and deep change",
  "travel, study, beliefs, and the bigger picture",
  "career, reputation, and what you are known for",
  "friends, groups, and hopes for the future",
  "rest, privacy, and the parts of life kept out of sight"];
function ordSuffix(n) {
  if (n === 1) return "1st"; if (n === 2) return "2nd"; if (n === 3) return "3rd";
  return n + "th";
}

function signText(planetName, sign) {
  if (planetName === "Sun") return STARTER.sun[sign];
  if (planetName === "Moon") return STARTER.moon[sign];
  return WAVE1.sign[planetName.toLowerCase()][sign];
}
function houseText(planetName, n) {
  return WAVE1.house[planetName.toLowerCase()][String(n)];
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
function excerpt(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "...";
}
const slug = (s) => s.toLowerCase();

/* ------------------------------------------------------------ shell */

const FAVICON = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'12\' fill=\'none\' stroke=\'%23d9a441\' stroke-width=\'2\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'3\' fill=\'%23d9a441\'/%3E%3C/svg%3E">';

function pageShell({ title, description, body, wide }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(description)}">
${FAVICON}
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="starfield" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>

<header class="site">
  <div class="wrap">
    <a class="wordmark" href="/">Sign<span class="wheel-o">Wheel</span><small>Your chart, in plain words</small></a>
    <nav class="main">
      <a href="/birth-chart/">Birth Chart</a>
      <a href="/compatibility/">Compatibility</a>
      <a href="/moon-phase/">Moon Phase</a>
      <a href="/ephemeris/">Ephemeris</a>
      <a href="/library/" aria-current="page">Library</a>
      <a href="/about/">How We Calculate</a>
      <a href="/privacy/">Privacy</a>
    </nav>
  </div>
</header>

<main>
  <div class="wrap${wide ? "" : " narrow"}">
${body}
  </div>
</main>

<footer class="site">
  <div class="wrap">
    <p class="promise">Your birth details are calculated and saved on your own device; we never ask for an account or an email, and we hold no copy.</p>
    <nav>
      <a href="/birth-chart/">Birth Chart</a>
      <a href="/compatibility/">Compatibility</a>
      <a href="/moon-phase/">Moon Phase</a>
      <a href="/ephemeris/">Ephemeris</a>
      <a href="/library/">Library</a>
      <a href="/about/">How We Calculate</a>
      <a href="/privacy/">Privacy</a>
      <a href="/disclaimer/">Disclaimer</a>
      <a href="/credits/">Credits</a>
    </nav>
    <p class="fineprint">For entertainment and reflection only. SignWheel does not give medical, mental health, legal, financial, or other professional advice, and a chart is not a prediction of what will happen.</p>
    <p class="fineprint">Planetary data: VSOP87, Bureau des Longitudes, via the astronomia package (MIT). Accuracy checked against NASA JPL DE440 values. Place data: GeoNames (www.geonames.org), Creative Commons Attribution 4.0; see Credits.</p>
  </div>
</footer>

<script src="/js/stars.js"></script>
</body>
</html>
`;
}

function toolPlate(heading, text) {
  return `    <div class="plate">
      <h2>${esc(heading)}</h2>
      <p>${esc(text)}</p>
      <div class="cta-row"><a class="btn" href="/birth-chart/">Draw my free birth chart</a></div>
      <p class="fineprint">Free, in your browser, with no account and no email. Your birth details are not saved on our servers.</p>
    </div>`;
}

function nextClicks(groups) {
  /* groups: [{label, links: [{href, text}]}] */
  let html = '    <section class="next-clicks">\n      <h2>Keep reading</h2>\n';
  for (const g of groups) {
    html += `      <p class="nc-label">${esc(g.label)}</p>\n`;
    html += '      <p class="nc-links">' +
      g.links.map((l) => `<a href="${l.href}">${esc(l.text)}</a>`).join(" &middot; ") +
      "</p>\n";
  }
  html += "    </section>";
  return html;
}

const urls = ["/", "/birth-chart/", "/compatibility/", "/moon-phase/", "/ephemeris/",
  "/about/", "/privacy/", "/disclaimer/", "/credits/"];
function writePage(urlPath, html) {
  const dir = path.join(ROOT, urlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push("/" + urlPath + "/");
}

/* --------------------------------------------- planet in sign pages */

let countSign = 0;
for (const planet of PLANETS) {
  for (const sign of SIGNS) {
    const text = signText(planet.name, sign);
    const othersHere = PLANETS.filter((p) => p.name !== planet.name)
      .map((p) => ({ href: `/planets/${p.slug}/${slug(sign)}/`, text: p.name }));
    const body = `    <p class="crumbs"><a href="/library/">Library</a> &middot; <a href="/planets/">Planets in signs</a> &middot; ${planet.name} in ${sign}</p>
    <p class="label" style="margin-top:22px">Planet in sign</p>
    <h1>${planet.name} in ${sign}</h1>
    <p class="lede">What this placement means in a birth chart, in plain words.</p>
    <p>A birth chart is a map of the sky at the moment and place someone was born. Every planet in the chart stands for one part of life. ${planet.name} stands for ${planet.job}. The sign a planet sits in colours how that part of a person tends to work, a bit like the mood it works in.</p>
    <p>Below is the reading for ${planet.name} in ${sign}. It is the same text that appears inside a <a href="/birth-chart/">chart result</a> when this placement shows up there, word for word. One placement is never the whole person: a full chart holds ten of them, and the houses besides.</p>
    <div class="plate reading">
      <p>${esc(text)}</p>
    </div>
${toolPlate(`Is ${planet.name} in ${sign} in your chart?`,
      `There is one way to know: draw your own chart. If ${planet.name} was in ${sign} when and where you were born, this reading is one of yours, and your chart result will show it alongside the other nine planets.`)}
${nextClicks([
  { label: `${planet.name} in the other signs`, links: SIGNS.filter((s) => s !== sign).map((s) => ({ href: `/planets/${planet.slug}/${slug(s)}/`, text: s })) },
  { label: `The other planets in ${sign}`, links: othersHere },
  { label: "Go deeper", links: [
    { href: `/signs/${slug(sign)}/`, text: `${sign}, the sign itself` },
    { href: "/birth-chart/", text: "Your free birth chart" },
    { href: "/planets/", text: "All planets in signs" },
    { href: "/library/", text: "The whole library" },
  ] },
])}`;
    writePage(`planets/${planet.slug}/${slug(sign)}`, pageShell({
      title: `${planet.name} in ${sign} | SignWheel`,
      description: `${planet.name} in ${sign}, explained in plain words. ` + excerpt(text, 120),
      body,
    }));
    countSign++;
  }
}

/* -------------------------------------------- planet in house pages */

let countHouse = 0;
for (const planetName of HOUSE_PLANETS) {
  const planet = PLANETS.find((p) => p.name === planetName);
  for (let n = 1; n <= 12; n++) {
    const text = houseText(planetName, n);
    const body = `    <p class="crumbs"><a href="/library/">Library</a> &middot; <a href="/houses/">Planets in houses</a> &middot; ${planetName} in the ${ORD_WORD[n]} house</p>
    <p class="label" style="margin-top:22px">Planet in house</p>
    <h1>${planetName} in the ${ORD_WORD[n]} house</h1>
    <p class="lede">What this placement means in a birth chart, in plain words.</p>
    <p>The wheel of a birth chart is cut into twelve sections called houses. Each house stands for one area of life, and the ${ORD_WORD[n]} house covers ${HOUSE_TOPICS[n]}. A planet in a house brings its part of life into that area. ${planetName} stands for ${planet.job}, so ${planetName} in the ${ORD_WORD[n]} house puts that part of a person into the ${ORD_WORD[n]} house's ground.</p>
    <p>Below is the reading, the same text that appears inside a <a href="/birth-chart/">chart result</a> when this placement shows up there, word for word. Houses need a birth time: without one, a chart has no houses, and this reading does not apply.</p>
    <div class="plate reading">
      <p>${esc(text)}</p>
    </div>
${toolPlate(`Which house is your ${planetName} in?`,
      `Draw your own chart and find out. Your chart result works out the houses from your birth time and place, and shows this reading in place if your ${planetName} falls in the ${ORD_WORD[n]} house.`)}
${nextClicks([
  { label: `${planetName} in the other houses`, links: Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m !== n).map((m) => ({ href: `/houses/${planet.slug}/${m}/`, text: `the ${ORD_WORD[m]} house` })) },
  { label: `The other planets in the ${ORD_WORD[n]} house`, links: HOUSE_PLANETS.filter((p) => p !== planetName).map((p) => ({ href: `/houses/${slug(p)}/${n}/`, text: p })) },
  { label: "Go deeper", links: [
    { href: "/birth-chart/", text: "Your free birth chart" },
    { href: "/houses/", text: "All planets in houses" },
    { href: "/library/", text: "The whole library" },
  ] },
])}`;
    writePage(`houses/${planet.slug}/${n}`, pageShell({
      title: `${planetName} in the ${ORD_WORD[n]} house | SignWheel`,
      description: `${planetName} in the ${ORD_WORD[n]} house, explained in plain words. The ${ORD_WORD[n]} house covers ${HOUSE_TOPICS[n]}. ` + excerpt(text, 90),
      body,
    }));
    countHouse++;
  }
}

/* -------------------------------------------------------- sign pages */

let countSignPages = 0;
for (const sign of SIGNS) {
  const body = `    <p class="crumbs"><a href="/library/">Library</a> &middot; The signs &middot; ${sign}</p>
    <p class="label" style="margin-top:22px">The signs</p>
    <h1>${sign}</h1>
    <p class="lede">${sign} is one of the three ${ELEMENTS[sign]} signs. This page gathers everything SignWheel has written about ${sign} so far.</p>
    <p>A longer portrait of the sign is still being written. Rather than pad this page, here are the finished pieces: the Sun, Moon and rising readings for ${sign}, exactly as they appear inside a <a href="/birth-chart/">chart result</a>, and a doorway to every planet in ${sign}.</p>
    <div class="reading">
      <div class="reading-block">
        <h2>Sun in ${sign}</h2>
        <p class="pos-line">Your core character and where your energy comes from.</p>
        <p>${esc(STARTER.sun[sign])}</p>
      </div>
      <div class="reading-block">
        <h2>Moon in ${sign}</h2>
        <p class="pos-line">Your feelings and what settles you.</p>
        <p>${esc(STARTER.moon[sign])}</p>
      </div>
      <div class="reading-block">
        <h2>Rising in ${sign}</h2>
        <p class="pos-line">The face you show first, before people know you.</p>
        <p>${esc(STARTER.rising[sign])}</p>
      </div>
    </div>
    <h2>Every planet in ${sign}</h2>
    <p>Each planet colours ${sign} differently. The full set of readings for this sign:</p>
    <ul class="link-list">
${PLANETS.map((p) => `      <li><a href="/planets/${p.slug}/${slug(sign)}/">${p.name} in ${sign}</a> <span class="dim">${p.job}</span></li>`).join("\n")}
    </ul>
${toolPlate(`Where does ${sign} sit in your chart?`,
      `Your own chart shows which planets, if any, were in ${sign} when you were born, and which house ${sign} rules for you. It takes a minute, and it is free.`)}
${nextClicks([
  { label: "The other signs", links: SIGNS.filter((s) => s !== sign).map((s) => ({ href: `/signs/${slug(s)}/`, text: s })) },
  { label: "Go deeper", links: [
    { href: "/birth-chart/", text: "Your free birth chart" },
    { href: "/planets/", text: "All planets in signs" },
    { href: "/library/", text: "The whole library" },
  ] },
])}`;
  writePage(`signs/${slug(sign)}`, pageShell({
    title: `${sign} | SignWheel`,
    description: `${sign}, one of the three ${ELEMENTS[sign]} signs: the Sun, Moon and rising readings for ${sign} in plain words, and every planet in ${sign}.`,
    body,
  }));
  countSignPages++;
}

/* ------------------------------------------------------------ hubs */

const planetsHubBody = `    <p class="crumbs"><a href="/library/">Library</a> &middot; Planets in signs</p>
    <p class="label" style="margin-top:22px">The library</p>
    <h1>Planets in signs</h1>
    <p class="lede">One hundred and twenty readings: every planet in every sign, in plain words.</p>
    <p>A planet in a sign is the basic building block of a birth chart reading. The planet says which part of life is speaking; the sign colours how it speaks. These are the same texts that appear inside a <a href="/birth-chart/">chart result</a>, each on its own page so it can be read, saved and shared on its own.</p>
${PLANETS.map((p) => `    <h2 id="${p.slug}">${p.name}</h2>
    <p class="small">${p.name} stands for ${p.job}.</p>
    <p class="nc-links" style="font-size:15px; line-height:1.95">${SIGNS.map((s) => `<a href="/planets/${p.slug}/${slug(s)}/" style="color:var(--cream-dim); text-decoration:none; border-bottom:1px solid var(--line-soft)">${s}</a>`).join(" &middot; ")}</p>`).join("\n")}
${toolPlate("Read your own placements",
      "The library is the general reading. Your chart picks out the ten placements that are actually yours, in sign and house, and reads them together.")}
${nextClicks([
  { label: "The rest of the library", links: [
    { href: "/houses/", text: "Planets in houses" },
    { href: "/library/", text: "The whole library" },
    ...SIGNS.map((s) => ({ href: `/signs/${slug(s)}/`, text: s })),
  ] },
])}`;
writePage("planets", pageShell({
  title: "Planets in Signs: All 120 Readings | SignWheel",
  description: "Every planet in every sign, explained in plain words: 120 readings, the same texts that appear inside a SignWheel birth chart result.",
  body: planetsHubBody, wide: true,
}));

const housesHubBody = `    <p class="crumbs"><a href="/library/">Library</a> &middot; Planets in houses</p>
    <p class="label" style="margin-top:22px">The library</p>
    <h1>Planets in houses</h1>
    <p class="lede">Sixty readings: the Sun, Moon, Mercury, Venus and Mars in each of the twelve houses.</p>
    <p>A sign says how a planet works; a house says where in life it does its work. House readings need a birth time, because the houses turn with the hours. These are the same texts that appear inside a <a href="/birth-chart/">chart result</a> when the placement shows up there. Readings for the other five planets in houses are still being written and will join this page as they are finished.</p>
${HOUSE_PLANETS.map((name) => {
  const p = PLANETS.find((x) => x.name === name);
  return `    <h2 id="${p.slug}">${name}</h2>
    <p class="small">${name} stands for ${p.job}.</p>
    <p class="nc-links" style="font-size:15px; line-height:1.95">${Array.from({ length: 12 }, (_, i) => i + 1).map((n) => `<a href="/houses/${p.slug}/${n}/" style="color:var(--cream-dim); text-decoration:none; border-bottom:1px solid var(--line-soft)">the ${ORD_WORD[n]} house</a>`).join(" &middot; ")}</p>`;
}).join("\n")}
    <h2>The twelve houses</h2>
    <ul class="link-list">
${Array.from({ length: 12 }, (_, i) => i + 1).map((n) => `      <li>The ${ORD_WORD[n]} house <span class="dim">covers ${HOUSE_TOPICS[n]}</span></li>`).join("\n")}
    </ul>
${toolPlate("Which houses are yours?",
      "Your chart works out your houses from your birth time and place, and reads each planet in its sign and its house together.")}
${nextClicks([
  { label: "The rest of the library", links: [
    { href: "/planets/", text: "Planets in signs" },
    { href: "/library/", text: "The whole library" },
    { href: "/birth-chart/", text: "Your free birth chart" },
  ] },
])}`;
writePage("houses", pageShell({
  title: "Planets in Houses: 60 Readings | SignWheel",
  description: "The Sun, Moon, Mercury, Venus and Mars in each of the twelve houses, explained in plain words: 60 readings from the SignWheel library.",
  body: housesHubBody, wide: true,
}));

const libraryBody = `    <p class="label" style="margin-top:34px">The library</p>
    <h1>Readings, placement by placement.</h1>
    <p class="lede">Every reading on SignWheel lives here on its own page, free to read with no account. The same texts appear inside your chart result when the placement is yours.</p>
    <p>A birth chart is read one placement at a time: a planet in a sign, a planet in a house. This library holds the finished pieces, organised the way a chart is organised. It grows in the open, family by family, and unfinished families say so rather than padding themselves out.</p>
    <div class="plate">
      <h2>Planets in signs</h2>
      <p>One hundred and twenty readings: what each planet means in each sign. Start with the planet you are curious about, or browse the whole family.</p>
      <p class="nc-links" style="font-size:15px; line-height:1.95">${PLANETS.map((p) => `<a href="/planets/#${p.slug}" style="color:var(--cream-dim); text-decoration:none; border-bottom:1px solid var(--line-soft)">${p.name}</a>`).join(" &middot; ")}</p>
      <div class="cta-row"><a class="btn ghost" href="/planets/">Browse planets in signs</a></div>
    </div>
    <div class="plate">
      <h2>Planets in houses</h2>
      <p>Sixty readings: the Sun, Moon, Mercury, Venus and Mars in the twelve houses, the areas of life a chart is divided into. The other five planets are still being written.</p>
      <div class="cta-row"><a class="btn ghost" href="/houses/">Browse planets in houses</a></div>
    </div>
    <div class="plate">
      <h2>The signs</h2>
      <p>One page per sign, gathering its Sun, Moon and rising readings and every planet placed in it.</p>
      <p class="nc-links" style="font-size:15px; line-height:1.95">${SIGNS.map((s) => `<a href="/signs/${slug(s)}/" style="color:var(--cream-dim); text-decoration:none; border-bottom:1px solid var(--line-soft)">${s}</a>`).join(" &middot; ")}</p>
    </div>
${toolPlate("From reading to your own chart",
      "The library gives the general reading for each placement. Your birth chart picks out the placements that are yours and reads them together, in your browser, with no account.")}`;
writePage("library", pageShell({
  title: "The Reading Library | SignWheel",
  description: "The SignWheel library: planets in signs, planets in houses, and the twelve signs, every reading in plain words and free to read.",
  body: libraryBody,
}));

/* ------------------------------------------------- sitemap + robots */

const BASE = "https://signwheel.com";
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

console.log("planet-in-sign pages:", countSign);
console.log("planet-in-house pages:", countHouse);
console.log("sign pages:", countSignPages);
console.log("hubs: /planets/ /houses/ /library/ (3)");
console.log("sitemap URLs:", urls.length);
