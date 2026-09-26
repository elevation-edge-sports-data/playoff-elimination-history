const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { resolveLogoUrl, normalizeLogoStyle, standardLogoUrl, LOGO_STYLES, migrateLogoStyleStorage } = require("../assets/logo-style.js");

assert.deepEqual(LOGO_STYLES, ["ground", "outline"]);
assert.equal(normalizeLogoStyle("ground"), "ground");
assert.equal(normalizeLogoStyle("outline"), "outline");
assert.equal(normalizeLogoStyle("knockout"), "ground");
assert.equal(normalizeLogoStyle("arena"), "ground");
assert.equal(normalizeLogoStyle(undefined), "ground");

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

const styleSrc = fs.readFileSync(path.join(__dirname, "..", "assets", "logo-style.js"), "utf8");
assert.equal(styleSrc.includes("NHL2012/TBL"), false);
const crest = path.join(__dirname, "..", "logos", "NHL2011", "TBL.png");
const bolt = path.join(__dirname, "..", "logos", "NHL2012", "TBL.png");
assert.ok(fs.existsSync(crest));
assert.ok(!fs.readFileSync(crest).equals(fs.readFileSync(bolt)));

function decodePng(file) {
  const zlib = require("zlib");
  const b = fs.readFileSync(file);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  let o = 8;
  const idats = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o); o += 4;
    const type = b.slice(o, o + 4).toString("ascii"); o += 4;
    const data = b.slice(o, o + len); o += len; o += 4;
    if (type === "IDAT") idats.push(data);
    if (type === "IEND") break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const px = Buffer.alloc(w * h * 4);
  let i = 0;
  let prev = Buffer.alloc(w * 4);
  for (let y = 0; y < h; y++) {
    const filter = raw[i++];
    const row = Buffer.from(raw.subarray(i, i + w * 4));
    i += w * 4;
    const recon = Buffer.alloc(w * 4);
    for (let x = 0; x < w * 4; x++) {
      const left = x >= 4 ? recon[x - 4] : 0;
      const up = prev[x];
      const ul = x >= 4 ? prev[x - 4] : 0;
      let v = row[x];
      if (filter === 1) v = (v + left) & 255;
      else if (filter === 2) v = (v + up) & 255;
      else if (filter === 3) v = (v + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const pr = left + up - ul;
        const pa = Math.abs(pr - left), pb = Math.abs(pr - up), pc = Math.abs(pr - ul);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        v = (v + pred) & 255;
      }
      recon[x] = v;
    }
    recon.copy(px, y * w * 4);
    prev = recon;
  }
  return { w, h, px };
}
const crestPx = decodePng(crest);
let lightCounters = 0;
let navyLetters = 0;
for (let y = 6; y <= 24; y++) {
  for (let x = 16; x <= 98; x++) {
    const i = (y * crestPx.w + x) * 4;
    const r = crestPx.px[i], g = crestPx.px[i + 1], b = crestPx.px[i + 2], a = crestPx.px[i + 3];
    if (a > 180 && Math.min(r, g, b) > 140) lightCounters++;
    if (a > 200 && b > r + 30 && Math.max(r, g, b) < 120) navyLetters++;
  }
}
assert.equal(lightCounters, 0, "Tampa Bay counters are transparent");
assert.ok(navyLetters > 200, "navy letter strokes remain");

const app = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");
assert.match(app, /logoStyle:`ground`/);
assert.match(app, /setLogoStyle:t=>e\(\{logoStyle:globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(t\):t\}\)/);
assert.match(app, /G\.getState\(\)\.logoStyle===`knockout`&&G\.setState\(\{logoStyle:globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(G\.getState\(\)\.logoStyle\):`ground`\}\)/);
assert.match(app, /\{value:`ground`,label:`Ground`\},\{value:`outline`,label:`Outline`\}\]\.map/);
assert.equal(app.includes("label:`Knockout`"), false);
assert.equal(app.includes("value:`knockout`"), false);
assert.match(app, /globalThis\.resolveLogoUrl/);
assert.match(app, /aria-label":`Logo`/);
assert.match(app, /"data-logo-style":logoStyle/);
assert.match(app, /logo-style-\$\{logoStyle\}/);
assert.match(app, /function Ii\(\{sport:e,year:t,team:n,size:r,className:i,dimmed:a,current:o\}\)\{let logoStyle=\(e=>globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(e\):e===`knockout`\?`ground`:e\)\(G\(e=>e\.logoStyle\)\)/);
assert.match(app, /function Ik\(\{team:e,src:t,position:n,size:r,champ:i,z:a\}\)\{let o=G\(e=>e\.setSelectedTeam\),s=G\(e=>e\.setHoveredTeam\),c=G\(e=>e\.sport\),l=G\(e=>e\.logoScale\),logoStyle=\(e=>globalThis\.normalizeLogoStyle\?globalThis\.normalizeLogoStyle\(e\):e===`knockout`\?`ground`:e\)\(G\(e=>e\.logoStyle\)\)/);
const css = fs.readFileSync(path.join(__dirname, "..", "assets", "style.css"), "utf8");
assert.match(css, /\.team-mark\.logo-style-outline/);
assert.equal(css.includes("logo-style-knockout"), false);
assert.equal(css.includes("brightness(0) invert(1)"), false);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /assets\/logo-style\.js/);
const styleTag = html.indexOf("assets/logo-style.js");
const appTag = html.indexOf("assets/app.js");
assert.ok(styleTag !== -1 && appTag !== -1 && styleTag < appTag);
console.log("logo-style tests passed");
