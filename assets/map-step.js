// Footer label and store both use the same index: "16/24" is step 16 of max 24.
// 0 is the first step (no clubs out). The last step is the champion.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.mapStep = api.mapStep;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MIN_STEP = 0;

  function mapStep(oldStep, oldTotal, newTotal) {
    var step = Number(oldStep);
    var oldT = Number(oldTotal);
    var newT = Number(newTotal);
    if (!Number.isFinite(step)) step = MIN_STEP;
    if (!Number.isFinite(oldT)) oldT = 0;
    if (!Number.isFinite(newT) || newT < MIN_STEP) newT = 0;
    var remaining = oldT - step;
    var next = newT - remaining;
    if (next < MIN_STEP) return MIN_STEP;
    if (next > newT) return newT;
    return next;
  }

  return { mapStep: mapStep };
});
