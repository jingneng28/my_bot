(function () {
  const graph = buildGraph({
    LINE_INFO, LINE_DEFAULT_MINUTES, DEFAULT_TRANSFER_MINUTES,
    MIN_EDGE_MINUTES, MAX_EDGE_MINUTES, SEGMENTS, CCK, CCK_OVERRIDES, CALIBRATIONS,
  });
  const stations = Array.from(graph.allStations).sort((a, b) => a.localeCompare(b));
  const resultEl = document.getElementById("result");

  function makeStationPicker(inputId, listId, initial) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    let value = initial;
    let activeIndex = -1;

    function close() {
      list.hidden = true;
      list.innerHTML = "";
      activeIndex = -1;
    }

    function open(matches) {
      list.innerHTML = "";
      matches.forEach((name, i) => {
        const li = document.createElement("li");
        li.textContent = name;
        li.dataset.index = i;
        if (name === value) li.classList.add("current");
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          select(name);
        });
        list.appendChild(li);
      });
      list.hidden = matches.length === 0;
      activeIndex = -1;
    }

    function select(name) {
      value = name;
      input.value = name;
      close();
      input.dispatchEvent(new CustomEvent("station-change"));
    }

    function filter(query) {
      const q = query.trim().toLowerCase();
      if (!q) return stations.slice(0, 12);
      return stations.filter((s) => s.toLowerCase().includes(q)).slice(0, 12);
    }

    input.addEventListener("focus", () => open(filter(input.value)));
    input.addEventListener("input", () => open(filter(input.value)));
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("keydown", (e) => {
      const items = Array.from(list.children);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (items.length) {
          activeIndex = (activeIndex + 1) % items.length;
          items.forEach((li, i) => li.classList.toggle("active", i === activeIndex));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (items.length) {
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          items.forEach((li, i) => li.classList.toggle("active", i === activeIndex));
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) select(items[activeIndex].textContent);
        else if (stations.includes(input.value)) select(input.value);
      } else if (e.key === "Escape") {
        close();
      }
    });

    return {
      get value() { return value; },
      set(name) { select(name); },
    };
  }

  const from = makeStationPicker("from", "from-list", "Choa Chu Kang");
  const to = makeStationPicker("to", "to-list", "Tampines");
  document.getElementById("from").value = from.value;
  document.getElementById("to").value = to.value;

  document.getElementById("swap").addEventListener("click", () => {
    const a = from.value, b = to.value;
    from.set(b);
    to.set(a);
    render();
  });

  document.getElementById("go").addEventListener("click", render);
  document.getElementById("from").addEventListener("station-change", render);
  document.getElementById("to").addEventListener("station-change", render);

  function legEl(leg) {
    const li = document.createElement("li");
    li.className = "leg " + leg.type;

    if (leg.type === "ride") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = leg.line;
      badge.style.background = LINE_INFO[leg.line].color;
      li.appendChild(badge);
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
    mins.textContent = formatMinutes(leg.minutes);
    li.appendChild(mins);
    return li;
  }

  function render() {
    const fromName = from.value, toName = to.value;
    resultEl.innerHTML = "";
    resultEl.hidden = false;

    if (!stations.includes(fromName) || !stations.includes(toName)) {
      resultEl.innerHTML = '<p class="error">Pick a station from the list for both fields.</p>';
      return;
    }
    if (fromName === toName) {
      resultEl.innerHTML = '<p class="error">Pick two different stations.</p>';
      return;
    }

    let route;
    try {
      route = findRoute(graph, fromName, toName);
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
    total.textContent = formatMinutes(route.totalMinutes);
    resultEl.appendChild(total);

    const label = document.createElement("div");
    label.className = "route-label";
    label.textContent = `${fromName} → ${toName}`;
    resultEl.appendChild(label);

    const ul = document.createElement("ul");
    ul.className = "legs";
    for (const leg of route.legs) ul.appendChild(legEl(leg));
    resultEl.appendChild(ul);
  }

  render();
})();
