const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { mapSeason, seasonLabel, clampStepIndex } = require("../assets/map-season.js");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");

function bundleYears(sport) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data", sport + "-bundle.json"), "utf8"));
  return Object.keys(data.seasons);
}

const available = {
  nhl: bundleYears("nhl"),
  nba: bundleYears("nba"),
  nfl: bundleYears("nfl"),
};

function catalogLatest(source) {
  const out = {};
  const re = /id:`(nhl|nba|nfl)`[\s\S]*?latestSeason:`(\d+)`/g;
  let match;
  while ((match = re.exec(source))) out[match[1]] = match[2];
  return out;
}

assert.equal(mapSeason("nfl", "2013", "nhl", available), "2014");
assert.equal(seasonLabel("nhl", "2014"), "2013\u20132014");
assert.equal(seasonLabel("nhl", mapSeason("nfl", "2013", "nhl", available)), "2013\u20132014");

assert.equal(mapSeason("nhl", "2014", "nfl", available), "2013");
assert.equal(seasonLabel("nfl", "2013"), "2013");

assert.equal(mapSeason("nhl", "2014", "nba", available), "2014");
assert.equal(seasonLabel("nba", "2014"), "2013\u20132014");
assert.equal(mapSeason("nba", "2014", "nhl", available), "2014");

assert.equal(mapSeason("nhl", "2026", "nfl", available), "2025");
assert.equal(mapSeason("nfl", "1966", "nhl", available), "1967");
assert.equal(seasonLabel("nhl", "1967"), "1966\u20131967");

assert.equal(seasonLabel("nhl", "2014").charCodeAt(4), 0x2013);
assert.equal(seasonLabel("nfl", "2013").includes("\u2013"), false);

assert.equal(mapSeason("nfl", "2004", "nhl", { nhl: ["2006", "2004"] }), "2004");
assert.equal(mapSeason("nfl", "1966", "nhl", { nhl: ["1969", "1968"] }), "1968");
assert.equal(mapSeason("nhl", "2026", "nfl", { nfl: ["2020", "2024"] }), "2024");
assert.equal(mapSeason("nfl", "2013", "nhl", { nhl: [2014, 2015] }), "2014");
assert.equal(mapSeason("nhl", "2014", "nhl", available), "2014");

const latest = catalogLatest(appSource);
assert.deepEqual(latest, { nhl: "2026", nba: "2026", nfl: "2025" });
assert.equal(mapSeason("nfl", "2013", "nhl", { nhl: [] }), latest.nhl);
assert.equal(mapSeason("nfl", "2013", "nba", {}), latest.nba);
assert.equal(mapSeason("nhl", "2014", "nfl", { nfl: null }), latest.nfl);

assert.equal(clampStepIndex(20, 12), 12);
assert.equal(clampStepIndex(5, 12), 5);
assert.equal(clampStepIndex(0, 12), 0);
assert.equal(clampStepIndex(4, 0), 0);

const setSport = appSource.match(/setSport:\(n,r,i\)=>e\(\{[^}]+\}\)/);
assert.ok(setSport, "setSport should map the step and keep playback");
assert.doesNotMatch(setSport[0], /playing/);
assert.doesNotMatch(setSport[0], /stepIndex:0/);
assert.match(setSport[0], /mapStep/);
assert.match(appSource, /globalThis\.mapSeason\(r,i,o,s\)/);
assert.doesNotMatch(appSource, /a\(e,Ei\(e\)\)/);
assert.match(appSource, /function mi\(e,t\)\{return globalThis\.seasonLabel\(e,t\)\}/);
assert.match(appSource, /year:mi\(r,i\)/);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /assets\/map-season\.js/);

console.log("map-season tests passed");
