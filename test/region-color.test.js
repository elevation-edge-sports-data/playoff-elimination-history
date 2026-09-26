const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { assignRegionColors, IDENTICAL_FLOOR } = require("../assets/region-color.js");

const root = path.join(__dirname, "..");
const ari = { abbr: "ARI", c1: "#97233F", c2: "#000000", c3: "#FFB612" };
const den = { abbr: "DEN", c1: "#FB4F14", c2: "#002244", c3: "#FFFFFF" };
const adjacent = new Map([
  ["ARI", new Set(["DEN"])],
  ["DEN", new Set(["ARI"])],
]);

function hex(map, abbr) {
  return String(map.get(abbr)).toLowerCase();
}

assert.equal(IDENTICAL_FLOOR, 32);

const preferred = assignRegionColors([ari, den], adjacent, {
  policy: "prefer-primary",
  overrides: {},
});
assert.equal(hex(preferred, "ARI"), "#97233f");
assert.equal(hex(preferred, "DEN"), "#fb4f14");

const contrast = assignRegionColors([ari, den], adjacent, {
  policy: "max-contrast",
  overrides: {},
});
assert.equal(hex(contrast, "ARI"), "#ffb612");
assert.equal(hex(contrast, "DEN"), "#fb4f14");

const locked = assignRegionColors([ari, den], adjacent, {
  policy: "max-contrast",
  sport: "nfl",
  season: 2015,
});
assert.equal(hex(locked, "ARI"), "#97233f");
assert.equal(hex(locked, "DEN"), "#fb4f14");

const otherYear = assignRegionColors([ari, den], adjacent, {
  policy: "max-contrast",
  sport: "nfl",
  season: "2014",
});
assert.equal(hex(otherYear, "ARI"), "#ffb612");

const primary = assignRegionColors([ari, den], adjacent, {
  policy: "primary-only",
  overrides: {},
});
assert.equal(hex(primary, "ARI"), "#97233f");

const near = new Map([
  ["A", new Set(["B"])],
  ["B", new Set(["A", "Z"])],
]);
const rejectPrimary = assignRegionColors(
  [
    { abbr: "A", c1: "#000000", c2: "#0000FF", c3: "#00FF00" },
    { abbr: "B", c1: "#100000", c2: "#EEEEEE", c3: "#DDDDDD" },
  ],
  near,
  { policy: "prefer-primary", overrides: {} },
);
assert.equal(hex(rejectPrimary, "B"), "#100000");
assert.equal(hex(rejectPrimary, "A"), "#0000ff");

const useThird = assignRegionColors(
  [
    { abbr: "A", c1: "#000000", c2: "#120000", c3: "#00FF00" },
    { abbr: "B", c1: "#100000", c2: "#EEEEEE", c3: "#DDDDDD" },
  ],
  near,
  { policy: "prefer-primary", overrides: {} },
);
assert.equal(hex(useThird, "A"), "#00ff00");

const fallBack = assignRegionColors(
  [
    { abbr: "A", c1: "#101010", c2: "#0E0E0E", c3: "#080808" },
    { abbr: "B", c1: "#000000", c2: "#010101", c3: "#020202" },
  ],
  near,
  { policy: "prefer-primary", overrides: {} },
);
assert.equal(hex(fallBack, "A"), "#101010");

const exactFloor = assignRegionColors(
  [
    { abbr: "A", c1: "#200000", c2: "#0000FF", c3: "#00FF00" },
    { abbr: "B", c1: "#000000", c2: "#EEEEEE", c3: "#DDDDDD" },
  ],
  near,
  { policy: "prefer-primary", overrides: {} },
);
assert.equal(hex(exactFloor, "A"), "#200000");

const underFloor = assignRegionColors(
  [
    { abbr: "A", c1: "#1F0000", c2: "#0000FF", c3: "#00FF00" },
    { abbr: "B", c1: "#000000", c2: "#EEEEEE", c3: "#DDDDDD" },
  ],
  near,
  { policy: "prefer-primary", overrides: {} },
);
assert.equal(hex(underFloor, "A"), "#0000ff");

const light = assignRegionColors(
  [{ abbr: "W", c1: "#FFFFFF", c2: "#000000", c3: null }],
  new Map(),
  { policy: "prefer-primary", overrides: {} },
);
const lightContrast = assignRegionColors(
  [{ abbr: "W", c1: "#FFFFFF", c2: "#000000", c3: null }],
  new Map(),
  { policy: "max-contrast", overrides: {} },
);
assert.equal(hex(light, "W"), "#ffffff");
assert.equal(hex(lightContrast, "W"), "#000000");

const only = assignRegionColors(
  [
    { abbr: "A", c1: "#112233", c2: "#ABCDEF", c3: "#445566" },
    { abbr: "B", c1: "#112233", c2: "#000000", c3: "#FFFFFF" },
  ],
  near,
  { policy: "primary-only", overrides: {} },
);
assert.equal(hex(only, "A"), "#112233");

const forced = assignRegionColors([ari], new Map(), {
  policy: "primary-only",
  sport: "nfl",
  season: 2015,
  overrides: { nfl: { "2015": { ARI: "#123456" } } },
});
assert.equal(hex(forced, "ARI"), "#123456");

const bundle = JSON.parse(fs.readFileSync(path.join(root, "data", "nfl-bundle.json"), "utf8"));
assert.equal(bundle.teams.ARI.c1, "#97233F");
assert.equal(bundle.teams.ARI.c3, "#FFB612");

const app = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");
assert.match(app, /colorPolicy:`prefer-primary`/);
assert.match(app, /setColorPolicy:t=>e\(\{colorPolicy:t\}\)/);
assert.match(app, /policy:colorPolicy,sport:g,season:k/);
assert.match(app, /policy:colorPolicy,sport:h,season:C/);
assert.match(app, /aria-label":`Color contrast`|ariaLabel:`Color contrast`|"aria-label":`Color contrast`/);
assert.doesNotMatch(app, /function vl\(e,t\)\{let n=new Map/);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /assets\/region-color\.js/);

console.log("region-color tests passed");
