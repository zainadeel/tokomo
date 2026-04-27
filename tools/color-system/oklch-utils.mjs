// ESM port of oklch-utils.js for browser use.
// Keep in sync with the CommonJS version used by the CLI workflow.

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function oklchToOklab(l, c, hDeg) {
  const hRad = (hDeg * Math.PI) / 180;
  return { L: l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) };
}

export function oklabToXyz(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    x: 1.2270138511 * l - 0.5577999807 * m + 0.281256149 * s,
    y: -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s,
    z: -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s,
  };
}

export function xyzToDisplayP3Linear(x, y, z) {
  return {
    r: 2.493496911941425 * x - 0.931383617919124 * y - 0.402710784450717 * z,
    g: -0.829488969561574 * x + 1.762664060318346 * y + 0.023624685841943 * z,
    b: 0.035845830243784 * x - 0.076172389268041 * y + 0.956884524007687 * z,
  };
}

export function xyzToSrgbLinear(x, y, z) {
  return {
    r: 3.240969941904521 * x - 1.537383177570093 * y - 0.498610760293 * z,
    g: -0.96924363628087 * x + 1.87596750150772 * y + 0.041555057407175 * z,
    b: 0.055630079696993 * x - 0.20397695888897 * y + 1.056971514242878 * z,
  };
}

export function linearToEncoded(value) {
  if (value <= 0.0031308) return 12.92 * value;
  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

export function oklchToXyz(l, c, hDeg) {
  const { L, a, b } = oklchToOklab(l, c, hDeg);
  return oklabToXyz(L, a, b);
}

export function isSrgbInGamut(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const rgb = xyzToSrgbLinear(x, y, z);
  return rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
}

export function isDisplayP3InGamut(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const p3 = xyzToDisplayP3Linear(x, y, z);
  return p3.r >= 0 && p3.r <= 1 && p3.g >= 0 && p3.g <= 1 && p3.b >= 0 && p3.b <= 1;
}

export function fitOklchToP3Gamut(l, c, hDeg) {
  if (isDisplayP3InGamut(l, c, hDeg)) return { l, c, h: hDeg };
  let low = 0;
  let high = c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (isDisplayP3InGamut(l, mid, hDeg)) low = mid;
    else high = mid;
  }
  return { l, c: low, h: hDeg };
}

export function oklchToHex(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const rgbLinear = xyzToSrgbLinear(x, y, z);
  const r = Math.round(clamp01(linearToEncoded(rgbLinear.r)) * 255);
  const g = Math.round(clamp01(linearToEncoded(rgbLinear.g)) * 255);
  const b = Math.round(clamp01(linearToEncoded(rgbLinear.b)) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

export function contrastFromY(y1, y2) {
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatioP3(colorA, colorB) {
  const fittedA = fitOklchToP3Gamut(colorA.l, colorA.c, colorA.h);
  const fittedB = fitOklchToP3Gamut(colorB.l, colorB.c, colorB.h);
  const yA = oklchToXyz(fittedA.l, fittedA.c, fittedA.h).y;
  const yB = oklchToXyz(fittedB.l, fittedB.c, fittedB.h).y;
  return contrastFromY(yA, yB);
}

// Generalized: find the L for `target` (preserving its c/h) closest to `anchor.l`
// while still meeting `targetContrast` against `anchor`. Direction is inferred
// from current target.l vs anchor.l, so this works for both light theme
// (bold darker than faint) and dark theme (bold lighter than faint).
export function solveLForContrast({ target, anchor, targetContrast = 4.5 }) {
  const goingDarker = target.l < anchor.l;
  let lo = goingDarker ? 0 : anchor.l;
  let hi = goingDarker ? anchor.l : 1;
  let best = target.l;
  for (let i = 0; i < 32; i += 1) {
    const mid = (lo + hi) / 2;
    const ratio = contrastRatioP3({ l: mid, c: target.c, h: target.h }, anchor);
    if (ratio >= targetContrast) {
      best = mid;
      if (goingDarker) lo = mid; else hi = mid;
    } else {
      if (goingDarker) hi = mid; else lo = mid;
    }
  }
  return best;
}

export function solveBoldLightnessForContrast({ faint, bold, targetContrast = 4.5 }) {
  let low = 0;
  let high = faint.l;
  let best = bold.l;
  for (let i = 0; i < 32; i += 1) {
    const mid = (low + high) / 2;
    const ratio = contrastRatioP3(
      { l: mid, c: bold.c, h: bold.h },
      { l: faint.l, c: faint.c, h: faint.h }
    );
    if (ratio >= targetContrast) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

// Solve a faint lightness given a contrast floor against a background (white or #161616 etc.)
export function solveFaintLightnessForContrast({ faint, backgroundY, targetContrast = 1.2, theme = "light" }) {
  // For light theme, faint is light against white — search from current upward toward 1.0 if too low; for dark, search downward from current toward 0.
  // Simpler: binary search across [low, high]. For light, high=1, low=0.5. For dark, low=0, high=0.5.
  let low = theme === "light" ? 0.5 : 0;
  let high = theme === "light" ? 1 : 0.5;
  let best = faint.l;
  for (let i = 0; i < 32; i += 1) {
    const mid = (low + high) / 2;
    const yMid = oklchToXyz(mid, faint.c, faint.h).y;
    const ratio = contrastFromY(yMid, backgroundY);
    if (theme === "light") {
      // higher L → lower contrast against white (white Y ≈ 1). We want ratio ≥ target.
      if (ratio >= targetContrast) { best = mid; low = mid; } else { high = mid; }
    } else {
      // dark: lower L → higher contrast against #161616. We want ratio ≥ target.
      if (ratio >= targetContrast) { best = mid; high = mid; } else { low = mid; }
    }
  }
  return best;
}

export function relativeLuminanceFromOklch(l, c, h) {
  return oklchToXyz(l, c, h).y;
}

export function formatOklch(l, c, h, decimals = 4) {
  return `oklch(${Number(l).toFixed(decimals)} ${Number(c).toFixed(decimals)} ${h})`;
}
