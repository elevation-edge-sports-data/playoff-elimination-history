// Footer label and store both use the same index: "16/24" is step 16 of max 24.
// 0 is the first step (no clubs out). The last step is the champion.
// mapStep keeps steps remaining. Season and sport changes both use
// mapStepCompleted, which keeps the share of steps already played.
// 16/24 is about 67%, so a 21-step season lands on 14.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.mapStep = api.mapStep;
  root.mapStepCompleted = api.mapStepCompleted;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MIN_STEP = 0;

  function finite(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(step, max) {
    if (step < MIN_STEP) return MIN_STEP;
    if (step > max) return max;
    return step;
  }

  function mapStep(oldStep, oldTotal, newTotal) {
    var step = finite(oldStep, MIN_STEP);
    var oldT = finite(oldTotal, 0);
    var newT = finite(newTotal, 0);
    if (newT < MIN_STEP) newT = 0;
    var remaining = oldT - step;
    return clamp(newT - remaining, newT);
  }

  function mapStepCompleted(oldStep, oldTotal, newTotal) {
    var step = finite(oldStep, MIN_STEP);
    var oldT = finite(oldTotal, 0);
    var newT = finite(newTotal, 0);
    if (newT < MIN_STEP) newT = 0;
    if (oldT <= 0 || newT === 0) return MIN_STEP;
    if (step < MIN_STEP) step = MIN_STEP;
    if (step > oldT) step = oldT;
    return clamp(Math.round((step / oldT) * newT), newT);
  }

  return { mapStep: mapStep, mapStepCompleted: mapStepCompleted };
});
