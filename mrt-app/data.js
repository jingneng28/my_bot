// Singapore MRT network data for the route planner.
//
// Model:
//  - Every line is described as one or more linear "segments" of consecutive
//    stations. By default, consecutive stations cost LINE_DEFAULT_MINUTES
//    for that line (most lines: 3 min/stop; Downtown Line, which tends to
//    run shorter hops: 2 min/stop), and transfers cost DEFAULT_TRANSFER_MINUTES.
//  - These are just defaults, not fixed truths: CALIBRATIONS below tunes the
//    per-stop and per-transfer minutes (to 2/3/4/5) along the specific real
//    corridors the user gave us measured totals for, so a station like
//    Bishan costs the same 40 min whether it's your destination or just a
//    stop on the way somewhere else.
//  - CCK_OVERRIDES are the user's own measured door-to-door times between
//    Choa Chu Kang and a specific station (either direction). These are
//    always authoritative for that exact trip, AND are added to the map as
//    a real (if a little magic) direct link, so they can also be used as a
//    sensible stepping stone for other journeys that pass through them.

const LINE_INFO = {
  NS: { name: "North South Line", color: "#d42e12" },
  EW: { name: "East West Line", color: "#009645" },
  NE: { name: "North East Line", color: "#9900aa" },
  CC: { name: "Circle Line", color: "#fa9e0d" },
  CE: { name: "Circle Line (Marina Bay ext.)", color: "#fa9e0d" },
  DT: { name: "Downtown Line", color: "#005ec4" },
  TE: { name: "Thomson-East Coast Line", color: "#9d5b25" },
};

// Default minutes per ride hop, by line. The Downtown Line (and stretches
// near LRT interchanges, per the user's note) tend to run shorter hops.
const LINE_DEFAULT_MINUTES = { NS: 3, EW: 3, NE: 3, CC: 3, CE: 3, DT: 2, TE: 3 };
const DEFAULT_TRANSFER_MINUTES = 3;
const MIN_EDGE_MINUTES = 2;
const MAX_EDGE_MINUTES = 5;

// Each segment is a straight run of stations on one line. A station can
// appear on multiple segments/lines (that's how interchanges work).
const SEGMENTS = [
  {
    line: "NS",
    stations: [
      "Jurong East", "Bukit Batok", "Bukit Gombak", "Choa Chu Kang", "Yew Tee",
      "Kranji", "Marsiling", "Woodlands", "Admiralty", "Sembawang", "Canberra",
      "Yishun", "Khatib", "Yio Chu Kang", "Ang Mo Kio", "Bishan", "Braddell",
      "Toa Payoh", "Novena", "Newton", "Orchard", "Somerset", "Dhoby Ghaut",
      "City Hall", "Raffles Place", "Marina Bay", "Marina South Pier",
    ],
  },
  {
    line: "EW",
    stations: [
      "Pasir Ris", "Tampines", "Simei", "Tanah Merah", "Bedok", "Kembangan",
      "Eunos", "Paya Lebar", "Aljunied", "Kallang", "Lavender", "Bugis",
      "City Hall", "Raffles Place", "Tanjong Pagar", "Outram Park",
      "Tiong Bahru", "Redhill", "Queenstown", "Commonwealth", "Buona Vista",
      "Dover", "Clementi", "Jurong East", "Chinese Garden", "Lakeside",
      "Boon Lay", "Pioneer", "Joo Koon", "Gul Circle", "Tuas Crescent",
      "Tuas West Road", "Tuas Link",
    ],
  },
  {
    // Changi Airport branch, still East West Line service
    line: "EW",
    stations: ["Tanah Merah", "Expo", "Changi Airport"],
  },
  {
    line: "NE",
    stations: [
      "HarbourFront", "Outram Park", "Chinatown", "Clarke Quay", "Dhoby Ghaut",
      "Little India", "Farrer Park", "Boon Keng", "Potong Pasir", "Woodleigh",
      "Serangoon", "Kovan", "Hougang", "Buangkok", "Sengkang", "Punggol",
      "Punggol Coast",
    ],
  },
  {
    line: "CC",
    stations: [
      "Dhoby Ghaut", "Bras Basah", "Esplanade", "Promenade", "Nicoll Highway",
      "Stadium", "Mountbatten", "Dakota", "Paya Lebar", "MacPherson",
      "Tai Seng", "Bartley", "Serangoon", "Lorong Chuan", "Bishan",
      "Marymount", "Caldecott", "Botanic Gardens", "Farrer Road",
      "Holland Village", "Buona Vista", "one-north", "Kent Ridge",
      "Haw Par Villa", "Pasir Panjang", "Labrador Park", "Telok Blangah",
      "HarbourFront",
    ],
  },
  {
    // Circle Line stage 6 spur to Marina Bay
    line: "CE",
    stations: ["Promenade", "Bayfront", "Marina Bay"],
  },
  {
    // Circle Line southern waterfront extension (newer stations)
    line: "CC",
    stations: ["HarbourFront", "Keppel", "Cantonment"],
  },
  {
    line: "DT",
    stations: [
      "Bukit Panjang", "Cashew", "Hillview", "Hume", "Beauty World",
      "King Albert Park", "Sixth Avenue", "Tan Kah Kee", "Botanic Gardens",
      "Stevens", "Newton", "Little India", "Rochor", "Bugis", "Promenade",
      "Bayfront", "Downtown", "Telok Ayer", "Chinatown", "Fort Canning",
      "Bencoolen", "Jalan Besar", "Bendemeer", "Geylang Bahru", "Mattar",
      "MacPherson", "Ubi", "Kaki Bukit", "Bedok North", "Bedok Reservoir",
      "Tampines West", "Tampines", "Tampines East", "Upper Changi", "Expo",
    ],
  },
  {
    line: "TE",
    stations: [
      "Woodlands North", "Woodlands", "Woodlands South", "Springleaf",
      "Lentor", "Mayflower", "Bright Hill", "Upper Thomson", "Caldecott",
      "Stevens", "Napier", "Orchard Boulevard", "Orchard", "Great World",
      "Havelock", "Outram Park", "Maxwell", "Shenton Way", "Marina Bay",
      "Gardens by the Bay", "Founders' Memorial", "Tanjong Rhu",
      "Katong Park", "Tanjong Katong", "Marine Parade", "Marine Terrace",
      "Siglap", "Bayshore",
    ],
  },
];

