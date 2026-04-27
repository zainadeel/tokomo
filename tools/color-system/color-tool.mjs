import {
  contrastRatioP3,
  fitOklchToP3Gamut,
  formatOklch,
  isDisplayP3InGamut,
  isSrgbInGamut,
  oklchToHex,
  relativeLuminanceFromOklch,
  solveBoldLightnessForContrast,
  solveFaintLightnessForContrast,
} from "./oklch-utils.mjs";

// Resolved relative to this module so it works both in dev (when the tool
// is served from the repo root) and when deployed alongside docs/.
const TOKEN_URL = new URL("./tokens.json", import.meta.url).href;

const TONE_ORDER = ["faint", "medium", "bold", "strong"];
const HUE_ORDER = [
  "blue-250", "purple-290", "magenta-325", "pink-0", "red-30",
  "orange-60", "yellow-85", "olive-115", "green-145", "teal-180", "cyan-215",
];

// Background anchors per the spec
const WHITE_Y = 1.0;
const DARK_BG_Y = relativeLuminanceFromOklch(0.179, 0, 0); // #161616 ≈ L 0.179
const BLACK_Y = 0.0;

// ---- Token-key parsing -------------------------------------------------------

function parseHueGroup(key) {
  // "blue-250" → { name: "blue", h: 250 }
  const m = key.match(/^([a-z]+)-(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { name: m[1], h: Number(m[2]) };
}

function parseChromaticToneKey(key) {
  // "L33-C09-strong" → { l: 0.33, c: 0.09, role: "strong" }
  const m = key.match(/^L(\d+)-C(\d+)-(\w+)$/);
  if (!m) return null;
  return { l: Number(m[1]) / 100, c: Number(m[2]) / 100, role: m[3] };
}

function parseGreyToneKey(key) {
  // "L30-light-strong" / "L91-dark-strong"
  const m = key.match(/^L(\d+)-(light|dark)-(\w+)$/);
  if (!m) return null;
  return { l: Number(m[1]) / 100, theme: m[2], role: m[3] };
}

// ---- Build a flat tone model from JSON --------------------------------------

export function buildModel(json) {
  const tones = []; // {id, theme, hueName, hueAngle, role, l, c, h, sourceHex}

  for (const theme of ["light", "dark"]) {
    const themeBlock = json[theme] || {};
    for (const hueKey of Object.keys(themeBlock)) {
      const hue = parseHueGroup(hueKey);
      if (!hue) continue;
      const tonesBlock = themeBlock[hueKey];
      for (const toneKey of Object.keys(tonesBlock)) {
        const t = parseChromaticToneKey(toneKey);
        if (!t) continue;
        tones.push({
          id: `${theme}/${hue.name}/${t.role}`,
          theme,
          hueName: hue.name,
          hueAngle: hue.h,
          role: t.role,
          l: t.l, c: t.c, h: hue.h,
          sourceHex: tonesBlock[toneKey]?.$value?.hex || null,
        });
      }
    }
  }

  // Grey
  const greyBlock = json.grey || {};
  for (const greyKey of Object.keys(greyBlock)) {
    const g = parseGreyToneKey(greyKey);
    if (!g) continue;
    tones.push({
      id: `${g.theme}/grey/${g.role}`,
      theme: g.theme,
      hueName: "grey",
      hueAngle: 0,
      role: g.role,
      l: g.l, c: 0, h: 0,
      sourceHex: greyBlock[greyKey]?.$value?.hex || null,
    });
  }

  return tones;
}

// ---- Constraint checks per the spec -----------------------------------------

const FAINT_FLOOR = 1.2;
const BOLD_FLOOR = 4.5;
const STRONG_VS_BLACK_FLOOR = 1.4;
const STRONG_VS_WHITE_FLOOR = 1.2;
const STRONG_MEDIUM_FLOOR = 4.5;
const NON_GREY_FAINT_C_CAP = 0.05;
const NON_GREY_BOLD_C_CAP = 0.20;
const DARK_MEDIUM_C_CAP = 0.17;

export function checkConstraints(tones) {
  const byId = new Map(tones.map(t => [t.id, t]));
  const get = (theme, hue, role) => byId.get(`${theme}/${hue}/${role}`);
  const results = []; // { hue, theme, label, value, target, op, pass }

  const allHues = ["grey", ...HUE_ORDER.map(h => h.split("-")[0])];

  for (const theme of ["light", "dark"]) {
    for (const hueShort of allHues) {
      // Find hue actual key — use full "blue-250" name from data; we stored hueName as short
      const hueKey = hueShort === "grey" ? "grey" : HUE_ORDER.find(h => h.startsWith(hueShort + "-")) || hueShort;
      const hueName = hueShort;

      const faint = get(theme, hueName, "faint");
      const bold = get(theme, hueName, "bold");
      const medium = get(theme, hueName, "medium");
      const strong = get(theme, hueName, "strong");
      if (!faint || !bold || !medium || !strong) continue;

      // Faint vs background
      const faintBgY = theme === "light" ? WHITE_Y : DARK_BG_Y;
      const faintY = relativeLuminanceFromOklch(faint.l, faint.c, faint.h);
      const faintRatio = (Math.max(faintY, faintBgY) + 0.05) / (Math.min(faintY, faintBgY) + 0.05);
      results.push({
        hue: hueName, theme, label: `faint ↔ ${theme === "light" ? "white" : "#161616"}`,
        value: faintRatio, target: FAINT_FLOOR, pass: faintRatio >= FAINT_FLOOR,
      });

      // Bold vs faint
      const boldVsFaint = contrastRatioP3(bold, faint);
      results.push({
        hue: hueName, theme, label: "bold ↔ faint",
        value: boldVsFaint, target: BOLD_FLOOR, pass: boldVsFaint >= BOLD_FLOOR,
      });

      // Strong vs medium
      const strongVsMedium = contrastRatioP3(strong, medium);
      results.push({
        hue: hueName, theme, label: "strong ↔ medium",
        value: strongVsMedium, target: STRONG_MEDIUM_FLOOR, pass: strongVsMedium >= STRONG_MEDIUM_FLOOR,
      });

      // Strong vs anchor
      const anchorY = theme === "light" ? BLACK_Y : WHITE_Y;
      const strongY = relativeLuminanceFromOklch(strong.l, strong.c, strong.h);
      const strongRatio = (Math.max(strongY, anchorY) + 0.05) / (Math.min(strongY, anchorY) + 0.05);
      const strongFloor = theme === "light" ? STRONG_VS_BLACK_FLOOR : STRONG_VS_WHITE_FLOOR;
      results.push({
        hue: hueName, theme, label: `strong ↔ ${theme === "light" ? "black" : "white"}`,
        value: strongRatio, target: strongFloor, pass: strongRatio >= strongFloor,
      });

      // Chroma caps (informational)
      if (hueName !== "grey") {
        results.push({
          hue: hueName, theme, label: "faint chroma ≤ 0.05",
          value: faint.c, target: NON_GREY_FAINT_C_CAP, op: "≤",
          pass: faint.c <= NON_GREY_FAINT_C_CAP,
        });
        results.push({
          hue: hueName, theme, label: "bold chroma ≤ 0.20",
          value: bold.c, target: NON_GREY_BOLD_C_CAP, op: "≤",
          pass: bold.c <= NON_GREY_BOLD_C_CAP,
        });
        if (theme === "dark") {
          results.push({
            hue: hueName, theme, label: "dark medium chroma ≤ 0.17",
            value: medium.c, target: DARK_MEDIUM_C_CAP, op: "≤",
            pass: medium.c <= DARK_MEDIUM_C_CAP,
          });
        }
      }
    }
  }
  return results;
}

// ---- Solver wrappers --------------------------------------------------------

export function autoSolveBold(faint, bold) {
  const newL = solveBoldLightnessForContrast({ faint, bold, targetContrast: BOLD_FLOOR });
  return { ...bold, l: newL };
}

export function autoSolveFaint(faint, theme) {
  const bgY = theme === "light" ? WHITE_Y : DARK_BG_Y;
  const newL = solveFaintLightnessForContrast({
    faint, backgroundY: bgY, targetContrast: FAINT_FLOOR, theme,
  });
  return { ...faint, l: newL };
}

// ---- CSV export -------------------------------------------------------------

export function tonesToCsv(tones) {
  const rows = [
    ["theme", "hue", "role", "L", "C", "H", "oklch", "hex_sRGB"],
  ];
  for (const t of tones) {
    const oklchStr = `oklch(${t.l.toFixed(2)} ${t.c.toFixed(2)} ${t.h.toFixed(0)})`;
    rows.push([
      t.theme, t.hueName, t.role,
      t.l.toFixed(2), t.c.toFixed(2), t.h.toFixed(0),
      `"${oklchStr}"`,
      oklchToHex(t.l, t.c, t.h),
    ]);
  }
  return rows.map(r => r.join(",")).join("\n");
}

// ---- Loader -----------------------------------------------------------------

export async function loadTokens() {
  const res = await fetch(TOKEN_URL);
  if (!res.ok) throw new Error(`Failed to load tokens: ${res.status}`);
  const json = await res.json();
  return buildModel(json);
}

// ---- Helpers for UI ---------------------------------------------------------

export function gamutBadge(t) {
  if (isSrgbInGamut(t.l, t.c, t.h)) return { label: "sRGB", level: "ok" };
  if (isDisplayP3InGamut(t.l, t.c, t.h)) return { label: "P3", level: "warn" };
  return { label: "out", level: "bad" };
}

export { TONE_ORDER, HUE_ORDER, formatOklch, oklchToHex, contrastRatioP3, fitOklchToP3Gamut };
