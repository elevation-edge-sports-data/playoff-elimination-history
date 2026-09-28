// City fill (internal key "split") for the 3D map. Land rings are clipped
// to each Voronoi cell. A clipped corner is often a 3-vertex ring; that
// piece is kept when its area is large enough to see. The Voronoi frame is
// the land bounds plus a pad so every land vertex falls inside some cell.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.citySplit = api;
  root.normalizeRing = api.normalizeRing;
  root.clipToConvex = api.clipToConvex;
  root.shouldKeepPiece = api.shouldKeepPiece;
  root.voronoiExtent = api.voronoiExtent;
  root.piecesForCell = api.piecesForCell;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function asPoint(p) {
    if (Array.isArray(p)) return { x: +p[0], y: +p[1] };
    return { x: +p.x, y: +p.y };
  }

  function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  // Open ring: no consecutive duplicates, no repeated closing vertex, no zero-length edge.
  function normalizeRing(points) {
    if (!points || typeof points.length !== "number") return [];
    var ring = [];
    for (var i = 0; i < points.length; i++) {
      var p = asPoint(points[i]);
      if (!isFinite(p.x) || !isFinite(p.y)) continue;
      if (ring.length && samePoint(ring[ring.length - 1], p)) continue;
      ring.push(p);
    }
    while (ring.length >= 2 && samePoint(ring[0], ring[ring.length - 1])) ring.pop();
    return ring;
  }

  function signedArea(pts) {
    var n = pts.length;
    if (n < 3) return 0;
    var sum = 0;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      sum += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    return sum / 2;
  }

  function uniqueCount(pts) {
    var seen = Object.create(null);
    var n = 0;
    for (var i = 0; i < pts.length; i++) {
      var key = pts[i].x + "\0" + pts[i].y;
      if (seen[key]) continue;
      seen[key] = 1;
      n++;
    }
    return n;
  }

  // Sutherland-Hodgman. The clip is convex and wound so the interior is to the left
  // of each edge. The result is an open ring (the first vertex is not repeated).
  function inside(p, a, b) {
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-8;
  }

  function edgeIntersect(p, q, a, b) {
    var ix = q.x - p.x, iy = q.y - p.y, jx = b.x - a.x, jy = b.y - a.y;
    var den = ix * jy - iy * jx;
    var l = Math.abs(den) < 1e-12 ? 0 : ((a.x - p.x) * jy - (a.y - p.y) * jx) / den;
    return { x: p.x + l * ix, y: p.y + l * iy };
  }

  function clipToConvex(subject, convexClip) {
    var output = [];
    var input = subject || [];
    for (var i = 0; i < input.length; i++) output.push(asPoint(input[i]));
    var clip = [];
    var raw = convexClip || [];
    for (var k = 0; k < raw.length; k++) clip.push(asPoint(raw[k]));
    if (clip.length < 3) return [];
    for (var e = 0; e < clip.length; e++) {
      var a = clip[e];
      var b = clip[(e + 1) % clip.length];
      var poly = output;
      output = [];
      if (poly.length === 0) break;
      for (var j = 0; j < poly.length; j++) {
        var cur = poly[j];
        var prev = poly[(j + poly.length - 1) % poly.length];
        var curIn = inside(cur, a, b);
        var prevIn = inside(prev, a, b);
        if (curIn) {
          if (!prevIn) output.push(edgeIntersect(prev, cur, a, b));
          output.push(cur);
        } else if (prevIn) {
          output.push(edgeIntersect(prev, cur, a, b));
        }
      }
    }
    return output;
  }

  function shouldKeepPiece(ring, minArea) {
    var pts = normalizeRing(ring);
    if (uniqueCount(pts) < 3) return false;
    var min = minArea == null ? 0 : +minArea;
    return Math.abs(signedArea(pts)) >= min;
  }

  function voronoiExtent(landRings, extraPad) {
    var pad = extraPad == null ? 2000 : +extraPad;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var rings = landRings || [];
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      if (!ring || typeof ring.length !== "number") continue;
      for (var i = 0; i < ring.length; i++) {
        var p = asPoint(ring[i]);
        if (!isFinite(p.x) || !isFinite(p.y)) continue;
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (minX === Infinity) return [-pad, -pad, pad, pad];
    return [minX - pad, minY - pad, maxX + pad, maxY + pad];
  }

  function piecesForCell(landRings, cellRing, minArea) {
    var clip = normalizeRing(cellRing);
    if (uniqueCount(clip) < 3) return [];
    if (signedArea(clip) < 0) clip.reverse();
    var out = [];
    var rings = landRings || [];
    for (var i = 0; i < rings.length; i++) {
      var subject = normalizeRing(rings[i]);
      if (uniqueCount(subject) < 3) continue;
      var piece = clipToConvex(subject, clip);
      if (shouldKeepPiece(piece, minArea)) out.push(normalizeRing(piece));
    }
    return out;
  }

  return {
    normalizeRing: normalizeRing,
    clipToConvex: clipToConvex,
    shouldKeepPiece: shouldKeepPiece,
    voronoiExtent: voronoiExtent,
    piecesForCell: piecesForCell
  };
});
