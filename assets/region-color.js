// Region fills. Prefer each club's primary unless a living neighbor is already
// using a nearly identical swatch. max-contrast is the previous picker.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.assignRegionColors = api.assignRegionColors;
  root.COLOR_OVERRIDES = api.COLOR_OVERRIDES;
  root.IDENTICAL_FLOOR = api.IDENTICAL_FLOOR;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var IDENTICAL_FLOOR = 32;
  // Forces one hex. Empty besides the 2015 Cardinals frame.
  var COLOR_OVERRIDES = { nfl: { "2015": { ARI: "#97233F" } } };

  function parseHex(value) {
    if (typeof value !== "string") return null;
    var hex = value.replace("#", "").trim();
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    return null;
  }

  function luminance(value) {
    var rgb = parseHex(value);
    if (!rgb) return 0.2;
    var linear = rgb.map(function (channel) {
      var unit = channel / 255;
      return unit <= 0.04045 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function rgbDistance(a, b) {
    var left = parseHex(a);
    var right = parseHex(b);
    if (!left || !right) return 40;
    var dr = left[0] - right[0];
    var dg = left[1] - right[1];
    var db = left[2] - right[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function uniqueSwatches(team) {
    var list = [team.c1, team.c2, team.c3].filter(Boolean);
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var key = String(list[i]).toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(list[i]);
    }
    return out.length ? out : ["#3a414c"];
  }

  function brandSwatches(team) {
    return [team.c1, team.c2, team.c3].filter(Boolean);
  }

  function minNeighborDistance(color, neighborColors) {
    if (!neighborColors.length) return Infinity;
    var min = Infinity;
    for (var i = 0; i < neighborColors.length; i++) {
      min = Math.min(min, rgbDistance(color, neighborColors[i]));
    }
    return min;
  }

  function pickMaxContrast(team, neighborColors) {
    var swatches = uniqueSwatches(team);
    var dark = swatches.filter(function (color) {
      return luminance(color) < 0.82;
    });
    var candidates = dark.length ? dark : swatches;
    var best = candidates[0];
    var bestScore = -Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var color = candidates[i];
      var dist = 80;
      for (var n = 0; n < neighborColors.length; n++) dist = Math.min(dist, rgbDistance(color, neighborColors[n]));
      var lum = luminance(color);
      var score = dist + (lum > 0.12 && lum < 0.65 ? 8 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = color;
      }
    }
    return best;
  }

  function pickPreferPrimary(team, neighborColors, floor) {
    var swatches = brandSwatches(team);
    for (var i = 0; i < swatches.length; i++) {
      if (minNeighborDistance(swatches[i], neighborColors) >= floor) return swatches[i];
    }
    return team.c1 || swatches[0] || "#3a414c";
  }

  function pickPrimaryOnly(team) {
    return team.c1 || team.c2 || team.c3 || "#3a414c";
  }

  function neighborList(neighbors, abbr) {
    if (!neighbors || abbr == null) return [];
    var set = typeof neighbors.get === "function" ? neighbors.get(abbr) : neighbors[abbr];
    if (!set) return [];
    return Array.from(set);
  }

  function forcedColor(overrides, sport, season, abbr) {
    if (!overrides || sport == null || season == null || abbr == null) return null;
    var bySport = overrides[sport];
    if (!bySport) return null;
    var bySeason = bySport[String(season)];
    if (!bySeason) return null;
    return bySeason[abbr] || null;
  }

  function assignRegionColors(teams, neighbors, options) {
    var assigned = new Map();
    var list = teams || [];
    if (!list.length) return assigned;
    var settings = options || {};
    var policy = settings.policy || "prefer-primary";
    var floor = settings.identicalFloor == null ? IDENTICAL_FLOOR : settings.identicalFloor;
    var overrides = settings.overrides === undefined ? COLOR_OVERRIDES : settings.overrides;
    var order = list.slice().sort(function (a, b) {
      var aCount = neighborList(neighbors, a.abbr).length;
      var bCount = neighborList(neighbors, b.abbr).length;
      return bCount - aCount;
    });

    function assignOne(team) {
      var forced = forcedColor(overrides, settings.sport, settings.season, team.abbr);
      if (forced) {
        assigned.set(team.abbr, forced);
        return;
      }
      var neighborColors = [];
      var adjacent = neighborList(neighbors, team.abbr);
      for (var i = 0; i < adjacent.length; i++) {
        var color = assigned.get(adjacent[i]);
        if (color) neighborColors.push(color);
      }
      var chosen = team.c1 || "#3a414c";
      if (policy === "max-contrast") chosen = pickMaxContrast(team, neighborColors);
      else if (policy === "primary-only") chosen = pickPrimaryOnly(team);
      else chosen = pickPreferPrimary(team, neighborColors, floor);
      assigned.set(team.abbr, chosen);
    }

    for (var i = 0; i < order.length; i++) assignOne(order[i]);
    for (var pass = 0; pass < 3; pass++) {
      for (var n = 0; n < order.length; n++) assignOne(order[n]);
    }
    return assigned;
  }

  return {
    assignRegionColors: assignRegionColors,
    COLOR_OVERRIDES: COLOR_OVERRIDES,
    IDENTICAL_FLOOR: IDENTICAL_FLOOR,
  };
});
