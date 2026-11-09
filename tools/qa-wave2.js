/* Wave 2 browser QA: headless Chromium (puppeteer-core driving the
 * Playwright-cache Chromium), phone viewport 420px, against a local
 * static server. Covers: compatibility end to end for the fixed S1
 * pair (N1 + Boston partner), the ephemeris page, the full place
 * list finding Marfa, Texas (NOT in the old 230-city starter list),
 * and a birth-chart regression on N1.
 *
 * Run:  node tools/qa-wave2.js [baseUrl]
 * Needs puppeteer-core resolvable (NODE_PATH) and a Chromium binary
 * (CHROME_BIN or the Playwright cache default below).
 */
"use strict";
const puppeteer = require(process.env.QA_PUPPETEER || "/tmp/qa/node_modules/puppeteer-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.argv[2] || "http://127.0.0.1:8137";
function defaultChrome() {
  const cache = path.join(os.homedir(), ".cache/ms-playwright");
  for (const d of fs.readdirSync(cache).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const p = path.join(cache, d, "chrome-linux64", "chrome");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("no chromium in playwright cache");
}
const CHROME = process.env.CHROME_BIN || defaultChrome();

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  console.log((ok ? "PASS  " : "FAIL  ") + name + (detail ? "  ::  " + detail : ""));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Date and time inputs mangle keyboard entry in headless Chrome
 * (segmented locale fields), so their values are set by script,
 * exactly as a filled form would carry them. Text inputs and the
 * place typeahead are typed for real, since the picker listens for
 * keystrokes. */
async function setVal(page, sel, value) {
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, sel, value);
}

async function pickPlace(page, inputSel, listSel, confirmSel, query, expectText) {
  await page.click(inputSel);
  await page.type(inputSel, query, { delay: 30 });
  await page.waitForFunction(
    (sel, txt) => [...document.querySelectorAll(sel + " li")]
      .some((li) => li.textContent.includes(txt)),
    { timeout: 15000 }, listSel, expectText);
  await page.evaluate((sel, txt) => {
    const li = [...document.querySelectorAll(sel + " li")].find((x) => x.textContent.includes(txt));
    li.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  }, listSel, expectText);
  await sleep(150);
  const confirm = await page.$eval(confirmSel, (el) => el.textContent);
  return confirm;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions(BASE, ["clipboard-read", "clipboard-write"]);
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  /* ------------------------------------------ compatibility, S1 pair */
  await page.goto(BASE + "/compatibility/", { waitUntil: "networkidle0" });
  await page.type("#name-a", "Sam");
  await setVal(page, "#date-a", "1990-06-15");
  await setVal(page, "#time-a", "14:30");
  const confA = await pickPlace(page, "#place-a", "#place-list-a", "#place-confirm-a", "New York", "New York");
  check("compat: place A set", confA.includes("Place set: New York"), confA.slice(0, 90));

  await page.type("#name-b", "Jo");
  await setVal(page, "#date-b", "1988-09-22");
  await setVal(page, "#time-b", "09:00");
  const confB = await pickPlace(page, "#place-b", "#place-list-b", "#place-confirm-b", "Boston", "Boston");
  check("compat: place B set", confB.includes("Place set: Boston"), confB.slice(0, 90));

  await page.click('#compat-form button[type="submit"]');
  await page.waitForFunction(() => {
    const r = document.getElementById("result");
    return r && r.style.display !== "none" && r.textContent.includes("The verdict, in plain words");
  }, { timeout: 15000 });
  const compatText = await page.$eval("#result", (el) => el.textContent);
  check("compat: verdict story with counts", /found 26 contacts/.test(compatText), (compatText.match(/found \d+ contacts/) || [""])[0]);
  check("compat: counts split named", /5 joined, 10 flowing or friendly, and 11 with friction/.test(compatText));
  check("compat: no percentage score offered", !/score of \d+|\d+\s?%|out of 100\W*$/.test(compatText.replace("No honest number like that exists", "")) && !compatText.includes("%"));
  check("compat: flows section", compatText.includes("Where it flows"));
  check("compat: rubs section", compatText.includes("Where it rubs"));
  check("compat: joined section", compatText.includes("Joined at the hip"));
  check("compat: named headings", compatText.includes("Sam's") && compatText.includes("Jo's"));
  check("compat: full table present", compatText.includes("Every contact we found") && compatText.includes("Orb"));
  const wheels = await page.$$eval("#result .wheel-svg", (els) => els.length);
  check("compat: two wheels drawn", wheels === 2, wheels + " wheels");
  await page.click("#pair-card-btn");
  await sleep(400);
  const cardMsg = await page.$eval("#pair-share-msg", (el) => el.textContent);
  check("compat: share card copies", cardMsg.includes("SignWheel compatibility") && cardMsg.includes("Sam"), cardMsg.slice(0, 110));
  await page.screenshot({ path: "/tmp/qa-compat.png" });

  /* share link rebuilds the pair (the link button sets the hash;
   * DOM click because puppeteer's hit test trips on this button at
   * phone width after the smooth scroll) */
  await page.evaluate(() => document.getElementById("pair-share-btn").click());
  await sleep(300);
  const hash = await page.evaluate(() => location.hash);
  check("compat: share link sets #p= hash", hash.startsWith("#p="), hash.slice(0, 12));
  await page.goto(BASE + "/compatibility/" + hash, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => {
    const r = document.getElementById("result");
    return r && r.textContent.includes("The verdict, in plain words");
  }, { timeout: 15000 });
  check("compat: share link rebuilds pair", true, "hash " + hash.slice(0, 24) + "...");

  /* ------------------------------------------------------ ephemeris */
  await page.goto(BASE + "/ephemeris/", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelectorAll("#eph-table tr").length === 11, { timeout: 15000 });
  const ephText = await page.$eval("#eph-table", (el) => el.textContent);
  check("ephemeris: 10 planet rows", ephText.includes("Mercury") && ephText.includes("Pluto"));
  check("ephemeris: motion column", /Direct|Retrograde/.test(ephText));
  const weekRows = await page.$$eval("#eph-week tr", (els) => els.length);
  check("ephemeris: 7 day table", weekRows === 8, weekRows + " rows incl header");
  const when = await page.$eval("#eph-when", (el) => el.textContent);
  check("ephemeris: settings line", when.includes("midday Universal Time"), when.slice(0, 80));
  await page.evaluate(() => {
    const d = document.getElementById("eph-date");
    d.value = "2026-11-08";
    d.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(400);
  const when2 = await page.$eval("#eph-when", (el) => el.textContent);
  check("ephemeris: date switch recomputes", when2.includes("2026"), when2.slice(0, 80));
  await page.screenshot({ path: "/tmp/qa-ephemeris.png" });

  /* ------------------------------ birth chart: Marfa + N1 regression */
  await page.goto(BASE + "/birth-chart/", { waitUntil: "networkidle0" });
  const confMarfa = await pickPlace(page, "#birth-place", "#place-list", "#place-confirm", "Marfa", "Marfa");
  check("places: Marfa TX found in full list", confMarfa.includes("Marfa") && confMarfa.includes("Texas"), confMarfa.slice(0, 110));
  check("places: Marfa zone is America/Chicago", confMarfa.includes("America/Chicago"));

  await page.evaluate(() => { document.getElementById("birth-place").value = ""; });
  const confNY = await pickPlace(page, "#birth-place", "#place-list", "#place-confirm", "New York", "New York");
  check("chart regression: place set", confNY.includes("Place set: New York"));
  await setVal(page, "#birth-date", "1990-06-15");
  await setVal(page, "#birth-time", "14:30");
  await page.click('#chart-form button[type="submit"]');
  await page.waitForFunction(() => {
    const r = document.getElementById("result");
    return r && r.style.display !== "none" && r.textContent.includes("Placements");
  }, { timeout: 15000 });
  const chartText = await page.$eval("#result", (el) => el.textContent);
  check("chart regression: N1 Sun exact", chartText.includes("Gemini 24°23′"), (chartText.match(/Gemini 24°\d+′/) || [""])[0]);
  check("chart regression: settings line", chartText.includes("UTC-04:00") && chartText.includes("Placidus"));
  await page.screenshot({ path: "/tmp/qa-chart.png" });

  const realErrors = errors.filter((e) => !e.includes("favicon"));
  check("no page errors", realErrors.length === 0, realErrors.join(" | ").slice(0, 300));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log("\nQA SUMMARY: " + (results.length - failed.length) + "/" + results.length + " passed");
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("QA CRASH:", e.message); process.exit(2); });
