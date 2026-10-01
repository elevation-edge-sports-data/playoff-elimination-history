const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { sportCycleStep } = require("../assets/sport-cycle.js");

const root = path.join(__dirname, "..");

function bundleYears(sport) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data", sport + "-bundle.json"), "utf8"));
  return Object.keys(data.seasons);
}

const years = {
  nhl: bundleYears("nhl"),
  nba: bundleYears("nba"),
  nfl: bundleYears("nfl"),
};

function step(sport, season, direction, sportCycle) {
  return sportCycleStep({
    sport: sport,
    season: season,
    direction: direction,
    sportCycle: sportCycle,
    yearsBySport: years,
  });
}

function walk(sport, season, direction, count) {
  const out = [];
  let cur = { sport: sport, season: String(season) };
  for (let i = 0; i < count; i++) {
    cur = step(cur.sport, cur.season, direction, true);
    out.push(cur.sport + " " + cur.season);
  }
  return out;
}

// Previous: NHL 2025-26, NBA 2025-26, NFL 2025, NHL 2024-25, NBA 2024-25, NFL 2024.
assert.deepEqual(walk("nhl", "2026", "prev", 6), [
  "nba 2026",
  "nfl 2025",
  "nhl 2025",
  "nba 2025",
  "nfl 2024",
  "nhl 2024",
]);

// Next is that same sequence reversed.
assert.deepEqual(walk("nhl", "2024", "next", 6), [
  "nfl 2024",
  "nba 2025",
  "nhl 2025",
  "nfl 2025",
  "nba 2026",
  "nhl 2026",
]);

// Newest wraps to the oldest on Next. Oldest wraps to the newest on Previous.
const newest = step("nhl", "2026", "next", true);
const backToNewest = step(newest.sport, newest.season, "prev", true);
assert.deepEqual(backToNewest, { sport: "nhl", season: "2026" });
assert.equal(newest.sport, "nhl");
assert.equal(newest.season, years.nhl.map(Number).sort((a, b) => a - b)[0] + "");

// NHL has no 2005 season, so Previous skips that slot.
assert.deepEqual(walk("nba", "2006", "prev", 3), [
  "nfl 2005",
  "nba 2005",
  "nfl 2004",
]);
assert.equal(years.nhl.includes("2005"), false);

// Sport Cycle off stays on the same sport and still wraps.
assert.deepEqual(step("nba", "2026", "prev", false), { sport: "nba", season: "2025" });
assert.deepEqual(step("nfl", "2025", "next", false), {
  sport: "nfl",
  season: years.nfl.map(Number).sort((a, b) => a - b)[0] + "",
});
assert.deepEqual(step("nhl", "2026", "prev", false), { sport: "nhl", season: "2025" });

const app = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /assets\/sport-cycle\.js/);
assert.ok(html.indexOf("assets/sport-cycle.js") < html.indexOf("assets/app.js"));
assert.match(app, /sportCycle:!0/);
assert.match(app, /setSportCycle:t=>e\(\{sportCycle:!!t\}\)/);
assert.match(app, /label:`Sport Cycle`/);
assert.match(app, /"aria-label":`Previous`/);
assert.match(app, /"aria-label":`Next`/);
assert.equal(app.includes("label:`Replay`"), false);
assert.equal(app.includes("label:`Previous`"), false);
assert.equal(app.includes("aria-label:`Earlier season`"), false);
assert.equal(app.includes("aria-label:`Later season`"), false);
assert.match(app, /n\?\(c\(n\),s\(0\)\):l\(!1\)/);
assert.match(app, /globalThis\.sportCycleStep\(/);
assert.match(app, /"data-direction":_===`next`\?`next`:`prev`/);
assert.match(app, /style:_===`next`\?\{opacity:\.4\}:null/);
assert.match(app, /style:_===`next`\?null:\{opacity:\.4\}/);

const previousAt = app.indexOf('"aria-label":`Previous`');
const sportsAt = app.indexOf("(0,W.jsx)(Mi,{value:r,onChange:");
const cycleAt = app.indexOf("label:`Sport Cycle`");
assert.ok(previousAt !== -1 && sportsAt !== -1 && cycleAt !== -1);
assert.ok(previousAt < sportsAt && sportsAt < cycleAt, "season arrows, then sports, then Sport Cycle");

const setSport = app.match(/setSport:\(n,r,i\)=>e\(\{[^}]+\}\)/);
assert.ok(setSport);
assert.match(setSport[0], /globalThis\.mapStepCompleted\(/);
assert.doesNotMatch(setSport[0], /playing/);

console.log("sport-cycle tests passed");
