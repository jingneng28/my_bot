// Route-finding engine: Dijkstra's algorithm over a graph whose nodes are
// (station, line) pairs, so we can tell a same-line ride apart from a
// line-change transfer and correctly cost/describe each.

const RIDE_MINUTES = 3;
const TRANSFER_MINUTES = 3;

function buildGraph(LINE_INFO, SEGMENTS, CCK, CCK_OVERRIDES) {
  const nodeKey = (station, line) => `${station}${line}`;
  const adj = new Map(); // nodeKey -> [{to, weight, kind, line, label}]
  const stationLines = new Map(); // station -> Set(line)
  const allStations = new Set();

  function ensureNode(key) {
    if (!adj.has(key)) adj.set(key, []);
  }

  function addEdge(a, b, weight, kind, line, label) {
    ensureNode(a);
    ensureNode(b);
    adj.get(a).push({ to: b, weight, kind, line, label });
    adj.get(b).push({ to: a, weight, kind, line, label });
  }

  function addLine(station, line) {
    allStations.add(station);
    if (!stationLines.has(station)) stationLines.set(station, new Set());
    stationLines.get(station).add(line);
  }

  // Ride edges from each linear segment.
  for (const seg of SEGMENTS) {
    const { line, stations } = seg;
    stations.forEach((s) => addLine(s, line));
    for (let i = 0; i < stations.length - 1; i++) {
      const a = nodeKey(stations[i], line);
      const b = nodeKey(stations[i + 1], line);
      addEdge(a, b, RIDE_MINUTES, "ride", line, null);
    }
  }

  // Transfer edges at every interchange (station served by 2+ lines).
  for (const [station, lines] of stationLines.entries()) {
    const lineArr = Array.from(lines);
    for (let i = 0; i < lineArr.length; i++) {
      for (let j = i + 1; j < lineArr.length; j++) {
        addEdge(
          nodeKey(station, lineArr[i]),
          nodeKey(station, lineArr[j]),
          TRANSFER_MINUTES,
          "transfer",
          null,
          null
        );
      }
    }
  }

  // Personalised Choa Chu Kang overrides are intentionally NOT added as
  // graph edges: they must be authoritative for a direct CCK<->X query,
  // not just one candidate that a shortest-path search might discard in
  // favour of a numerically smaller combination. They're looked up
  // directly in findRoute() instead. Build a quick lookup map here.
  const overrideMap = new Map(); // destination station -> {minutes, hint}
  for (const override of CCK_OVERRIDES) {
    overrideMap.set(override.to, { minutes: override.minutes, hint: override.hint || null });
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
    minutes: ride.stops * RIDE_MINUTES,
  };
}

function findRoute(graph, fromStation, toStation) {
  if (fromStation === toStation) {
    return { totalMinutes: 0, legs: [], fromStation, toStation };
  }

  // A direct trip between Choa Chu Kang and one of the personalised
  // stations always uses the given real-world duration, regardless of
  // what the generic 3-min-per-stop model would compute.
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
    const idx = key.lastIndexOf("");
    return { station: key.slice(0, idx), line: key.slice(idx + 1) };
  };

  const legs = [];
  let ride = null; // {line, from, to, stops}

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
      } else {
        if (ride) legs.push(finishRide(ride));
        ride = { line: e.line, from: a.station, to: b.station, stops: 1 };
      }
    }
  }
  if (ride) legs.push(finishRide(ride));

  return { totalMinutes: full.totalMinutes, legs, fromStation, toStation };
}

if (typeof module !== "undefined") {
  module.exports = { buildGraph, findRoute, RIDE_MINUTES, TRANSFER_MINUTES };
}
