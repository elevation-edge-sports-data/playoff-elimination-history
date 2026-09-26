const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { claimRegion } = require("../assets/claim-rule.js");

const giants = { abbr: "NYG", lat: 40.8128, lon: -74.0742 };
const jets = { abbr: "NYJ", lat: 40.8128, lon: -74.0742 };
const eagles = { abbr: "PHI", lat: 39.9008, lon: -75.1675 };
const bills = { abbr: "BUF", lat: 42.7738, lon: -78.787 };
const orders = { NYG: 15, NYJ: 18, PHI: 10, BUF: 4 };
const jersey = { lat: 40.1907, lon: -74.6728 };

function own(rule, extra) {
  return claimRegion(Object.assign({
    seasonHomes: [giants, jets],
    livingHomes: [giants, jets],
    remaining: [giants, jets, eagles],
    centroid: jersey,
    orders: orders,
    rule: rule,
  }, extra));
}

assert.equal(own("centroid"), "NYJ");
assert.equal(own("later"), "NYJ");
assert.equal(own("earlier"), "NYG");

for (const rule of ["centroid", "later", "earlier"]) {
  assert.equal(own(rule, { livingHomes: [jets], remaining: [jets, eagles] }), "NYJ");
}

assert.equal(claimRegion({
  seasonHomes: [bills],
  livingHomes: [bills],
  remaining: [bills, eagles],
  centroid: { lat: 39.9, lon: -75.1 },
  orders: orders,
  rule: "later",
}), "BUF");

assert.equal(claimRegion({
  seasonHomes: [],
  livingHomes: [],
  remaining: [eagles, giants, jets],
  centroid: { lat: 39.95, lon: -75.1 },
  orders: orders,
  rule: "earlier",
}), "PHI");

assert.equal(claimRegion({
  seasonHomes: [],
  livingHomes: [],
  remaining: [giants, jets],
  centroid: jersey,
  orders: orders,
  rule: "centroid",
}), "NYJ");
assert.equal(claimRegion({
  seasonHomes: [],
  livingHomes: [],
  remaining: [giants, jets],
  centroid: jersey,
  orders: orders,
  rule: "earlier",
}), "NYG");

const app = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");
assert.match(app, /claimRule:`centroid`/);
assert.match(app, /setClaimRule:t=>e\(\{claimRule:t\}\)/);
assert.match(app, /globalThis\.claimRegion/);
assert.match(app, /aria-label":`Claim rule`/);
// Both map scenes must pass the store rule into cl(), which must call claimRegion.
assert.equal((app.match(/rule:claimRule,order:/g) || []).length, 2);
assert.match(app, /rule:e\.rule\|\|`centroid`/);
// Expanded territory is Hawaii only. It stays in the base set and fc() drops it only while the checkbox is off.
assert.equal(app.includes("expanded-regions"), false);
assert.equal(app.includes("Greenland"), false);
assert.equal(app.includes("Caribbean"), false);
assert.match(app, /if\(!o&&Ys\.has\(a\)\)continue/);
assert.match(app, /Xs\.has\(a\)\?\{\.\.\.Zs/);
assert.match(app, /title:`Hawaii`/);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /assets\/claim-rule\.js/);
console.log("claim-rule tests passed");
