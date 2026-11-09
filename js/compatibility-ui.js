/* SignWheel compatibility page: two birth forms, two charts, the
 * cross-chart contacts, a verdict in plain words (never a score),
 * and a share card. Everything runs in this page; share links carry
 * both births in the URL hash, which browsers never send to servers.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("compat-form");
  if (!form) return;
  const resultEl = $("result"), msgEl = $("form-msg");

  const people = ["a", "b"].map((k) => ({
    name: $("name-" + k), date: $("date-" + k), time: $("time-" + k),
    unknown: $("unknown-" + k),
    picker: attachPlacePicker({
      input: $("place-" + k), list: $("place-list-" + k), confirm: $("place-confirm-" + k),
    }),
  }));
  people.forEach((p) => {
    p.unknown.addEventListener("change", () => { p.time.disabled = p.unknown.checked; });
  });

  function readItem(p) {
    return {
      name: p.name.value.trim(), date: p.date.value,
      time: p.unknown.checked ? null : p.time.value,
      city: p.picker.getSelected(),
    };
  }
  function fillPerson(p, item) {
    p.name.value = item.name || "";
    p.date.value = item.date;
    if (item.time) { p.unknown.checked = false; p.time.disabled = false; p.time.value = item.time; }
    else { p.unknown.checked = true; p.time.disabled = true; }
    p.picker.pick(item.city);
  }
  function displayName(item, fallback) { return item.name || fallback; }

  /* ----------------------------------------------------------- share */
  function pack(item) {
    return { n: item.name || "", d: item.date, t: item.time,
             c: [item.city.name, item.city.country, item.city.lat, item.city.lon, item.city.tz] };
  }
  function unpack(o) {
    return { name: o.n || "", date: o.d, time: o.t,
             city: { name: o.c[0], country: o.c[1], lat: o.c[2], lon: o.c[3], tz: o.c[4] } };
  }
  function encodeShare(itemA, itemB) {
    const payload = JSON.stringify({ a: pack(itemA), b: pack(itemB) });
    return "#p=" + btoa(unescape(encodeURIComponent(payload))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeShare(hash) {
    try {
      const raw = hash.replace(/^#p=/, "").replace(/-/g, "+").replace(/_/g, "/");
      const obj = JSON.parse(decodeURIComponent(escape(atob(raw))));
      return { a: unpack(obj.a), b: unpack(obj.b) };
    } catch (e) { return null; }
  }

  /* ---------------------------------------------------------- render */
  function bigThreeLine(chart) {
    let s = "Sun in " + Engine.signOf(chart.planets.Sun);
    if (chart.moonDayRange) {
      const signs = [...new Set(Object.values(chart.moonDayRange).map((v) => Engine.signOf(v)))];
      s += ", Moon in " + signs.join(" or ");
    } else {
      s += ", Moon in " + Engine.signOf(chart.planets.Moon);
    }
    if (chart.asc !== null) s += ", rising in " + Engine.signOf(chart.asc);
    return s;
  }
  function fmtOrb(orb) {
    const deg = Math.floor(orb);
    const min = Math.floor((orb - deg) * 60);
    return deg + "°" + String(min).padStart(2, "0") + "′";
  }
  function contactHeading(nameA, nameB, c) {
    return nameA + "'s " + c.a + " and " + nameB + "'s " + c.b;
  }

  function runPair(itemA, itemB) {
    const nameA = displayName(itemA, "Person one");
    const nameB = displayName(itemB, "Person two");
    const chartA = Engine.computeChart(itemA.date, itemA.time, itemA.city.lat, itemA.city.lon, itemA.city.tz);
    const chartB = Engine.computeChart(itemB.date, itemB.time, itemB.city.lat, itemB.city.lon, itemB.city.tz);
    const aspects = Synastry.crossAspects(chartA.planets, chartB.planets, Engine.PLANETS);
    const cnt = Synastry.counts(aspects);
    const written = Synastry.written(aspects, SYNASTRY_TEXTS, Engine.PLANETS);

    let html = "";

    /* Two wheels, side by side */
    html += '<div class="wheels-pair">';
    for (const [item, chart, nm] of [[itemA, chartA, nameA], [itemB, chartB, nameB]]) {
      html += '<div><div class="wheel-box">' +
        drawWheelSVG({ planets: chart.planets, cusps: chart.cusps, asc: chart.asc, mc: chart.mc, size: 400 }) +
        '</div><p class="cap"><strong>' + nm + "</strong><br>" + bigThreeLine(chart) + "<br>" +
        '<span class="small">' + Places.label(item.city) + ", " + item.date + (item.time ? ", " + item.time : ", time unknown") + "</span></p></div>";
    }
    html += "</div>";

    const anyUnknown = !itemA.time || !itemB.time;
    html += '<p class="settings-line">Contacts are worked out from the two charts\' planet positions, using the five standard angles ' +
      "(joined, friendly, flowing, friction, head-on) with the usual limits for how close counts. Houses are not used in this reading" +
      (anyUnknown ? ", and because at least one birth time is unknown, rising signs are left out where they cannot be known." : ".") + "</p>";
    const notes = chartA.notes.concat(chartB.notes).filter((n) => !n.startsWith("Birth time unknown"));
    if (notes.length) {
      html += '<div class="note-box"><span class="hand">worth knowing</span>' + notes.map((n) => "<p>" + n + "</p>").join("") + "</div>";
    }

    /* ---------------- The verdict, in plain words */
    html += '<div class="reading"><h2>The verdict, in plain words</h2>';
    let story = "Between these two charts we found " + cnt.total + " contacts close enough to count: " +
      cnt.joined + " joined, " + cnt.easy + " flowing or friendly, and " + cnt.hard + " with friction. ";
    if (cnt.hard === 0) {
      story += "Not one of them is a friction contact, which is uncommon. Easy weather is a gift, but it can hide lazy habits, so for this pair the interesting question is depth, not peace.";
    } else if (cnt.easy + cnt.joined >= cnt.hard * 2) {
      story += "The easy contacts clearly outnumber the friction ones, so the pair's default weather is mild. What friction there is tends to stand out against the calm, which makes it easier to spot and easier to fix.";
    } else if (cnt.hard > cnt.easy + cnt.joined) {
      story += "Friction contacts outnumber the easy ones. That is not a bad chart for two people; it is a working one. The rub points below are where this pair will spend its honesty, and pairs often grow closer through exactly those, handled early and out loud.";
    } else {
      story += "Easy and friction contacts are fairly evenly matched, which is the most common shape for two real people: enough flow to enjoy each other, and enough friction to keep both of you awake.";
    }
    const allWritten = written.joined.concat(written.easy, written.hard).sort((x, y) => x.orb - y.orb);
    if (allWritten.length) {
      const s = allWritten[0];
      story += " The single closest written thread is " + contactHeading(nameA, nameB, s) + ", a " +
        ASPECT_PLAIN[s.aspect].name.toLowerCase() + " contact, and its reading is in the sections below.";
    }
    html += '<p class="verdict-lede">' + story + "</p>";
    html += '<p class="small">We do not turn any of this into a score out of 100. No honest number like that exists, and a pair is not a product rating.</p>';

    function section(title, list, emptyText, max) {
      html += "<h3>" + title + "</h3>";
      if (!list.length) { if (emptyText) html += "<p>" + emptyText + "</p>"; return; }
      for (const c of list.slice(0, max)) {
        html += '<p class="pos-line">' + contactHeading(nameA, nameB, c) + ": " + ASPECT_PLAIN[c.aspect].name +
          " (" + ASPECT_PLAIN[c.aspect].gloss + ").</p><p>" + c.text + "</p>";
      }
    }
    section("Where it flows", written.easy,
      cnt.easy
        ? "The easy contacts between these charts sit between the slower or thinking planets, so they colour the background of the pair more than the bond itself. They are all listed in the full table below."
        : "No flowing or friendly contacts landed inside the limits we use. That does not make a pair cold. It means whatever warmth is here is built on purpose, which tends to last at least as well as the found kind.",
      3);
    section("Joined at the hip", written.joined, "", 2);
    section("Where it rubs", written.hard,
      "No friction contacts landed inside the limits we use. Pairs like this rarely grate on each other's style. The thing to watch is the opposite habit: comfort can let small annoyances go unnamed for a long time, so name them while they are small.",
      3);

    /* What to do with that */
    html += "<h3>What to do with that</h3>";
    if (written.hard.length) {
      html += "<p>Start with the rub points. They are specific, and specific problems have specific fixes. Most of the friction above softens the moment it is said out loud instead of being acted out.</p>";
    }
    if (written.easy.length) {
      html += "<p>Use the easy threads on purpose. The contacts under \"where it flows\" are this pair's natural repair kit after a bad day: go back to whatever that contact describes, and let it do the work it is good at.</p>";
    }
    if (written.joined.length) {
      html += "<p>Keep the joined threads in view. Where your charts sit in the same place, you tend to feel each other strongly, in both directions: the highs are higher and the static is louder. Knowing the theme by name, from the readings above, makes it easier to steer.</p>";
    }
    if (!written.hard.length && !written.easy.length && !written.joined.length) {
      html += "<p>None of the headline contacts between these charts landed inside the limits we use, so read the full table below as the reading: the smaller contacts, taken together, are the pair's actual texture.</p>";
    }
    html += "</div>";

    /* ---------------- Full contact table */
    html += "<h2>Every contact we found</h2>";
    html += '<p class="small">Closest first. The distance from exact is called the orb: the smaller the orb, the stronger the contact is usually read. ' +
      "Joined means in the same place. Flowing and friendly are the easy angles. Friction and head-on are the angles where styles push on each other. " +
      "Each planet name carries its plain meaning, so nothing stands unexplained.</p>";
    html += '<table class="placements"><tr><th>' + nameA + "</th><th>Contact</th><th>" + nameB + "</th><th>Orb</th></tr>";
    for (const c of aspects) {
      html += "<tr><td>" + c.a + ' <span class="small">(' + PLANET_PLAIN[c.a] + ")</span><br>" +
        '<span class="pos">' + Engine.formatPosition(chartA.planets[c.a]) + "</span></td>" +
        "<td>" + ASPECT_PLAIN[c.aspect].name + "</td>" +
        "<td>" + c.b + ' <span class="small">(' + PLANET_PLAIN[c.b] + ")</span><br>" +
        '<span class="pos">' + Engine.formatPosition(chartB.planets[c.b]) + "</span></td>" +
        '<td class="orb">' + fmtOrb(c.orb) + "</td></tr>";
    }
    html += "</table>";

    /* ---------------- Share card */
    const cardText = "SignWheel compatibility: " + nameA + " (" + bigThreeLine(chartA) + ") and " +
      nameB + " (" + bigThreeLine(chartB) + "). " + cnt.total + " contacts between the charts: " +
      cnt.joined + " joined, " + cnt.easy + " easy, " + cnt.hard + " friction. No score, just the reading.";
    html += '<div class="cta-row">' +
      '<button type="button" id="pair-share-btn" class="ghost">Copy share link</button>' +
      '<button type="button" id="pair-card-btn" class="ghost">Copy as text</button></div>';
    html += '<p class="fineprint" id="pair-share-msg"></p>';
    html += '<p class="fineprint">A share link contains both people\'s birth dates, times and places, because it has to rebuild both charts. ' +
      "Anyone who has the link can open it and see those details, so only send it to people you are happy to see them. " +
      "The link lives in the part of the web address after the #, which browsers do not send to our servers.</p>";
    html += '<p class="fineprint">For entertainment and reflection only. This reading describes two chart patterns; it does not say what either person thinks or feels, ' +
      "and it is not a prediction of what the pair will do.</p>";
    resultEl.innerHTML = html;
    resultEl.style.display = "block";

    $("pair-share-btn").addEventListener("click", () => {
      const link = location.origin + location.pathname + encodeShare(itemA, itemB);
      history.replaceState(null, "", encodeShare(itemA, itemB));
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
        .then(() => { $("pair-share-msg").textContent = "Share link copied. It rebuilds this pair reading for whoever opens it."; })
        .catch(() => { $("pair-share-msg").textContent = "Copy this link: " + link; });
    });
    $("pair-card-btn").addEventListener("click", () => {
      const link = location.origin + location.pathname + encodeShare(itemA, itemB);
      const card = cardText + " " + link;
      (navigator.clipboard ? navigator.clipboard.writeText(card) : Promise.reject())
        .then(() => { $("pair-share-msg").textContent = "Copied: " + cardText; })
        .catch(() => { $("pair-share-msg").textContent = card; });
    });
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    msgEl.textContent = "";
    const items = people.map(readItem);
    for (let i = 0; i < 2; i++) {
      const who = i === 0 ? "first" : "second";
      if (!items[i].date) { msgEl.textContent = "Add the " + who + " person's birth date."; return; }
      if (!people[i].unknown.checked && !items[i].time) { msgEl.textContent = "Add the " + who + " person's birth time, or tick the \"don't know\" box."; return; }
      if (!items[i].city) { msgEl.textContent = "Pick the " + who + " person's birth place from the list, so we know we have the right town."; return; }
    }
    runPair(items[0], items[1]);
  });

  if (location.hash.startsWith("#p=")) {
    const pair = decodeShare(location.hash);
    if (pair && pair.a.date && pair.a.city && pair.b.date && pair.b.city) {
      fillPerson(people[0], pair.a);
      fillPerson(people[1], pair.b);
      runPair(pair.a, pair.b);
    }
  }
})();
