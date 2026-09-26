const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { mapStep } = require("../assets/map-step.js");

assert.equal(mapStep(16, 24, 21), 13);
assert.equal(mapStep(24, 24, 21), 21);
assert.equal(mapStep(0, 24, 21), 0);
assert.equal(mapStep(16, 24, 8), 0);
assert.equal(mapStep(16, 24, 16), 8);
assert.equal(mapStep(1, 30, 10), 0);
assert.equal(mapStep(12, 12, 40), 40);

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /assets\/map-step\.js/);

const setSport = app.match(/setSport:\(n,r,i\)=>e\(\{[^}]+\}\)/);
assert.ok(setSport, "setSport should map the step and keep playback");
assert.match(setSport[0], /globalThis\.mapStep\(/);
assert.doesNotMatch(setSport[0], /playing/);
assert.doesNotMatch(setSport[0], /stepIndex:0/);
assert.doesNotMatch(setSport[0], /clampStepIndex/);

const setSeason = app.match(/setSeason:n=>e\(\{[^}]+\}\)/);
assert.ok(setSeason, "setSeason should map steps remaining");
assert.match(setSeason[0], /globalThis\.mapStep\(/);
assert.doesNotMatch(setSeason[0], /playing/);
assert.doesNotMatch(setSeason[0], /stepIndex:0/);

// After the cup, playback still opens the next season at the first step.
assert.match(app, /n\?\(c\(n\),s\(0\)\):l\(!1\)/);

console.log("map-step tests passed");
