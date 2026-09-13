// Route-finding engine: Dijkstra's algorithm over a graph whose nodes are
// (station, line) pairs, so we can tell a same-line ride apart from a
// line-change transfer and correctly cost/describe each.

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Spread `total` minutes across `count` hops, starting from `base` minutes
// each, nudging individual hops up or down (clamped to [min,max]) so the
// hops sum as closely as possible to `total`. Deterministic: earlier hops
// absorb the adjustment first.
function distributeMinutes(total, count, base, min, max) {
  const vals = new Array(count).fill(base);
  let diff = total - base * count;
  let guard = count * (max - min) + 5;
  let i = 0;
  while (diff > 0 && guard-- > 0) {
    const idx = i % count;
    if (vals[idx] < max) { vals[idx]++; diff--; }
    i++;
  }
  i = 0;
  guard = count * (max - min) + 5;
  while (diff < 0 && guard-- > 0) {
    const idx = i % count;
    if (vals[idx] > min) { vals[idx]--; diff++; }
    i++;
  }
  return vals;
}

function buildGraph(config) {
  const {
    LINE_INFO, LINE_DEFAULT_MINUTES, DEFAULT_TRANSFER_MINUTES,
    MIN_EDGE_MINUTES, MAX_EDGE_MINUTES, SEGMENTS, CCK, CCK_OVERRIDES, CALIBRATIONS,
  } = config;

  const nodeKey = (station, line) => `${station}::${line}`;
  const adj = new Map(); // nodeKey -> [{to, weight, kind, line, label}]
  const edgeByKey = new Map(); // canonical "a|b" -> edge object (shared by both directions)
  const stationLines = new Map(); // station -> Set(line)
  const allStations = new Set();

  function ensureNode(key) {
    if (!adj.has(key)) adj.set(key, []);
  }

  function edgeCanonicalId(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function addEdge(a, b, weight, kind, line, label) {
    ensureNode(a);
    ensureNode(b);
    // Both directions share this one mutable core, via getters below, so
    // calibrating the weight later updates the edge in both directions.
    const core = { weight, kind, line, label };
    const proxy = (to) => ({
      to,
      get weight() { return core.weight; },
      set weight(v) { core.weight = v; },
      get kind() { return core.kind; },
      get line() { return core.line; },
      get label() { return core.label; },
    });
    adj.get(a).push(proxy(b));
    adj.get(b).push(proxy(a));
    edgeByKey.set(edgeCanonicalId(a, b), core);
    return core;
  }

  function addLine(station, line) {
    allStations.add(station);
    if (!stationLines.has(station)) stationLines.set(station, new Set());
    stationLines.get(station).add(line);
  }

  // Default ride edges from each linear segment.
  for (const seg of SEGMENTS) {
    const { line, stations } = seg;
    stations.forEach((s) => addLine(s, line));
    const base = LINE_DEFAULT_MINUTES[line] || 3;
    for (let i = 0; i < stations.length - 1; i++) {
      const a = nodeKey(stations[i], line);
      const b = nodeKey(stations[i + 1], line);
      if (!edgeByKey.has(edgeCanonicalId(a, b))) {
        addEdge(a, b, base, "ride", line, null);
      }
    }
  }

  // Default transfer edges at every interchange (station served by 2+ lines).
  for (const [station, lines] of stationLines.entries()) {
    const lineArr = Array.from(lines);
    for (let i = 0; i < lineArr.length; i++) {
      for (let j = i + 1; j < lineArr.length; j++) {
        const a = nodeKey(station, lineArr[i]);
        const b = nodeKey(station, lineArr[j]);
        if (!edgeByKey.has(edgeCanonicalId(a, b))) {
          addEdge(a, b, DEFAULT_TRANSFER_MINUTES, "transfer", null, null);
        }
      }
    }
  }

  // Calibration: tune real corridors toward the user's measured totals,
  // only touching hops that haven't already been fixed by an earlier step.
  const fixed = new Set(); // canonical edge ids already calibrated
  for (const step of CALIBRATIONS || []) {
    if (step.type === "transfer") {
      const a = nodeKey(step.station, step.lineA);
      const b = nodeKey(step.station, step.lineB);
      const edge = edgeByKey.get(edgeCanonicalId(a, b));
      if (edge) {
        edge.weight = step.minutes;
        fixed.add(edgeCanonicalId(a, b));
      }
      continue;
    }

    // ride step
    const { line, stations, totalMinutes } = step;
    const hopKeys = [];
    for (let i = 0; i < stations.length - 1; i++) {
      hopKeys.push([nodeKey(stations[i], line), nodeKey(stations[i + 1], line)]);
    }
    let fixedSum = 0;
    const unfixed = [];
    for (const [a, b] of hopKeys) {
      const id = edgeCanonicalId(a, b);
      const edge = edgeByKey.get(id);
      if (!edge) continue; // stations not adjacent in the data - skip defensively
      if (fixed.has(id)) fixedSum += edge.weight;
      else unfixed.push([a, b, id]);
    }
    if (unfixed.length === 0) continue;
    const base = LINE_DEFAULT_MINUTES[line] || 3;
    const remaining = totalMinutes - fixedSum;
    const vals = distributeMinutes(remaining, unfixed.length, base, MIN_EDGE_MINUTES, MAX_EDGE_MINUTES);
    unfixed.forEach(([a, b, id], i) => {
      edgeByKey.get(id).weight = vals[i];
      fixed.add(id);
    });
  }

  // Personalised Choa Chu Kang overrides: added as a real (single-hop) edge
  // in the graph, so they can be used as a sensible stepping stone for
  // other journeys, AND recorded in a lookup map so a *direct* CCK<->X
  // query always returns the user's exact given number, no matter what a
  // shortest-path search over the wider map might otherwise compute.
  const overrideMap = new Map(); // destination station -> {minutes, hint}
  for (const override of CCK_OVERRIDES) {
    overrideMap.set(override.to, { minutes: override.minutes, hint: override.hint || null });
    const destLines = Array.from(stationLines.get(override.to) || []);
    const cckLines = Array.from(stationLines.get(CCK) || []);
    for (const lc of cckLines) {
      for (const ld of destLines) {
        addEdge(
          nodeKey(CCK, lc),
          nodeKey(override.to, ld),
          override.minutes,
          "special",
          null,
          override.hint || null
        );
      }
    }
  }

  return { adj, stationLines, allStations, nodeKey, cckStation: CCK, overrideMap };
}

// Dijkstra over (station, line) nodes; returns the winning node-key path
// plus the edge sequence taken, so callers know exact station names.
function dijkstraWithPath(graph, fromStation, toStation) {
  const { adj, stationLines, nodeKey } = graph;
  const fromLines = Array.from(stationLines.get(fromStation) || []);
  const toLines = new Set(stationLines.get(toStation) || []);
  if (fromLines.length === 0 || toLines.size === 0) return null;

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const pq = [];
  const push = (key, d) => pq.push([d, key]);
  const pop = () => {
    let bestIdx = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[bestIdx][0]) bestIdx = i;
    return pq.splice(bestIdx, 1)[0];
  };

  for (const line of fromLines) {
    const key = nodeKey(fromStation, line);
    dist.set(key, 0);
    push(key, 0);
  }

  while (pq.length) {
    const [d, key] = pop();
    if (visited.has(key)) continue;
    visited.add(key);
    if (d > (dist.get(key) ?? Infinity)) continue;
    for (const e of adj.get(key) || []) {
      const nd = d + e.weight;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: key, edge: e });
        push(e.to, nd);
      }
    }
  }

  let bestKey = null;
  let bestDist = Infinity;
  for (const line of toLines) {
    const key = nodeKey(toStation, line);
    const d = dist.get(key);
    if (d !== undefined && d < bestDist) {
      bestDist = d;
      bestKey = key;
    }
  }
  if (bestKey === null) return null;

  const nodes = [bestKey];
  const edges = [];
  let cur = bestKey;
  while (prev.has(cur)) {
    const { from, edge } = prev.get(cur);
    edges.push(edge);
    nodes.push(from);
    cur = from;
  }
  nodes.reverse();
  edges.reverse();

  return { totalMinutes: bestDist, nodes, edges };
}

