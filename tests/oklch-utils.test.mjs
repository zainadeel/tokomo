import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

import {
  compositeOverlayRgb,
  contrastFromY,
  fitOklchToP3Gamut,
  formatOklch,
  hexToRgbEncoded,
  isDisplayP3InGamut,
  isSrgbInGamut,
  oklchToHex,
  parseOklch,
  relativeLuminanceFromHex,
  rgbEncodedToY,
  solveBoldLightnessForContrast,
  solveLForContrast,
} from "../tools/color-system/oklch-utils.mjs";
import { apcaLc, apcaThreshold, meetsApca } from "../tools/color-system/apca.mjs";

const UTILS_PATH = "tools/color-system/oklch-utils.mjs";

// oklch-utils.mjs is loaded directly by tools/color-system/index.html via
// <script type="module"> with no bundler and no import map, and docs/tool/ is
// served statically on GitHub Pages with no node_modules. A bare specifier would
// resolve as a URL, 404, and break the colour tool. Keep this module
// dependency-free; Node-only helpers belong in apca.mjs.
test("oklch-utils stays browser-loadable: every import specifier is relative", async () => {
  const source = await readFile(UTILS_PATH, "utf8");
  const specifiers = [...source.matchAll(/^\s*(?:import|export)[^'"\n]*from\s+["']([^"']+)["']/gm)].map(
    (match) => match[1]
  );

  for (const specifier of specifiers) {
    assert.ok(
      specifier.startsWith("./") || specifier.startsWith("../"),
      `${UTILS_PATH} must not import the bare specifier "${specifier}" — it would 404 in the browser colour tool`
    );
  }
});

test("contrastFromY matches known WCAG extremes", () => {
  // Black (Y=0) against white (Y=1) is the 21:1 ceiling.
  assert.equal(contrastFromY(0, 1).toFixed(2), "21.00");
  assert.equal(contrastFromY(1, 0).toFixed(2), "21.00");
  // Identical luminance is 1:1, and the function is order-independent.
  assert.equal(contrastFromY(0.5, 0.5), 1);
});

test("hex round-trips through sRGB luminance", () => {
  assert.deepEqual(hexToRgbEncoded("#FFFFFF"), { r: 1, g: 1, b: 1 });
  assert.deepEqual(hexToRgbEncoded("#000000"), { r: 0, g: 0, b: 0 });
  assert.equal(relativeLuminanceFromHex("#FFFFFF").toFixed(4), "1.0000");
  assert.equal(relativeLuminanceFromHex("#000000").toFixed(4), "0.0000");
  // Mid grey #808080 sits near 0.2159 relative luminance.
  assert.equal(relativeLuminanceFromHex("#808080").toFixed(4), "0.2159");
  assert.equal(rgbEncodedToY({ r: 1, g: 1, b: 1 }).toFixed(4), "1.0000");
});

test("oklchToHex returns uppercase hex", () => {
  // The workflow writes this into CSS, and generate-color-tokens.mjs already
  // emits uppercase hex — the two must not disagree on casing.
  const hex = oklchToHex(0.5, 0.18, 250);
  assert.match(hex, /^#[0-9A-F]{6}$/);
  assert.equal(hex, hex.toUpperCase());
});

test("oklchToHex maps the achromatic extremes", () => {
  assert.equal(oklchToHex(1, 0, 0), "#FFFFFF");
  assert.equal(oklchToHex(0, 0, 0), "#000000");
});

test("gamut predicates and fitting agree on an out-of-sRGB colour", () => {
  // oklch(0.7 0.35 150) is a vivid green well outside sRGB.
  assert.equal(isSrgbInGamut(0.7, 0.35, 150), false);
  assert.equal(isDisplayP3InGamut(0.7, 0.35, 150), false);

  const fitted = fitOklchToP3Gamut(0.7, 0.35, 150);
  assert.equal(fitted.l, 0.7, "lightness is preserved");
  assert.equal(fitted.h, 150, "hue is preserved");
  assert.ok(fitted.c < 0.35, "chroma is reduced");
  assert.ok(isDisplayP3InGamut(fitted.l, fitted.c, fitted.h), "result is inside P3");
});

test("fitOklchToP3Gamut leaves in-gamut colours untouched", () => {
  const input = { l: 0.5, c: 0.05, h: 250 };
  assert.deepEqual(fitOklchToP3Gamut(input.l, input.c, input.h), {
    l: 0.5,
    c: 0.05,
    h: 250,
  });
});

test("solveBoldLightnessForContrast still agrees with solveLForContrast", () => {
  // solveBoldLightnessForContrast now delegates to solveLForContrast with the
  // direction pinned to "darker"; the two must produce identical results.
  const faint = { l: 0.93, c: 0.04, h: 250 };
  const bold = { l: 0.5, c: 0.18, h: 250 };

  const viaBold = solveBoldLightnessForContrast({ faint, bold });
  const viaGeneral = solveLForContrast({
    target: bold,
    anchor: faint,
    direction: "darker",
  });

  assert.equal(viaBold, viaGeneral);
});

test("solveBoldLightnessForContrast pins the search below faint", () => {
  // Guards the behaviour the CommonJS implementation had: the bracket is always
  // [0, faint.l] regardless of where bold started. Against a faint at L0.5 the
  // 4.5:1 target is unreachable from below (the best available is ~3.51:1 at
  // L0), so the solver returns the input lightness unchanged rather than
  // silently emitting a failing value.
  const faint = { l: 0.5, c: 0.04, h: 250 };
  const bold = { l: 0.9, c: 0.18, h: 250 };

  assert.equal(solveBoldLightnessForContrast({ faint, bold }), bold.l);

  // Direction inference would instead search upward and drift off bold.l, which
  // is exactly why solveBoldLightnessForContrast pins direction.
  assert.notEqual(solveLForContrast({ target: bold, anchor: faint }), bold.l);
  assert.equal(
    solveLForContrast({ target: bold, anchor: faint, direction: "darker" }),
    bold.l
  );
});

test("compositeOverlayRgb blends an overlay over a background", () => {
  const white = { r: 1, g: 1, b: 1 };
  // 50% black over white lands halfway in encoded space.
  assert.deepEqual(compositeOverlayRgb(white, "black", 0.5), { r: 0.5, g: 0.5, b: 0.5 });
  // A fully opaque overlay replaces the background entirely.
  assert.deepEqual(compositeOverlayRgb(white, "black", 1), { r: 0, g: 0, b: 0 });
  // A fully transparent overlay is a no-op.
  assert.deepEqual(compositeOverlayRgb(white, "black", 0), white);
});

test("parseOklch reads unitless oklch values and rejects junk", () => {
  assert.deepEqual(parseOklch("oklch(0.5 0.18 250)"), { l: 0.5, c: 0.18, h: 250 });
  assert.throws(() => parseOklch("#ffffff"), /Invalid OKLCH value/);
});

test("formatOklch is stable at the default precision", () => {
  assert.equal(formatOklch(0.5, 0.18, 250), "oklch(0.5000 0.1800 250)");
  assert.equal(formatOklch(0.5, 0.18, 250, 2), "oklch(0.50 0.18 250)");
});

// ---------------------------------------------------------------------------
// APCA — secondary diagnostic only; WCAG 2.x AA remains the shipped contract.
// ---------------------------------------------------------------------------

test("apcaLc matches published APCA reference vectors", () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 1, g: 1, b: 1 };

  // Reference values from the APCA 0.1.9 specification.
  assert.equal(apcaLc(black, white).toFixed(2), "106.04");
  assert.equal(apcaLc(white, black).toFixed(2), "-107.88");
});

test("apcaLc sign convention is positive for dark-on-light", () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 1, g: 1, b: 1 };
  assert.ok(apcaLc(black, white) > 0, "dark text on a light background is positive");
  assert.ok(apcaLc(white, black) < 0, "light text on a dark background is negative");
});

test("apcaThreshold exposes the documented floors and rejects unknown kinds", () => {
  assert.equal(apcaThreshold("bodyText").min, 75);
  assert.equal(apcaThreshold("bodyText").preferred, 90);
  assert.equal(apcaThreshold("nonBodyText").min, 60);
  assert.equal(apcaThreshold("largeText").min, 45);
  assert.equal(apcaThreshold("uiComponent").min, 30);
  assert.equal(apcaThreshold("discernible").min, 15);
  assert.throws(() => apcaThreshold("nope"), /Unknown APCA threshold/);
});

test("meetsApca compares absolute Lc against the floor", () => {
  // Light-on-dark Lc is negative, so the comparison must use the magnitude.
  assert.equal(meetsApca(-80, "bodyText"), true);
  assert.equal(meetsApca(80, "bodyText"), true);
  assert.equal(meetsApca(-60, "bodyText"), false);
  assert.equal(meetsApca(-60, "nonBodyText"), true);
});
