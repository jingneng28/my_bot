(function () {
  const graph = buildGraph(LINE_INFO, SEGMENTS, CCK, CCK_OVERRIDES);
  const stations = Array.from(graph.allStations).sort((a, b) => a.localeCompare(b));

  const fromSel = document.getElementById("from");
  const toSel = document.getElementById("to");
  const resultEl = document.getElementById("result");

  function fillSelect(sel, selected) {
    sel.innerHTML = "";
    for (const s of stations) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (s === selected) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  fillSelect(fromSel, "Choa Chu Kang");
  fillSelect(toSel, stations.find((s) => s !== "Choa Chu Kang") || stations[0]);

  document.getElementById("swap").addEventListener("click", () => {
    const a = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = a;
    render();
  });

  document.getElementById("go").addEventListener("click", render);

  function lineBadge(line) {
    const info = LINE_INFO[line];
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = line;
    span.style.background = info.color;
    return span;
  }

  function legEl(leg) {
    const li = document.createElement("li");
    li.className = "leg " + leg.type;

    if (leg.type === "ride") {
      li.appendChild(lineBadge(leg.line));
      const details = document.createElement("div");
      details.className = "details";
      const main = document.createElement("div");
      main.className = "main-line";
      main.textContent = `${LINE_INFO[leg.line].name}: ${leg.from} → ${leg.to}`;
      const sub = document.createElement("div");
      sub.className = "sub-line";
      sub.textContent = `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`;
      details.appendChild(main);
      details.appendChild(sub);
      li.appendChild(details);
    } else if (leg.type === "transfer") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "⇄";
      li.appendChild(badge);
      const details = document.createElement("div");
      details.className = "details";
      const main = document.createElement("div");
      main.className = "main-line";
      main.textContent = `Change at ${leg.station}: ${leg.fromLine} → ${leg.toLine} line`;
      details.appendChild(main);
      li.appendChild(details);
    } else {
      // special (personalised) leg
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "★";
      li.appendChild(badge);
      const details = document.createElement("div");
      details.className = "details";
      const main = document.createElement("div");
      main.className = "main-line";
      main.textContent = `${leg.from} → ${leg.to} (your personalised time)`;
      details.appendChild(main);
      if (leg.label) {
        const sub = document.createElement("div");
        sub.className = "sub-line";
        sub.textContent = leg.label;
        details.appendChild(sub);
      }
      li.appendChild(details);
    }

    const mins = document.createElement("div");
    mins.className = "mins";
    mins.textContent = `${leg.minutes} min`;
    li.appendChild(mins);
    return li;
  }

  function render() {
    const from = fromSel.value;
    const to = toSel.value;
    resultEl.innerHTML = "";
    resultEl.hidden = false;

    if (from === to) {
      resultEl.innerHTML = '<p class="error">Pick two different stations.</p>';
      return;
    }

    let route;
    try {
      route = findRoute(graph, from, to);
    } catch (e) {
      resultEl.innerHTML = `<p class="error">${e.message}</p>`;
      return;
    }

    if (!route) {
      resultEl.innerHTML = '<p class="error">No route found.</p>';
      return;
    }

    const total = document.createElement("div");
    total.className = "total";
    total.textContent = `${route.totalMinutes} min`;
    resultEl.appendChild(total);

    const label = document.createElement("div");
    label.className = "route-label";
    label.textContent = `${from} → ${to}`;
    resultEl.appendChild(label);

    const ul = document.createElement("ul");
    ul.className = "legs";
    for (const leg of route.legs) ul.appendChild(legEl(leg));
    resultEl.appendChild(ul);
  }

  render();
})();
