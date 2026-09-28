const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { resolveLogoUrl, normalizeLogoStyle, standardLogoUrl, LOGO_STYLES, migrateLogoStyleStorage, clearWhitePixels } = require("../assets/logo-style.js");

assert.deepEqual(LOGO_STYLES, ["ground", "transparent", "outline"]);
assert.equal(normalizeLogoStyle("ground"), "ground");
assert.equal(normalizeLogoStyle("transparent"), "transparent");
assert.equal(normalizeLogoStyle("outline"), "outline");
assert.equal(normalizeLogoStyle("knockout"), "ground");
assert.equal(normalizeLogoStyle("arena"), "ground");
assert.equal(normalizeLogoStyle(undefined), "ground");

const pixels = Uint8ClampedArray.from([
  255, 255, 255, 255,
  255, 255, 255, 1,
  254, 254, 254, 255,
  250, 252, 255, 200,
  249, 255, 255, 255,
  255, 255, 200, 255,
  0, 0, 0, 0,
  10, 20, 30, 255,
]);
clearWhitePixels(pixels);
assert.deepEqual(Array.from(pixels), [
  0, 0, 0, 0,
  0, 0, 0, 0,
  254, 254, 254, 255,
  250, 252, 255, 200,
  249, 255, 255, 255,
  255, 255, 200, 255,
  0, 0, 0, 0,
  10, 20, 30, 255,
]);