// Personalised real-world door-to-door times from Choa Chu Kang, given by
// the user. Always authoritative for that exact trip (either direction).
const CCK = "Choa Chu Kang";
const CCK_OVERRIDES = [
  { to: "Jurong East", minutes: 10, hint: "Take the NS Line (red) directly to Jurong East." },
  { to: "Clementi", minutes: 20, hint: "NS Line to Jurong East, then change to the East West Line (green) to Clementi." },
  { to: "Bukit Panjang", minutes: 15, hint: "Includes about 5 min for the transfer." },
  { to: "Buona Vista", minutes: 26 },
  { to: "Yishun", minutes: 25, hint: "Take the NS Line (red) directly to Yishun." },
  { to: "Tan Kah Kee", minutes: 30 },
  { to: "Kent Ridge", minutes: 35 },
  { to: "Ang Mo Kio", minutes: 36, hint: "Take the NS Line (red) directly to Ang Mo Kio." },
  { to: "Bishan", minutes: 40, hint: "Take the NS Line (red) directly to Bishan." },
  { to: "Newton", minutes: 40 },
  { to: "Outram Park", minutes: 40 },
  { to: "Tanjong Pagar", minutes: 45 },
  { to: "Bugis", minutes: 45, hint: "Take the NS Line to Bukit Panjang, then change to the Downtown Line (blue) to Bugis." },
  { to: "Serangoon", minutes: 50, hint: "NS Line to Bishan (3 min to change), then Circle Line (orange) to Serangoon." },
  { to: "Paya Lebar", minutes: 57, hint: "NS Line to Jurong East, then change to the East West Line (green) to Paya Lebar. (A Circle Line route via Bishan also works, about 1h 1min.)" },
  { to: "Bedok", minutes: 60 },
  { to: "MacPherson", minutes: 60, hint: "NS Line to Bishan, then change to the Circle Line (orange) to MacPherson." },
  { to: "Changi Airport", minutes: 80, hint: "NS Line to Jurong East, then change to the East West Line (green) all the way to Changi Airport." },
  { to: "Pasir Ris", minutes: 80, hint: "NS Line to Jurong East, then change to the East West Line (green) to Pasir Ris." },
];

// Calibration steps: real corridors where the user's numbers let us tune
// individual stop-to-stop and transfer minutes (instead of the generic
// default), applied in order. Each "ride" step only adjusts the hops in
// its station list that haven't already been fixed by an earlier step, so
// later, longer entries build on top of earlier, shorter ones.
const CALIBRATIONS = [
  { type: "ride", line: "NS", stations: ["Choa Chu Kang", "Bukit Gombak", "Bukit Batok", "Jurong East"], totalMinutes: 10 },
  { type: "transfer", station: "Jurong East", lineA: "NS", lineB: "EW", minutes: 5 },
  { type: "ride", line: "EW", stations: ["Jurong East", "Clementi"], totalMinutes: 5 },
  { type: "ride", line: "NS", stations: ["Choa Chu Kang", "Yew Tee", "Kranji", "Marsiling", "Woodlands", "Admiralty", "Sembawang", "Canberra", "Yishun"], totalMinutes: 25 },
  { type: "ride", line: "NS", stations: ["Yishun", "Khatib", "Yio Chu Kang", "Ang Mo Kio"], totalMinutes: 11 },
  { type: "ride", line: "NS", stations: ["Ang Mo Kio", "Bishan"], totalMinutes: 4 },
  { type: "transfer", station: "Bishan", lineA: "NS", lineB: "CC", minutes: 3 },
  { type: "ride", line: "CC", stations: ["Bishan", "Lorong Chuan", "Serangoon"], totalMinutes: 7 },
  { type: "ride", line: "CC", stations: ["Serangoon", "Bartley", "Tai Seng", "MacPherson"], totalMinutes: 10 },
  { type: "ride", line: "CC", stations: ["MacPherson", "Paya Lebar"], totalMinutes: 1 },
  { type: "ride", line: "DT", stations: ["Bukit Panjang", "Cashew", "Hillview", "Hume", "Beauty World", "King Albert Park", "Sixth Avenue", "Tan Kah Kee"], totalMinutes: 15 },
  { type: "ride", line: "DT", stations: ["Tan Kah Kee", "Botanic Gardens", "Stevens", "Newton", "Little India", "Rochor", "Bugis"], totalMinutes: 15 },
];

if (typeof module !== "undefined") {
  module.exports = {
    LINE_INFO, LINE_DEFAULT_MINUTES, DEFAULT_TRANSFER_MINUTES,
    MIN_EDGE_MINUTES, MAX_EDGE_MINUTES, SEGMENTS, CCK, CCK_OVERRIDES, CALIBRATIONS,
  };
}
