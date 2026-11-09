/* SignWheel place picker: wires a text input, a results list and a
 * confirmation line to the Places search layer. Used by the birth
 * chart form and the compatibility form (twice there).
 *
 * attachPlacePicker({ input, list, confirm }) returns:
 *   getSelected()  the picked city object, or null
 *   pick(city)     set a city programmatically (saved charts, links)
 * Any typing in the input clears the current pick, so a chart is
 * never drawn for a place the visitor did not confirm from the list.
 */
(function () {
  "use strict";

  function attachPlacePicker(opts) {
    const input = opts.input, list = opts.list, confirm = opts.confirm;
    let selected = null;
    let token = 0;

    function showList(items) {
      list.innerHTML = "";
      items.forEach((c) => {
        const li = document.createElement("li");
        li.appendChild(document.createTextNode(c.name + " "));
        const span = document.createElement("span");
        span.className = "co";
        span.textContent = (c.region ? c.region + ", " : "") + c.country;
        li.appendChild(span);
        li.addEventListener("mousedown", (ev) => { ev.preventDefault(); pick(c); });
        list.appendChild(li);
      });
      list.style.display = items.length ? "block" : "none";
    }

    function pick(c) {
      selected = c;
      input.value = Places.label(c);
      list.style.display = "none";
      const ns = c.lat >= 0 ? "N" : "S", ew = c.lon >= 0 ? "E" : "W";
      confirm.textContent = "Place set: " + Places.label(c) + ": " +
        Math.abs(c.lat).toFixed(2) + "°" + ns + ", " + Math.abs(c.lon).toFixed(2) + "°" + ew +
        ", time zone " + c.tz + ". If that is not the right town, pick again.";
    }

    let debounce = null;
    input.addEventListener("input", () => {
      selected = null;
      confirm.textContent = "";
      const q = input.value.trim();
      const my = ++token;
      if (q.length < 2) { list.style.display = "none"; return; }
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        Places.search(q).then((items) => {
          if (my !== token) return; // a newer keystroke owns the list
          showList(items);
        });
      }, 110);
    });
    input.addEventListener("blur", () => setTimeout(() => { list.style.display = "none"; }, 150));

    return { getSelected: () => selected, pick };
  }

  window.attachPlacePicker = attachPlacePicker;
})();
