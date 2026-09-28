// How a region is claimed. Centroid is the default. Later and earlier only
// break ties among living home clubs that share a region. City mode does not
// use this.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.claimRegion = api.claimRegion;
  root.SAME_STADIUM_DEG = api.SAME_STADIUM_DEG;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var SAME_STADIUM_DEG = 1e-3;
  var TIE_KM = 0.05;

  function haversine(lat1, lon1, lat2, lon2) {
    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad;
    var dLon = (lon2 - lon1) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function sameStadium(a, b) {
    return Math.abs(a.lat - b.lat) <= SAME_STADIUM_DEG && Math.abs(a.lon - b.lon) <= SAME_STADIUM_DEG;
  }

  function knownOrder(team, orders) {
    if (!orders || orders[team.abbr] == null || orders[team.abbr] === "") return null;
    var n = Number(orders[team.abbr]);
    return Number.isFinite(n) ? n : null;
  }

  function compareOrder(a, b, direction, orders) {
    var ao = knownOrder(a, orders);
    var bo = knownOrder(b, orders);
    if (ao == null && bo == null) return a.abbr < b.abbr ? -1 : a.abbr > b.abbr ? 1 : 0;
    if (ao == null) return 1;
    if (bo == null) return -1;
    if (ao !== bo) return direction === "earlier" ? ao - bo : bo - ao;
    return a.abbr < b.abbr ? -1 : a.abbr > b.abbr ? 1 : 0;
  }

  function pickByOrder(teams, direction, orders) {
    var best = teams[0];
    for (var i = 1; i < teams.length; i++) if (compareOrder(teams[i], best, direction, orders) < 0) best = teams[i];
    return best.abbr;
  }

  function pickNearest(teams, centroid, orders, tieBreak) {
    var lat = centroid.lat, lon = centroid.lon, min = Infinity, i, d, dists = [];
    for (i = 0; i < teams.length; i++) {
      d = haversine(lat, lon, teams[i].lat, teams[i].lon);
      dists.push(d);
      if (d < min) min = d;
    }
    var tied = [];
    for (i = 0; i < teams.length; i++) if (dists[i] <= min + TIE_KM) tied.push(teams[i]);
    for (i = 0; i < teams.length; i++) {
      if (tied.indexOf(teams[i]) !== -1) continue;
      for (var s = 0; s < tied.length; s++) if (sameStadium(teams[i], tied[s])) { tied.push(teams[i]); break; }
    }
    if (tied.length === 1) return tied[0].abbr;
    return pickByOrder(tied, tieBreak === "earlier" ? "earlier" : "later", orders);
  }

  function claimRegion(input) {
    var seasonHomes = input.seasonHomes || [];
    var livingHomes = input.livingHomes || [];
    var remaining = input.remaining || [];
    var centroid = input.centroid || { lat: 0, lon: 0 };
    var rule = input.rule || "centroid";
    var orders = input.orders || {};
    var alive = {};
    for (var i = 0; i < remaining.length; i++) alive[remaining[i].abbr] = true;
    if (seasonHomes.length === 1 && alive[seasonHomes[0].abbr]) return seasonHomes[0].abbr;
    if (livingHomes.length === 1) return livingHomes[0].abbr;
    if (livingHomes.length > 1) return pickNearestOrRule(livingHomes, centroid, rule, orders);
    return pickNearest(remaining, centroid, orders, rule === "earlier" ? "earlier" : "later");
  }

  function pickNearestOrRule(teams, centroid, rule, orders) {
    if (rule === "later" || rule === "earlier") return pickByOrder(teams, rule, orders);
    return pickNearest(teams, centroid, orders, "later");
  }

  return { claimRegion: claimRegion, SAME_STADIUM_DEG: SAME_STADIUM_DEG, sameStadium: sameStadium };
});
