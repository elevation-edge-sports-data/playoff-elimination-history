# Expanded territory and Claim rule wiring

## Root cause

The controls were already wired in this working tree. They are absent from the site that GitHub Pages actually serves.

`https://elevation-edge-sports-data.github.io/playoff-elimination-history/` loads only `./assets/app.js` (2,843,715 bytes, last modified 2026-09-21). That published bundle contains no `claimRule`, `expandedTerritory`, `claimRegion`, `Frame expanded`, or an extra-land fetch. `https://elevation-edge-sports-data.github.io/playoff-elimination-tracker/` is a 404.

This folder is a static site. Nothing in the repo starts a server. Open it over HTTP from the repo root (`python -m http.server` or `npx serve .`).

Local `index.html` script srcs, in order:

1. `./assets/map-season.js`
2. `./assets/region-color.js`
3. `./assets/claim-rule.js`
4. `./assets/logo-style.js`
5. `./assets/app.js`

Expanded territory is Hawaii. Hawaii stays in the base region set and `fc()` drops it only while the checkbox is off (`if(!o&&Ys.has(a))continue`). Turning the checkbox on does not fetch another pack and does not move the camera. Frame expanded fits the painted set, which then includes Hawaii. Recenter restores the core frame.

Claim rule lives in the same zustand store as `fillMode` and `logoStyle` (`claimRule`, default `centroid`, `setClaimRule`). The header writes it. Both maps call `cl({ ..., rule: claimRule })`. `cl()` assigns `region.owner` through `globalThis.claimRegion` for State/Territory fills and for the color-adjacency graph. City / Voronoi does not use it. The clip box `Zs` (`minLat` 24.5, `maxLon` -52) applies only to Alaska, Yukon, Northwest Territories, and Nunavut.

Checked in headless Chrome against `http://127.0.0.1` serving this folder. NFL 2015, 32 of 32 clubs still alive, 2D region label: Centroid and Later eliminated paint New Jersey for the Jets; Earlier eliminated paints it for the Giants. Expanded off is 63 regions and the 3D camera stays East–West 69, North–South 173, Z 0, Rotate 8°, Tilt 28°, Zoom 1.3×. Expanded on keeps that camera and adds Hawaii. Recenter restores 69 / 173 / 1.3×. Season preserve, colors, camera sliders, and logo style were left as they were.

## Files changed

`test/claim-rule.test.js` locks the contract: the bundle must pass `claimRule` into `cl()` / `claimRegion`, and drop Hawaii only when expanded territory is off.

## How to verify locally

Serve this folder over HTTP. Do not use the GitHub Pages URL.

1. NFL, season 2015, rewind so every club is still alive. State fill, not City.
2. New Jersey: Centroid and Later eliminated are the Jets. Earlier eliminated is the Giants.
3. Expanded territory off: the old CONUS + Canada + clipped Alaska frame. Hawaii is not drawn.
4. Expanded territory on: Hawaii is in the scene. The camera numbers do not change.
5. Frame expanded includes Hawaii. Recenter restores the old frame.
