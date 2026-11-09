/* SignWheel birth chart page: form, typeahead place picker, result
 * rendering, on-device saved charts, share links (in the URL hash,
 * which browsers never send to a server). No account, no uploads:
 * everything runs here, in this page. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("chart-form");
  if (!form) return;

  const dateEl = $("birth-date"), timeEl = $("birth-time"), unknownEl = $("time-unknown");
  const placeEl = $("birth-place"), listEl = $("place-list"), confirmEl = $("place-confirm");
  const resultEl = $("result"), savedEl = $("saved-list"), savedWrap = $("saved-wrap");

  /* --------------------------------------------- full reading helpers */
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
  function signText(planet, sign) {
    if (planet === "Sun") return STARTER_TEXTS.sun[sign];
    if (planet === "Moon") return STARTER_TEXTS.moon[sign];
    return WAVE1_TEXTS.sign[planet.toLowerCase()][sign];
  }
  function houseText(planet, house) {
    const set = WAVE1_TEXTS.house[planet.toLowerCase()];
    return set ? set[String(house)] : null;
  }

  /* ------------------------------------------------------- typeahead */
  const picker = attachPlacePicker({ input: placeEl, list: listEl, confirm: confirmEl });
  unknownEl.addEventListener("change", () => { timeEl.disabled = unknownEl.checked; });

  /* ------------------------------------------------------------ save */
  const LS_KEY = "signwheel.charts.v1";
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }
  function storeSaved(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
  function renderSaved() {
    const list = loadSaved();
    savedEl.innerHTML = "";
    savedWrap.style.display = list.length ? "block" : "none";
    list.forEach((item, idx) => {
      const li = document.createElement("li");
      const grow = document.createElement("span");
      grow.className = "grow";
      grow.textContent = item.label + " · " + item.date + (item.time ? " " + item.time : ", time unknown") + " · " + item.city.name + ", " + item.city.country;
      const open = document.createElement("button");
      open.className = "link-btn"; open.textContent = "Open";
      open.addEventListener("click", () => { fillForm(item); runChart(item); });
      const del = document.createElement("button");
      del.className = "link-btn"; del.textContent = "Delete";
      del.addEventListener("click", () => { const l = loadSaved(); l.splice(idx, 1); storeSaved(l); renderSaved(); });
      li.appendChild(grow); li.appendChild(open); li.appendChild(del);
      savedEl.appendChild(li);
    });
  }
  $("delete-all-saved").addEventListener("click", () => { storeSaved([]); renderSaved(); });

  /* ----------------------------------------------------------- share */
  function encodeShare(item) {
    const payload = { d: item.date, t: item.time, c: [item.city.name, item.city.country, item.city.lat, item.city.lon, item.city.tz], l: item.label || "" };
    return "#c=" + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeShare(hash) {
    try {
      const raw = hash.replace(/^#c=/, "").replace(/-/g, "+").replace(/_/g, "/");
      const obj = JSON.parse(decodeURIComponent(escape(atob(raw))));
      return { date: obj.d, time: obj.t, label: obj.l || "",
               city: { name: obj.c[0], country: obj.c[1], lat: obj.c[2], lon: obj.c[3], tz: obj.c[4] } };
    } catch (e) { return null; }
  }

  /* ---------------------------------------------------------- render */
  function fillForm(item) {
    dateEl.value = item.date;
    if (item.time) { unknownEl.checked = false; timeEl.disabled = false; timeEl.value = item.time; }
    else { unknownEl.checked = true; timeEl.disabled = true; }
    picker.pick(item.city);
  }
  function currentItem(label) {
    return { label: label || "", date: dateEl.value, time: unknownEl.checked ? null : timeEl.value,
             city: picker.getSelected() };
  }

  function runChart(item) {
    const chart = Engine.computeChart(item.date, item.time, item.city.lat, item.city.lon, item.city.tz);
    const when = item.time ? item.time : "time unknown";
    const settings = "Worked out for " + item.date + ", " + when + ", at " + item.city.name + ", " + item.city.country +
      " (" + Math.abs(item.city.lat).toFixed(2) + "°, " + Math.abs(item.city.lon).toFixed(2) + "°). Time zone " + item.city.tz +
      ", offset used " + chart.resolved.offsetLabel + ". Zodiac: tropical. Houses: " + (chart.houseSystem || "none (no birth time)") + ".";
    let html = "";
    html += '<div class="wheel-box">' + drawWheelSVG({ planets: chart.planets, cusps: chart.cusps, asc: chart.asc, mc: chart.mc, size: 520 }) + "</div>";
    html += '<p class="settings-line">' + settings + "</p>";
    if (chart.notes.length) {
      html += '<div class="note-box"><span class="hand">worth knowing</span>' +
        chart.notes.map((n) => "<p>" + n + "</p>").join("") + "</div>";
    }
    // Placements table
    html += '<h2>Placements</h2><table class="placements"><tr><th></th><th>Planet</th><th>Position</th><th>House</th></tr>';
    for (const name of Engine.PLANETS) {
      const lon = chart.planets[name];
      const house = chart.cusps ? Engine.houseOf(lon, chart.cusps) : "n/a";
      html += "<tr><td class='glyph'>" + PLANET_GLYPHS[name] + "</td><td>" + name + "</td><td class='pos'>" +
        Engine.formatPosition(lon) + "</td><td>" + house + "</td></tr>";
    }
    if (chart.asc !== null) {
      html += "<tr><td class='glyph'>↑</td><td>Rising sign (Ascendant)</td><td class='pos'>" + Engine.formatPosition(chart.asc) +
        "</td><td>1</td></tr>";
      html += "<tr><td class='glyph'>MC</td><td>Midheaven</td><td class='pos'>" + Engine.formatPosition(chart.mc) + "</td><td>10</td></tr>";
    }
    html += "</table>";
    // Big three readings
    const sunSign = Engine.signOf(chart.planets.Sun);
    const moonSign = Engine.signOf(chart.planets.Moon);
    html += '<div class="reading"><h2>Your big three, in plain words</h2>';
    html += '<div class="reading-block"><h3>Sun in ' + sunSign + "</h3><p class='pos-line'>Your core character and where your energy comes from.</p><p>" + STARTER_TEXTS.sun[sunSign] + "</p></div>";
    if (chart.moonDayRange) {
      const signs = [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))];
      if (signs.length > 1) {
        html += '<div class="reading-block"><h3>Moon in ' + signs.join(" or ") + "</h3><p class='pos-line'>Your feelings and what settles you. Your birth time would settle which of these is yours.</p>";
        for (const sg of signs) html += "<p><strong>" + sg + ":</strong> " + STARTER_TEXTS.moon[sg] + "</p>";
        html += "</div>";
      } else {
        html += '<div class="reading-block"><h3>Moon in ' + moonSign + "</h3><p class='pos-line'>Your feelings and what settles you.</p><p>" + STARTER_TEXTS.moon[moonSign] + "</p></div>";
      }
    } else {
      html += '<div class="reading-block"><h3>Moon in ' + moonSign + "</h3><p class='pos-line'>Your feelings and what settles you.</p><p>" + STARTER_TEXTS.moon[moonSign] + "</p></div>";
    }
    if (chart.asc !== null) {
      const rSign = Engine.signOf(chart.asc);
      html += '<div class="reading-block"><h3>Rising in ' + rSign + "</h3><p class='pos-line'>The face you show first, before people know you.</p><p>" + STARTER_TEXTS.rising[rSign] + "</p></div>";
    } else {
      html += '<div class="reading-block"><h3>Rising sign: needs your birth time</h3><p>The rising sign changes about every two hours, so without a birth time we will not guess it. If you find your time later (a birth certificate often has it), come back and this third reading unlocks, along with the houses.</p></div>';
    }
    html += "</div>";
    // Full reading: every placement with a written text, planets in
    // chart order. Sun and Moon use the starter texts; Mercury to
    // Pluto use the wave 1 library. House readings exist for the Sun,
    // Moon, Mercury, Venus and Mars, and only when the chart has
    // houses (a known birth time). Without a time: signs only.
    html += '<div class="reading"><h2>Your whole chart, placement by placement</h2>';
    html += '<p class="small">The big three above are the short version. Here is every placement we have written words for, in the order the planets run around the wheel' +
      (chart.cusps ? ", each with the house it falls in." : ". Without a birth time there are no houses, so this is the planets in their signs only.") + "</p>";
    for (const name of Engine.PLANETS) {
      const lon = chart.planets[name];
      const sign = Engine.signOf(lon);
      const house = chart.cusps ? Engine.houseOf(lon, chart.cusps) : null;
      const moonAmbiguous = name === "Moon" && chart.moonDayRange &&
        [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))].length > 1;
      html += '<div class="reading-block"><h3>' + name + " in " +
        (moonAmbiguous ? [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))].join(" or ") : sign) + "</h3>";
      html += "<p class='pos-line'>" + Engine.formatPosition(lon) +
        (house !== null ? ", in the " + ordSuffix(house) + " house" : "") +
        (moonAmbiguous ? ". The Moon moves during the day, and without a birth time both readings below are possible" : "") + "</p>";
      if (moonAmbiguous) {
        for (const sg of [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))]) {
          html += "<p><strong>" + sg + ":</strong> " + STARTER_TEXTS.moon[sg] + "</p>";
        }
        html += '<p class="fineprint">These readings also have their own pages: ' +
          [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))].map((sg) =>
            '<a href="/planets/moon/' + sg.toLowerCase() + '/">Moon in ' + sg + "</a>").join(" and ") + ".</p>";
      } else {
        html += "<p>" + signText(name, sign) + "</p>";
        html += '<p class="fineprint">This reading also has its own page: <a href="/planets/' +
          name.toLowerCase() + "/" + sign.toLowerCase() + '/">' + name + " in " + sign + "</a>.</p>";
      }
      html += "</div>";
      if (house !== null) {
        const ht = houseText(name, house);
        if (ht) {
          html += '<div class="reading-block"><h3>' + name + " in the " + ORD_WORD[house] + " house</h3>";
          html += "<p class='pos-line'>The " + ORD_WORD[house] + " house covers " + HOUSE_TOPICS[house] + ".</p>";
          html += "<p>" + ht + "</p>";
          html += '<p class="fineprint">This reading also has its own page: <a href="/houses/' +
            name.toLowerCase() + "/" + house + '/">' + name + " in the " + ORD_WORD[house] + " house</a>.</p>";
          html += "</div>";
        }
      }
    }
    html += "</div>";
    // Actions
    const cardText = "My SignWheel chart: Sun in " + sunSign + ", Moon in " + moonSign +
      (chart.asc !== null ? ", Rising in " + Engine.signOf(chart.asc) : "") + ".";
    html += '<div class="cta-row">' +
      '<button type="button" id="save-btn" class="ghost">Save on this device</button>' +
      '<button type="button" id="share-btn" class="ghost">Copy share link</button>' +
      '<button type="button" id="card-btn" class="ghost">Copy as text</button></div>';
    html += '<p class="fineprint" id="share-msg"></p>';
    html += '<p class="fineprint">A share link contains the birth date, time and place needed to rebuild this chart. ' +
      "Anyone who has the link can open it and see those details, so only send it to people you are happy to see them. " +
      "The link lives in the part of the web address after the #, which browsers do not send to our servers.</p>";
    html += '<p class="fineprint">For entertainment and reflection only. SignWheel does not give medical, mental health, legal, financial, ' +
      "or other professional advice, and a chart is not a prediction of what will happen.</p>";
    html += '<p class="fineprint">Positions calculated in your browser from VSOP87 planetary data (checked against NASA JPL values; ' +
      'see <a href="/about/">How we calculate</a>). A wrong birth time or time zone is the most common cause of a wrong rising sign.</p>';
    resultEl.innerHTML = html;
    resultEl.style.display = "block";

    $("save-btn").addEventListener("click", () => {
      const label = prompt("A name for this chart (it stays on this device):", item.label || "");
      if (label === null) return;
      const list = loadSaved();
      list.push({ label: label || "Untitled chart", date: item.date, time: item.time, city: item.city });
      storeSaved(list); renderSaved();
      $("share-msg").textContent = "Saved in this browser, on this device only. We did not receive a copy.";
    });
    $("share-btn").addEventListener("click", () => {
      const link = location.origin + location.pathname + encodeShare(item);
      history.replaceState(null, "", encodeShare(item));
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
        .then(() => { $("share-msg").textContent = "Share link copied. It rebuilds this chart for whoever opens it."; })
        .catch(() => { $("share-msg").textContent = "Copy this link: " + link; });
    });
    $("card-btn").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(cardText) : Promise.reject())
        .then(() => { $("share-msg").textContent = "Copied: " + cardText; })
        .catch(() => { $("share-msg").textContent = cardText; });
    });
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!dateEl.value) { confirmEl.textContent = "Add a birth date first."; return; }
    if (!unknownEl.checked && !timeEl.value) { confirmEl.textContent = "Add a birth time, or tick \"I don't know my time\"."; return; }
    if (!picker.getSelected()) { confirmEl.textContent = "Pick your birth place from the list, so we know we have the right town."; return; }
    runChart(currentItem(""));
  });

  renderSaved();
  $("delete-all-wrap").style.display = "block";

  if (location.hash.startsWith("#c=")) {
    const item = decodeShare(location.hash);
    if (item && item.date && item.city) { fillForm(item); runChart(item); }
  }
})();