function memoryStorage(seed) {
  const data = Object.assign({}, seed);
  return {
    get length() { return Object.keys(data).length; },
    key(i) { return Object.keys(data)[i] || null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    dump: data,
  };
}
const stored = memoryStorage({
  flat: JSON.stringify({ logoStyle: "knockout", fillMode: "states" }),
  zustand: JSON.stringify({ state: { logoStyle: "knockout", claimRule: "centroid" }, version: 0 }),
  logoStyle: "knockout",
  other: JSON.stringify({ note: "knockout round" }),
});
migrateLogoStyleStorage(stored);
assert.equal(JSON.parse(stored.dump.flat).logoStyle, "ground");
assert.equal(JSON.parse(stored.dump.flat).fillMode, "states");
assert.equal(JSON.parse(stored.dump.zustand).state.logoStyle, "ground");
assert.equal(JSON.parse(stored.dump.zustand).state.claimRule, "centroid");
assert.equal(stored.dump.logoStyle, "ground");
assert.equal(stored.dump.other, JSON.stringify({ note: "knockout round" }));

assert.equal(standardLogoUrl("nhl", 2011, "TBL"), "./logos/NHL2011/TBL.png");
assert.equal(resolveLogoUrl("nhl", 2010, "TBL"), "./logos/NHL2010/TBL.png");
assert.equal(resolveLogoUrl("nhl", 2011, "TBL"), "./logos/NHL2011/TBL.png");
assert.equal(resolveLogoUrl("nhl", "2011", "TBL", "./logos/NHL2011/TBL.png"), "./logos/NHL2011/TBL.png");
assert.equal(resolveLogoUrl("nhl", 2012, "TBL"), "./logos/NHL2012/TBL.png");
assert.equal(resolveLogoUrl("nhl", 2011, "BOS"), "./logos/NHL2011/BOS.png");
assert.equal(resolveLogoUrl("nfl", 2011, "TBL"), "./logos/NFL2011/TBL.png");
assert.equal(resolveLogoUrl("nba", 1947, "PIT", "./keep.png"), "./keep.png");

const lookup = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "catalog", "season_lookup.json"), "utf8"));
globalThis.LOGO_SEASON_LOOKUP = lookup;
const expected = {
  "nhl 2011 TBL": "./logos/nhl/TBL/TBL-NHL-2008-2011.png",
  "nhl 1996 COL": "./logos/nhl/COL/COL-NHL-1996-1999.png",
  "nhl 2000 COL": "./logos/nhl/COL/COL-NHL-2000-pres.png",
  "nhl 2026 COL": "./logos/nhl/COL/COL-NHL-2000-pres.png",
  "nba 2018 SAS": "./logos/nba/SAS/SAS-NBA-2018-pres.png",
  "nfl 1995 WAS": "./logos/nfl/WAS/WAS-NFL-1983-2019.png",
  "nhl 2026 UTA": "./logos/nhl/UTA/UTA-NHL-2026-pres.png",
  "nba 2026 UTA": "./logos/nba/UTA/UTA-NBA-2026-pres.png",
};
for (const [key, url] of Object.entries(expected)) {
  const [sport, year, abbr] = key.split(" ");
  assert.equal(resolveLogoUrl(sport, year, abbr, "./logos/NHL2011/TBL.png"), url, key);
  assert.ok(fs.existsSync(path.join(__dirname, "..", url.replace(/^\.\//, ""))), url);
}
assert.equal(resolveLogoUrl("nba", 1947, "PIT"), "./logos/NBA1947/PIT.png");
assert.notEqual(resolveLogoUrl("nhl", 2026, "UTA"), resolveLogoUrl("nba", 2026, "UTA"));

const { refreshMapLogos } = require("../assets/logo-style.js");
const stale = {
  attr: "./logos/NHL2011/TBL.png",
  src: "",
  getAttribute() { return this.attr; },
  setAttribute(name, value) { if (name === "src") this.attr = value; },
};
globalThis.document = { getElementsByTagName() { return [stale]; } };
refreshMapLogos();
assert.equal(stale.src, "./logos/nhl/TBL/TBL-NHL-2008-2011.png");
delete globalThis.document;

for (const [sport, year] of [["nhl", "2026"], ["nba", "2026"], ["nfl", "2025"]]) {
  const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", sport + "-bundle.json"), "utf8"));
  for (const row of bundle.seasons[year]) {
    const url = resolveLogoUrl(sport, year, row.t);
    assert.ok(!/\/(?:NHL|NBA|NFL)\d+\//.test(url), sport + " " + year + " " + row.t);
    assert.ok(fs.existsSync(path.join(__dirname, "..", url.replace(/^\.\//, ""))), url);
  }
}

const app = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");
assert.match(app, /logoStyle:`ground`/);
assert.match(app, /setLogoStyle:t=>e\(\{logoStyle:globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(t\):t\}\)/);
assert.match(app, /G\.getState\(\)\.logoStyle===`knockout`&&G\.setState\(\{logoStyle:globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(G\.getState\(\)\.logoStyle\):`ground`\}\)/);
assert.match(app, /\{value:`ground`,label:`Ground`\},\{value:`transparent`,label:`Transparent`\},\{value:`outline`,label:`Outline`\}\]\.map/);
assert.match(app, /globalThis\.transparentLogoUrl/);
assert.match(app, /globalThis\.transparentLogoReady/);
assert.equal(app.includes("label:`Knockout`"), false);
assert.equal(app.includes("value:`knockout`"), false);
assert.match(app, /globalThis\.resolveLogoUrl/);
assert.match(app, /LOGO_LOOKUP_READY/);
assert.match(app, /aria-label":`Logo`/);
assert.match(app, /"data-logo-style":logoStyle/);
assert.match(app, /logo-style-\$\{logoStyle\}/);
assert.match(app, /function Ii\(\{sport:e,year:t,team:n,size:r,className:i,dimmed:a,current:o\}\)\{let logoStyle=\(e=>globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(e\):e===`knockout`\?`ground`:e\)\(G\(e=>e\.logoStyle\)\)/);
assert.match(app, /function Ik\(\{team:e,src:t,position:n,size:r,champ:i,z:a\}\)\{let o=G\(e=>e\.setSelectedTeam\),s=G\(e=>e\.setHoveredTeam\),c=G\(e=>e\.sport\),l=G\(e=>e\.logoScale\),logoStyle=\(e=>globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(e\):e===`knockout`\?`ground`:e\)\(G\(e=>e\.logoStyle\)\)/);
const css = fs.readFileSync(path.join(__dirname, "..", "assets", "style.css"), "utf8");
assert.match(css, /\.team-mark\.logo-style-outline/);
assert.equal(css.includes("logo-style-knockout"), false);
assert.equal(css.includes("brightness(0) invert(1)"), false);
const styleSrc = fs.readFileSync(path.join(__dirname, "..", "assets", "logo-style.js"), "utf8");
assert.equal(styleSrc.includes("NHL2012/TBL"), false);
assert.match(styleSrc, /catalog\/season_lookup\.json/);
assert.match(styleSrc, /refreshMapLogos/);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /assets\/logo-style\.js/);
const lookupTag = html.indexOf("catalog/season_lookup.js");
const styleTag = html.indexOf("assets/logo-style.js");
const appTag = html.indexOf("assets/app.js");
assert.ok(lookupTag !== -1 && styleTag !== -1 && appTag !== -1 && lookupTag < styleTag && styleTag < appTag);
const lookupJs = fs.readFileSync(path.join(__dirname, "..", "catalog", "season_lookup.js"), "utf8");
const sandbox = {};
vm.runInNewContext(lookupJs, sandbox);
assert.equal(sandbox.LOGO_SEASON_LOOKUP.nhl.TBL["2011"], "TBL-NHL-2008-2011.png");
assert.equal(sandbox.LOGO_SEASON_LOOKUP.nhl.COL["2026"], "COL-NHL-2000-pres.png");
assert.equal(sandbox.LOGO_SEASON_LOOKUP.nba.UTA["2026"], "UTA-NBA-2026-pres.png");
assert.equal(sandbox.LOGO_SEASON_LOOKUP.nfl.WAS["1995"], "WAS-NFL-1983-2019.png");
console.log("logo-style tests passed");
