// APCA (Accessible Perceptual Contrast Algorithm) Lc scoring.
//
// NODE-ONLY. This module has a package dependency and must never be imported by
// ./oklch-utils.mjs or ./color-tool.mjs — those load in the browser with no
// bundler and no import map, so a bare specifier would 404 and break the colour
// tool. Import direction is one-way: apca.mjs -> oklch-utils.mjs.
//
// APCA is a SECONDARY DIAGNOSTIC ONLY. The shipped accessibility contract for
// @ds-mo/tokens is WCAG 2.x AA (see contrastFromY in ./oklch-utils.mjs and
// docs/guidelines/color-generation.md §4.5). Nothing in the build enforces Lc.

import { APCAcontrast, sRGBtoY } from "apca-w3";

// APCA Lc thresholds. Lc is signed: positive for dark-on-light, negative for
// light-on-dark. Compare using absolute values.
export const APCA_THRESHOLDS = {
  bodyText: { min: 75, preferred: 90 },
  nonBodyText: { min: 60, preferred: 75 },
  largeText: { min: 45, preferred: 60 },
  uiComponent: { min: 30 },
  // Absolute floor for any element intended to be discernible at all.
  discernible: { min: 15 },
};

export function apcaThreshold(kind) {
  const threshold = APCA_THRESHOLDS[kind];
  if (!threshold) {
    throw new Error(
      `Unknown APCA threshold "${kind}". Expected one of: ${Object.keys(APCA_THRESHOLDS).join(", ")}`
    );
  }
  return threshold;
}

// rgb channels are 0..1 encoded sRGB, matching hexToRgbEncoded in ./oklch-utils.mjs.
function toSrgb255({ r, g, b }) {
  return [r * 255, g * 255, b * 255];
}

// Signed Lc for a foreground over a background. Positive means dark text on a
// light background, negative means light text on a dark background.
export function apcaLc(foregroundRgb, backgroundRgb) {
  return APCAcontrast(sRGBtoY(toSrgb255(foregroundRgb)), sRGBtoY(toSrgb255(backgroundRgb)));
}

// Whether |Lc| clears the minimum for the given content kind.
export function meetsApca(lc, kind = "bodyText") {
  return Math.abs(lc) >= apcaThreshold(kind).min;
}
