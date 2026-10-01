// After a season animation ends, Previous walks older and Next walks newer.
// Sport Cycle visits NHL, then NBA, then NFL inside one winter, then the
// older winter. NFL's season key is the kickoff year, one below that winter
// (NHL/NBA 2026 is 2025-26, NFL 2025). Next walks that list backward.
// With Sport Cycle off, Previous and Next stay inside the current sport.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.sportCycleStep = api.sportCycleStep;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function yearList(value) {
    var list = Array.isArray(value) ? value : [];
    var seen = Object.create(null);
    var years = [];
    for (var i = 0; i < list.length; i++) {
      var n = Number(list[i]);
      if (!Number.isInteger(n) || seen[n]) continue;
      seen[n] = true;
      years.push(n);
    }
    years.sort(function (a, b) { return b - a; });
    return years.map(String);
  }

  function yearSet(value) {
    var set = Object.create(null);
    var years = yearList(value);
    for (var i = 0; i < years.length; i++) set[years[i]] = true;
    return set;
  }

  function sameSportStep(sport, season, direction, years) {
    var list = yearList(years);
    if (!list.length) return null;
    var key = String(season);
    var i = list.indexOf(key);
    if (i < 0) return { sport: sport, season: list[0] };
    var j = direction === "next" ? (i - 1 + list.length) % list.length : (i + 1) % list.length;
    return { sport: sport, season: list[j] };
  }

  // Newest winter first. Within a winter: NHL, NBA, then NFL of winter-1.
  function cycleSlots(yearsBySport) {
    var bags = {
      nhl: yearSet(yearsBySport && yearsBySport.nhl),
      nba: yearSet(yearsBySport && yearsBySport.nba),
      nfl: yearSet(yearsBySport && yearsBySport.nfl)
    };
    var seen = Object.create(null);
    var winters = [];
    function addWinter(n) {
      if (!Number.isInteger(n) || seen[n]) return;
      seen[n] = true;
      winters.push(n);
    }
    Object.keys(bags.nhl).forEach(function (y) { addWinter(Number(y)); });
    Object.keys(bags.nba).forEach(function (y) { addWinter(Number(y)); });
    Object.keys(bags.nfl).forEach(function (y) { addWinter(Number(y) + 1); });
    winters.sort(function (a, b) { return b - a; });
    var slots = [];
    for (var i = 0; i < winters.length; i++) {
      var winter = winters[i];
      var key = String(winter);
      if (bags.nhl[key]) slots.push({ sport: "nhl", season: key });
      if (bags.nba[key]) slots.push({ sport: "nba", season: key });
      var nflKey = String(winter - 1);
      if (bags.nfl[nflKey]) slots.push({ sport: "nfl", season: nflKey });
    }
    return slots;
  }

  function sportCycleStep(options) {
    var opts = options || {};
    var sport = opts.sport;
    var season = opts.season == null ? "" : String(opts.season);
    var direction = opts.direction === "next" ? "next" : "prev";
    var yearsBySport = opts.yearsBySport || {};
    if (!opts.sportCycle) return sameSportStep(sport, season, direction, yearsBySport[sport]);
    var slots = cycleSlots(yearsBySport);
    if (!slots.length) return null;
    var i = -1;
    for (var k = 0; k < slots.length; k++) {
      if (slots[k].sport === sport && slots[k].season === season) {
        i = k;
        break;
      }
    }
    if (i < 0) return { sport: slots[0].sport, season: slots[0].season };
    var n = slots.length;
    var j = direction === "next" ? (i - 1 + n) % n : (i + 1) % n;
    return { sport: slots[j].sport, season: slots[j].season };
  }

  return { sportCycleStep: sportCycleStep };
});
