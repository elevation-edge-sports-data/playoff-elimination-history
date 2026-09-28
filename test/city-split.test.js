const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  normalizeRing,
  clipToConvex,
  shouldKeepPiece,
  voronoiExtent,
  piecesForCell,
} = require("../assets/city-split.js");

function area(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j].x * ring[i].y - ring[i].x * ring[j].y;
  }
  return Math.abs(sum) / 2;
}

function centroid(ring) {
  let x = 0, y = 0;
  for (const p of ring) { x += p.x; y += p.y; }
  return [x / ring.length, y / ring.length];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function hasPoint(ring, x, y, eps) {
  const e = eps == null ? 1e-6 : eps;
  return ring.some((p) => Math.abs(p.x - x) <= e && Math.abs(p.y - y) <= e);
}

// Large CCW triangle covering x + y <= limit around the SW of the test square.
function swCell(limit) {
  return [[-1000, -1000], [1000 + limit, -1000], [-1000, 1000 + limit]];
}

// Large CCW triangle covering x + y >= limit (the opposite half-plane).
function neCell(limit) {
  return [[-1000, 1000 + limit], [1000 + limit, -1000], [2000, 2000]];
}

const land = [[[0, 0], [10, 0], [10, 10], [0, 10]]];
const near = [0.5, 0.5];
const far = [8, 8];
// Perpendicular bisector of (0.5, 0.5) and (8, 8) is x + y = 8.5.
// That cuts the SW corner of the square into a triangle owned by `near`.
const limit = 8.5;
const minArea = 0.04;
const nearPieces = piecesForCell(land, swCell(limit), minArea);
const farPieces = piecesForCell(land, neCell(limit), minArea);

assert.equal(nearPieces.length, 1);
assert.equal(farPieces.length, 1);
const corner = nearPieces[0];
const rest = farPieces[0];
assert.equal(corner.length, 3, "open triangular clip must be kept");
assert.ok(corner.length < 4, "the old t.length<4 continue would have dropped this piece");
assert.ok(hasPoint(corner, 0, 0));
assert.ok(!hasPoint(corner, 10, 10));
assert.ok(hasPoint(rest, 10, 10));
assert.ok(!hasPoint(rest, 0, 0));
assert.ok(dist(centroid(corner), near) < dist(centroid(corner), far));
assert.ok(dist(centroid(rest), far) < dist(centroid(rest), near));
assert.ok(Math.abs(area(corner) + area(rest) - 100) < 1e-6);

const closed = normalizeRing([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
assert.equal(closed.length, 4);
assert.deepStrictEqual(closed.map((p) => [p.x, p.y]), [[0, 0], [10, 0], [10, 10], [0, 10]]);
const messy = normalizeRing([[0, 0], [0, 0], [10, 0], [10, 0], [10, 10], [0, 10], [0, 10], [0, 0]]);
assert.equal(messy.length, 4);
assert.ok(!(messy[0].x === messy[3].x && messy[0].y === messy[3].y));

// A hairline corner is under minArea. A visible corner triangle is kept.
const floor = 1;
assert.equal(piecesForCell(land, swCell(0.2), floor).length, 0);
assert.equal(shouldKeepPiece([[0, 0], [0.2, 0], [0, 0.2]], floor), false);
const visible = piecesForCell(land, swCell(4), floor);
assert.equal(visible.length, 1);
assert.equal(visible[0].length, 3);
assert.ok(area(visible[0]) >= floor);
assert.equal(shouldKeepPiece(visible[0], floor), true);
assert.ok(hasPoint(visible[0], 0, 0));

// A clockwise cell still clips to its interior, because piecesForCell winds it CCW.
const cwBox = [[-1, 11], [11, 11], [11, -1], [-1, -1]];
const contained = piecesForCell(land, cwBox, 0);
assert.equal(contained.length, 1);
assert.equal(contained[0].length, 4);
assert.ok(Math.abs(area(contained[0]) - 100) < 1e-6);

const outside = clipToConvex([[0, 0], [10, 0], [10, 10], [0, 10]], [[20, 20], [30, 20], [30, 30], [20, 30]]);
assert.equal(outside.length, 0);

const rings = [[[0, 0], [10, 0], [10, 5], [0, 0]], [[-3, 2], [4, 8]]];
const ext = voronoiExtent(rings, 2000);
assert.deepStrictEqual(ext, [-3 - 2000, 0 - 2000, 10 + 2000, 8 + 2000]);
assert.deepStrictEqual(voronoiExtent(rings), ext);
for (const ring of rings) {
  for (const p of ring) {
    assert.ok(p[0] >= ext[0] && p[0] <= ext[2]);
    assert.ok(p[1] >= ext[1] && p[1] <= ext[3]);
    assert.ok(p[0] - 2000 >= ext[0] - 1e-9);
    assert.ok(p[0] + 2000 <= ext[2] + 1e-9);
    assert.ok(p[1] - 2000 >= ext[1] - 1e-9);
    assert.ok(p[1] + 2000 <= ext[3] + 1e-9);
  }
}
const xy = voronoiExtent([[{ x: -5, y: 1 }, { x: 2, y: -4 }]], 10);
assert.deepStrictEqual(xy, [-15, -14, 12, 11]);

const app = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");
const ekStart = app.indexOf("function Ek(");
const ekEnd = app.indexOf("function Dk(", ekStart);
assert.ok(ekStart > 0 && ekEnd > ekStart);
const ek = app.slice(ekStart, ekEnd);
assert.equal(/length<4/.test(ek), false);
assert.match(ek, /globalThis\.citySplit/);
assert.match(ek, /normalizeRing/);
assert.match(ek, /piecesForCell/);
assert.match(ek, /voronoiExtent\(o\)/);
assert.match(ek, /i\.length===1/);
assert.match(ek, /t\.length<3/);
assert.equal(ek.includes("-240"), false);
assert.match(app, /l!==`split`/);
assert.match(app, /Ek\(e,m,g\.ox,g\.oy,r,n\)/);
assert.match(app, /voronoi\(\[-2e3,-2e3,t\+2e3,n\+2e3\]\)/);
assert.match(app, /aria-label":`Claim rule`/);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const splitAt = html.indexOf("assets/city-split.js");
const appAt = html.indexOf("assets/app.js");
assert.ok(splitAt !== -1 && splitAt < appAt);

console.log("city-split tests passed");