function finishRide(ride) {
  return {
    type: "ride",
    line: ride.line,
    from: ride.from,
    to: ride.to,
    stops: ride.stops,
    minutes: ride.minutes,
  };
}

function findRoute(graph, fromStation, toStation) {
  if (fromStation === toStation) {
    return { totalMinutes: 0, legs: [], fromStation, toStation };
  }

  // A direct trip between Choa Chu Kang and one of the personalised
  // stations always uses the given real-world duration, regardless of
  // what the generic model would compute.
  const { cckStation, overrideMap } = graph;
  let override = null;
  if (fromStation === cckStation) override = overrideMap.get(toStation);
  else if (toStation === cckStation) override = overrideMap.get(fromStation);
  if (override) {
    return {
      totalMinutes: override.minutes,
      legs: [{
        type: "special",
        from: fromStation,
        to: toStation,
        minutes: override.minutes,
        label: override.hint,
      }],
      fromStation,
      toStation,
    };
  }

  const full = dijkstraWithPath(graph, fromStation, toStation);
  if (!full) return null;

  const splitKey = (key) => {
    const idx = key.lastIndexOf("::");
    return { station: key.slice(0, idx), line: key.slice(idx + 2) };
  };

  const legs = [];
  let ride = null; // {line, from, to, stops, minutes}

  for (let i = 0; i < full.edges.length; i++) {
    const e = full.edges[i];
    const a = splitKey(full.nodes[i]);
    const b = splitKey(full.nodes[i + 1]);

    if (e.kind === "special") {
      if (ride) { legs.push(finishRide(ride)); ride = null; }
      legs.push({
        type: "special",
        from: a.station,
        to: b.station,
        minutes: e.weight,
        label: e.label,
      });
    } else if (e.kind === "transfer") {
      if (ride) { legs.push(finishRide(ride)); ride = null; }
      legs.push({
        type: "transfer",
        station: a.station,
        fromLine: a.line,
        toLine: b.line,
        minutes: e.weight,
      });
    } else {
      // ride edge
      if (ride && ride.line === e.line && ride.to === a.station) {
        ride.to = b.station;
        ride.stops += 1;
        ride.minutes += e.weight;
      } else {
        if (ride) legs.push(finishRide(ride));
        ride = { line: e.line, from: a.station, to: b.station, stops: 1, minutes: e.weight };
      }
    }
  }
  if (ride) legs.push(finishRide(ride));

  return { totalMinutes: full.totalMinutes, legs, fromStation, toStation };
}

// Renders e.g. 80 -> "1h 20min", 60 -> "1h", 45 -> "45 min", 61 -> "1h 1min".
function formatMinutes(total) {
  if (total <= 0) return "0 min";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

if (typeof module !== "undefined") {
  module.exports = { buildGraph, findRoute, formatMinutes, distributeMinutes };
}
