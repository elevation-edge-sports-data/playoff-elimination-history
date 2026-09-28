// How a club mark is drawn on the map. Ground is the full-color file
// with the existing shadow. Transparent keeps that drawing and clears
// exact #ffffff pixels so the map shows through. Outline keeps
// the color and adds a light keyline plus a dark outer edge. A stored
// "knockout" value is ground.
// Files are logos/{sport}/{abbr}/{ABBR}-{SPORT}-{start}-{end|pres}.png.
// catalog/season_lookup.json maps sport + abbr + season-end year to the filename.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.resolveLogoUrl = api.resolveLogoUrl;
  root.normalizeLogoStyle = api.normalizeLogoStyle;
  root.migrateLogoStyleStorage = api.migrateLogoStyleStorage;
  root.clearWhitePixels = api.clearWhitePixels;
  root.transparentLogoUrl = api.transparentLogoUrl;
  root.transparentLogoReady = api.transparentLogoReady;
  root.refreshMapLogos = api.refreshMapLogos;
  root.LOGO_STYLES = api.LOGO_STYLES;
  root.LOGO_SEASON_LOOKUP = root.LOGO_SEASON_LOOKUP || {};
  if (typeof document !== "undefined" && typeof root.fetch === "function") {
    root.LOGO_LOOKUP_READY = root.fetch("./catalog/season_lookup.json").then(function (r) {
      return r.json();
    }).then(function (data) {
      if (!data || (!data.nhl && !data.nba && !data.nfl)) return;
      root.LOGO_SEASON_LOOKUP = data;
      if (typeof root.refreshMapLogos === "function") root.refreshMapLogos();
    }).catch(function () {});
  }
  try {
    if (typeof localStorage !== "undefined") api.migrateLogoStyleStorage(localStorage);
  } catch (err) {}
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var LOGO_STYLES = ["ground", "transparent", "outline"];
  var transparentCache = Object.create(null);
  var transparentReady = Object.create(null);
  var PUNCH_EDGE = 384;

  function standardLogoUrl(sport, year, abbr) {
    return "./logos/" + String(sport).toUpperCase() + String(year) + "/" + abbr + ".png";
  }

  function resolveLogoUrl(sport, year, abbr, fallback) {
    var s = String(sport).toLowerCase();
    var a = String(abbr);
    var y = String(year);
    var host = typeof globalThis !== "undefined" ? globalThis : {};
    var table = (host.LOGO_SEASON_LOOKUP || {})[s];
    var file = table && table[a] && table[a][y];
    if (file) return "./logos/" + s + "/" + a + "/" + file;
    return fallback || standardLogoUrl(sport, year, abbr);
  }

  function refreshMapLogos() {
    var doc = typeof globalThis !== "undefined" ? globalThis.document : null;
    if (!doc || typeof doc.getElementsByTagName !== "function") return;
    var imgs = doc.getElementsByTagName("img");
    var re = /(?:^|\/)logos\/(NHL|NBA|NFL)(\d+)\/([A-Za-z0-9]+)\.png(?:[?#].*)?$/;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var raw = img.getAttribute ? (img.getAttribute("src") || "") : "";
      var match = raw.match(re) || String(img.src || "").match(re);
      if (!match) continue;
      var next = resolveLogoUrl(match[1], match[2], match[3], raw || undefined);
      if (!next || next === raw) continue;
      if (img.setAttribute) img.setAttribute("src", next);
      img.src = next;
    }
  }

  function clearWhitePixels(data) {
    if (!data) return data;
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) continue;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
    return data;
  }

  function blobUrl(canvas) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob !== "function") {
        try { resolve(canvas.toDataURL("image/png")); }
        catch (err) { reject(err); }
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          try { resolve(canvas.toDataURL("image/png")); }
          catch (err) { reject(err); }
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, "image/png");
    });
  }

  function canvasFromDrawable(drawable, width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(drawable, 0, 0);
    var image = ctx.getImageData(0, 0, width, height);
    clearWhitePixels(image.data);
    ctx.putImageData(image, 0, 0);
    var edge = width > height ? width : height;
    if (edge <= PUNCH_EDGE) return canvas;
    var scale = PUNCH_EDGE / edge;
    var small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(width * scale));
    small.height = Math.max(1, Math.round(height * scale));
    var out = small.getContext("2d");
    out.imageSmoothingEnabled = true;
    out.drawImage(canvas, 0, 0, small.width, small.height);
    return small;
  }

  function punchFromBlob(blob) {
    return createImageBitmap(blob).then(function (bitmap) {
      var canvas = canvasFromDrawable(bitmap, bitmap.width, bitmap.height);
      if (bitmap.close) bitmap.close();
      return blobUrl(canvas);
    });
  }

  function punchFromImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var width = img.naturalWidth || img.width;
          var height = img.naturalHeight || img.height;
          if (!width || !height) { resolve(src); return; }
          blobUrl(canvasFromDrawable(img, width, height)).then(resolve, reject);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () { reject(new Error("logo")); };
      img.src = src;
    });
  }

  function punchLogo(src) {
    if (typeof document === "undefined") return Promise.resolve(src);
    var loader = typeof fetch === "function"
      ? fetch(src).then(function (res) {
        if (!res.ok) throw new Error("logo");
        return res.blob();
      }).then(punchFromBlob)
      : Promise.reject(new Error("logo"));
    return loader.catch(function () { return punchFromImage(src); }).catch(function () { return src; });
  }

  function rememberLogo(src, url) {
    transparentReady[src] = url;
    return url;
  }

  function transparentLogoUrl(src) {
    if (!src) return Promise.resolve(src);
    if (transparentReady[src]) return Promise.resolve(transparentReady[src]);
    if (!transparentCache[src]) {
      transparentCache[src] = punchLogo(src).then(function (url) {
        return rememberLogo(src, url);
      });
    }
    return transparentCache[src];
  }

  function transparentLogoReady(src) {
    return transparentReady[src] || "";
  }

  function normalizeLogoStyle(value) {
    if (value === "knockout") return "ground";
    return LOGO_STYLES.indexOf(value) === -1 ? "ground" : value;
  }

  function replaceKnockout(node) {
    if (!node || typeof node !== "object") return false;
    var changed = false;
    if (node.logoStyle === "knockout") {
      node.logoStyle = "ground";
      changed = true;
    }
    if (node.state && replaceKnockout(node.state)) changed = true;
    return changed;
  }

  function migrateLogoStyleStorage(storage) {
    if (!storage || typeof storage.length !== "number" || typeof storage.key !== "function" || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return;
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key == null) continue;
      var raw = storage.getItem(key);
      if (typeof raw !== "string" || raw.indexOf("knockout") === -1) continue;
      if ((raw === "knockout" || raw === '"knockout"') && /(^|[./])logoStyle$/.test(key)) {
        storage.setItem(key, raw.charAt(0) === '"' ? '"ground"' : "ground");
        continue;
      }
      try {
        var parsed = JSON.parse(raw);
      } catch (err) {
        continue;
      }
      if (replaceKnockout(parsed)) storage.setItem(key, JSON.stringify(parsed));
    }
  }

  return {
    LOGO_STYLES: LOGO_STYLES,
    resolveLogoUrl: resolveLogoUrl,
    normalizeLogoStyle: normalizeLogoStyle,
    standardLogoUrl: standardLogoUrl,
    refreshMapLogos: refreshMapLogos,
    migrateLogoStyleStorage: migrateLogoStyleStorage,
    clearWhitePixels: clearWhitePixels,
    transparentLogoUrl: transparentLogoUrl,
    transparentLogoReady: transparentLogoReady,
  };
});
