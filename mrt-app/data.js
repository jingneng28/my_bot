// Singapore MRT network data for the route planner.
//
// Model:
//  - Every line is described as one or more linear "segments" of consecutive
//    stations. Consecutive stations on the same segment are 3 minutes apart.
//  - Interchange stations (a station name appearing on more than one line)
//    cost 3 minutes to transfer between lines.
//  - A hand-picked list of real travel times from Choa Chu Kang (given by
//    the user) overrides the generic model for those specific destinations,
//    in both directions.

const LINE_INFO = {
  NS: { name: "North South Line", color: "#d42e12" },
  EW: { name: "East West Line", color: "#009645" },
  NE: { name: "North East Line", color: "#9900aa" },
  CC: { name: "Circle Line", color: "#fa9e0d" },
  CE: { name: "Circle Line (Marina Bay ext.)", color: "#fa9e0d" },
  DT: { name: "Downtown Line", color: "#005ec4" },
  TE: { name: "Thomson-East Coast Line", color: "#9d5b25" },
};

// Each segment is a straight run of stations on one line. A station can
// appear on multiple segments/lines (that's how interchanges work).
const SEGMENTS = [
  {
    line: "NS",
    stations: [
      "Jurong East", "Bukit Batok", "Bukit Gombak", "Choa Chu Kang", "Yew Tee",
      "Kranji", "Marsiling", "Woodlands", "Admiralty", "Sembawang", "Yishun",
      "Khatib", "Yio Chu Kang", "Ang Mo Kio", "Bishan", "Braddell", "Toa Payoh",
      "Novena", "Newton", "Orchard", "Somerset", "Dhoby Ghaut", "City Hall",
      "Raffles Place", "Marina Bay", "Marina South Pier",
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
    line: "DT",
    stations: [
      "Bukit Panjang", "Cashew", "Hillview", "Beauty World", "King Albert Park",
      "Sixth Avenue", "Tan Kah Kee", "Botanic Gardens", "Stevens", "Newton",
      "Little India", "Rochor", "Bugis", "Promenade", "Bayfront", "Downtown",
      "Telok Ayer", "Chinatown", "Fort Canning", "Bencoolen", "Jalan Besar",
      "Bendemeer", "Geylang Bahru", "Mattar", "MacPherson", "Ubi",
      "Kaki Bukit", "Bedok North", "Bedok Reservoir", "Tampines West",
      "Tampines", "Tampines East", "Upper Changi", "Expo",
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

// Personalised real-world travel times from Choa Chu Kang, given by the
// user. These override the generic 3-min-per-stop model whenever a query
// involves Choa Chu Kang and one of these stations (either direction).
const CCK = "Choa Chu Kang";
const CCK_OVERRIDES = [
  { to: "Bukit Panjang", minutes: 15 },
  { to: "Buona Vista", minutes: 25 },
  { to: "Yishun", minutes: 25 },
  { to: "Tan Kah Kee", minutes: 30 },
  { to: "Kent Ridge", minutes: 35 },
  { to: "Bishan", minutes: 40 },
  { to: "Newton", minutes: 40 },
  { to: "Outram Park", minutes: 40 },
  { to: "Tanjong Pagar", minutes: 45 },
  { to: "Paya Lebar", minutes: 57, hint: "Take NS Line to Jurong East, then change to the East West Line (green) to Paya Lebar." },
  { to: "Bedok", minutes: 60 },
  { to: "MacPherson", minutes: 60, hint: "Take NS Line to Bishan, then change to the Circle Line (orange) to MacPherson." },
  { to: "Changi Airport", minutes: 80, hint: "Take NS Line to Jurong East, then change to the East West Line (green) all the way to Changi Airport." },
  { to: "Pasir Ris", minutes: 80, hint: "Take NS Line to Jurong East, then change to the East West Line (green) to Pasir Ris." },
];

if (typeof module !== "undefined") {
  module.exports = { LINE_INFO, SEGMENTS, CCK, CCK_OVERRIDES };
}
