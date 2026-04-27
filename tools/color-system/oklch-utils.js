function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function oklchToOklab(l, c, hDeg) {
  const hRad = (hDeg * Math.PI) / 180;
  return {
    L: l,
    a: c * Math.cos(hRad),
    b: c * Math.sin(hRad),
  };
}

function oklabToXyz(L, a, b) {
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

function xyzToDisplayP3Linear(x, y, z) {
  return {
    r: 2.493496911941425 * x - 0.931383617919124 * y - 0.402710784450717 * z,
    g: -0.829488969561574 * x + 1.762664060318346 * y + 0.023624685841943 * z,
    b: 0.035845830243784 * x - 0.076172389268041 * y + 0.956884524007687 * z,
  };
}

function xyzToSrgbLinear(x, y, z) {
  return {
    r: 3.240969941904521 * x - 1.537383177570093 * y - 0.498610760293 * z,
    g: -0.96924363628087 * x + 1.87596750150772 * y + 0.041555057407175 * z,
    b: 0.055630079696993 * x - 0.20397695888897 * y + 1.056971514242878 * z,
  };
}

function linearToEncoded(value) {
  if (value <= 0.0031308) {
    return 12.92 * value;
  }
  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function srgbChannelToLinear(value) {
  if (value <= 0.04045) {
    return value / 12.92;
  }
  return Math.pow((value + 0.055) / 1.055, 2.4);
}

function oklchToXyz(l, c, hDeg) {
  const { L, a, b } = oklchToOklab(l, c, hDeg);
  return oklabToXyz(L, a, b);
}

function oklchToDisplayP3(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const linear = xyzToDisplayP3Linear(x, y, z);
  return {
    r: linearToEncoded(clamp01(linear.r)),
    g: linearToEncoded(clamp01(linear.g)),
    b: linearToEncoded(clamp01(linear.b)),
  };
}

function isDisplayP3InGamut(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const p3 = xyzToDisplayP3Linear(x, y, z);
  return p3.r >= 0 && p3.r <= 1 && p3.g >= 0 && p3.g <= 1 && p3.b >= 0 && p3.b <= 1;
}

function fitOklchToP3Gamut(l, c, hDeg) {
  if (isDisplayP3InGamut(l, c, hDeg)) {
    return { l, c, h: hDeg };
  }

  let low = 0;
  let high = c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (isDisplayP3InGamut(l, mid, hDeg)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return { l, c: low, h: hDeg };
}

function oklchToHex(l, c, hDeg) {
  const { x, y, z } = oklchToXyz(l, c, hDeg);
  const rgbLinear = xyzToSrgbLinear(x, y, z);

  const r = Math.round(clamp01(linearToEncoded(rgbLinear.r)) * 255);
  const g = Math.round(clamp01(linearToEncoded(rgbLinear.g)) * 255);
  const b = Math.round(clamp01(linearToEncoded(rgbLinear.b)) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function contrastFromY(y1, y2) {
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastRatioP3(colorA, colorB) {
  const fittedA = fitOklchToP3Gamut(colorA.l, colorA.c, colorA.h);
  const fittedB = fitOklchToP3Gamut(colorB.l, colorB.c, colorB.h);

  const yA = oklchToXyz(fittedA.l, fittedA.c, fittedA.h).y;
  const yB = oklchToXyz(fittedB.l, fittedB.c, fittedB.h).y;
  return contrastFromY(yA, yB);
}

function solveBoldLightnessForContrast({ faint, bold, targetContrast = 4.5 }) {
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

function parseOklch(cssValue) {
  const match = cssValue.match(/oklch\(([^\s]+)\s+([^\s]+)\s+([^\s\)]+)\)/);
  if (!match) {
    throw new Error(`Invalid OKLCH value: ${cssValue}`);
  }
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

function formatOklch(l, c, h, decimals = 4) {
  return `oklch(${Number(l).toFixed(decimals)} ${Number(c).toFixed(decimals)} ${h})`;
}

function hexToRgbEncoded(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function rgbEncodedToY(rgb) {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function relativeLuminanceFromHex(hex) {
  return rgbEncodedToY(hexToRgbEncoded(hex));
}

function compositeOverlayRgb(backgroundRgb, overlay, alpha) {
  const overlayValue = overlay === "black" ? 0 : 1;
  return {
    r: alpha * overlayValue + (1 - alpha) * backgroundRgb.r,
    g: alpha * overlayValue + (1 - alpha) * backgroundRgb.g,
    b: alpha * overlayValue + (1 - alpha) * backgroundRgb.b,
  };
}

module.exports = {
  compositeOverlayRgb,
  contrastFromY,
  contrastRatioP3,
  fitOklchToP3Gamut,
  formatOklch,
  hexToRgbEncoded,
  isDisplayP3InGamut,
  oklchToDisplayP3,
  oklchToHex,
  oklchToXyz,
  parseOklch,
  relativeLuminanceFromHex,
  rgbEncodedToY,
  solveBoldLightnessForContrast,
};