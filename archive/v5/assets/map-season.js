// Internal keys are a single year. NFL is the kickoff year. NHL and NBA are the
// Cup/Finals year, so the 2013-14 season is "2014".
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.mapSeason = api.mapSeason;
  root.seasonLabel = api.seasonLabel;
  root.clampStepIndex = api.clampStepIndex;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Used only when the destination sport has no seasons. Same values as the sport catalog.
  var LATEST_SEASON = { nhl: "2026", nba: "2026", nfl: "2025" };

  function winterSport(sport) {
    return sport === "nhl" || sport === "nba";
  }

  function asYear(value) {
    var n = Number(value);
    return Number.isInteger(n) ? n : NaN;
  }

  function yearsOf(availableYearsBySport, sport) {
    var list = availableYearsBySport && availableYearsBySport[sport];
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null);
    var years = [];
    for (var i = 0; i < list.length; i++) {
      var n = asYear(list[i]);
      if (!Number.isInteger(n) || seen[n]) continue;
      seen[n] = true;
      years.push(n);
    }
    return years;
  }

  function mappedYear(fromSport, fromYear, toSport) {
    var year = asYear(fromYear);
    if (!Number.isInteger(year)) return NaN;
    if (fromSport === toSport) return year;
    if (fromSport === "nfl" && winterSport(toSport)) return year + 1;
    if (winterSport(fromSport) && toSport === "nfl") return year - 1;
    return year;
  }

  function mapSeason(fromSport, fromYear, toSport, availableYearsBySport) {
    var years = yearsOf(availableYearsBySport, toSport);
    if (years.length === 0) return Object.prototype.hasOwnProperty.call(LATEST_SEASON, toSport) ? LATEST_SEASON[toSport] : null;
    var target = mappedYear(fromSport, fromYear, toSport);
    if (!Number.isInteger(target)) return String(Math.max.apply(null, years));
    if (years.indexOf(target) !== -1) return String(target);
    // Equidistant seasons resolve to the earlier year.
    var best = years[0];
    var bestDist = Math.abs(years[0] - target);
    for (var i = 1; i < years.length; i++) {
      var dist = Math.abs(years[i] - target);
      if (dist < bestDist || (dist === bestDist && years[i] < best)) {
        best = years[i];
        bestDist = dist;
      }
    }
    return String(best);
  }

  function seasonLabel(sport, year) {
    var y = asYear(year);
    if (!Number.isInteger(y)) return year == null ? "" : String(year);
    if (sport === "nfl") return String(y);
    return (y - 1) + "\u2013" + y;
  }

  function clampStepIndex(stepIndex, maxStep) {
    var step = Number(stepIndex);
    var max = Number(maxStep);
    if (!Number.isFinite(step) || step < 0) step = 0;
    if (!Number.isFinite(max) || max < 0) return 0;
    return Math.min(Math.floor(step), Math.floor(max));
  }

  return { mapSeason: mapSeason, seasonLabel: seasonLabel, clampStepIndex: clampStepIndex };
});
