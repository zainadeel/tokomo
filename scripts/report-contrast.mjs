// Contrast report for the shipped semantic token pairings.
//
// Scores every foreground/background pairing documented in
// docs/guidelines/color-usage.md §7 against WCAG 2.x AA (the shipped contract)
// and APCA Lc (a secondary, non-binding diagnostic — see §4.5 of
// docs/guidelines/color-generation.md).
//
// Reads dist/json/colors.modes.json so it measures SHIPPED values, not source
// JSON. Run `npm run build` first. This script is deliberately NOT part of the
// build and gates nothing.
//
// Usage: npm run report:contrast

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compositeOverlayRgb,
  contrastFromY,
  isDisplayP3InGamut,
  isSrgbInGamut,
  linearToEncoded,
  oklchToXyz,
  rgbEncodedToY,
  xyzToSrgbLinear,
} from "../tools/color-system/oklch-utils.mjs";
import { apcaLc, apcaThreshold } from "../tools/color-system/apca.mjs";

const MODES_PATH = "dist/json/colors.modes.json";
const CSS_PATH = "dist/colors.css";
const REPORT_PATH = "reports/contrast.md";

const WCAG_AA_NORMAL = 4.5;
const APCA_BODY_MIN = apcaThreshold("bodyText").min;

// Semantic intents present in the strong/bold/medium/faint families.
const INTENTS = [
  "ai",
  "brand",
  "caution",
  "guide",
  "negative",
  "neutral",
  "positive",
  "walkthrough",
  "warning",
];

// ---------------------------------------------------------------------------
// Colour resolution
// ---------------------------------------------------------------------------

// Reference tokens are emitted only into the light map (they are theme-independent
// custom properties in :root), so dark-mode lookups fall back to light.
function makeResolver(modes) {
  return function resolve(mode, name, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
    seen.add(name);

    const token = modes[mode]?.[name] ?? modes.light?.[name];
    if (!token) throw new Error(`Unknown token ${name} in mode ${mode}`);

    const value = String(token.$value).trim();
    const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (varMatch) return resolve(mode, varMatch[1], seen);
    return value;
  };
}

// Returns { r, g, b, a } with channels as 0..1 encoded sRGB.
function parseCssColor(value) {
  const rgbMatch = value.match(
    /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/
  );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]) / 255,
      g: Number(rgbMatch[2]) / 255,
      b: Number(rgbMatch[3]) / 255,
      a: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
    };
  }

  // Reference chromatic tokens ship as oklch(L% C H) — L is a percentage.
  const oklchMatch = value.match(
    /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/
  );
  if (oklchMatch) {
    const l = Number(oklchMatch[1]) / 100;
    const c = Number(oklchMatch[2]);
    const h = Number(oklchMatch[3]);
    const { x, y, z } = oklchToXyz(l, c, h);
    const lin = xyzToSrgbLinear(x, y, z);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    return {
      r: clamp01(linearToEncoded(lin.r)),
      g: clamp01(linearToEncoded(lin.g)),
      b: clamp01(linearToEncoded(lin.b)),
      a: oklchMatch[4] === undefined ? 1 : Number(oklchMatch[4]),
    };
  }

  throw new Error(`Unsupported colour value: ${value}`);
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

// Foreground tokens are frequently black/white at partial alpha, so the
// foreground must be composited over its background before measuring — this is
// the sRGB alpha-compositing rule in color-generation.md §4.3, and it is why the
// figures in color-usage.md §7 are described as post-compositing.
function flatten(foreground, background) {
  if (foreground.a >= 1) return foreground;
  const isBlackish = foreground.r + foreground.g + foreground.b < 1.5;
  const composited = compositeOverlayRgb(
    background,
    isBlackish ? "black" : "white",
    foreground.a
  );
  return { ...composited, a: 1 };
}

function measure(resolve, mode, fgToken, bgToken) {
  const background = parseCssColor(resolve(mode, bgToken));
  if (background.a < 1) {
    // Translucent surfaces have no single well-defined backdrop; skip rather
    // than invent one and report a number that looks authoritative.
    return null;
  }
  const foreground = flatten(parseCssColor(resolve(mode, fgToken)), background);

  const wcag = contrastFromY(rgbEncodedToY(foreground), rgbEncodedToY(background));
  const lc = apcaLc(foreground, background);
  return { wcag, lc };
}

// ---------------------------------------------------------------------------
// Pairing matrix — mirrors docs/guidelines/color-usage.md §7
// ---------------------------------------------------------------------------

function buildPairs() {
  const groups = [];

  groups.push({
    id: "7.1-surface",
    title: "§7.1 Preferred text pairings — standard surface",
    pairs: [
      ["--color-foreground-primary", "--color-background-primary"],
      ["--color-foreground-secondary", "--color-background-primary"],
    ],
  });

  for (const tone of ["strong", "bold"]) {
    groups.push({
      id: `7.1-${tone}`,
      title: `§7.1 Preferred text pairings — background.${tone}.* with foreground.on-${tone}-background.*`,
      pairs: INTENTS.flatMap((intent) =>
        ["primary", "secondary"].map((emphasis) => [
          `--color-foreground-on-${tone}-background-${emphasis}`,
          `--color-background-${tone}-${intent}`,
        ])
      ),
    });
  }

  // §7.2 reciprocal tone pairings, matched on intent.
  const reciprocal = [
    ["bold", "faint"],
    ["faint", "bold"],
    ["strong", "medium"],
    ["medium", "strong"],
  ];
  for (const [bgTone, fgTone] of reciprocal) {
    groups.push({
      id: `7.2-${bgTone}-${fgTone}`,
      title: `§7.2 Tone pairing — background.${bgTone}.* with foreground.${fgTone}.*`,
      pairs: INTENTS.map((intent) => [
        `--color-foreground-${fgTone}-${intent}`,
        `--color-background-${bgTone}-${intent}`,
      ]),
    });
  }

  groups.push({
    id: "7.3-low-emphasis",
    title: "§7.3 Low-emphasis tokens (expected to sit below AA by design)",
    pairs: [
      ["--color-foreground-tertiary", "--color-background-primary"],
      ["--color-foreground-quaternary", "--color-background-primary"],
      ["--color-border-tertiary", "--color-background-primary"],
    ],
  });

  return groups;
}

// ---------------------------------------------------------------------------
// Gamut audit over the shipped chromatic reference tokens
// ---------------------------------------------------------------------------

// Chromatic reference tokens ship as oklch() parsed from the token name, so the
// shipped CSS is the right thing to audit. Colours outside sRGB are expected and
// fine — browsers gamut-map them (see color-generation.md §4.4). Colours outside
// P3 are worth knowing about, because the workflow's clampP3Chroma phase exists
// to prevent them.
function auditGamut(css) {
  const pattern = /(--color-reference-[a-z0-9-]+):\s*oklch\((\d+)%\s+([\d.]+)\s+([\d.]+)\)/g;
  const outsideSrgb = [];
  const outsideP3 = [];
  let chromatic = 0;

  for (const match of css.matchAll(pattern)) {
    const [, name, lPercent, chroma, hue] = match;
    const c = Number(chroma);
    if (c === 0) continue; // achromatic greys are always in gamut
    chromatic += 1;

    const l = Number(lPercent) / 100;
    const h = Number(hue);
    if (!isSrgbInGamut(l, c, h)) outsideSrgb.push(name);
    if (!isDisplayP3InGamut(l, c, h)) outsideP3.push(name);
  }

  return { chromatic, outsideSrgb, outsideP3 };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const short = (token) => token.replace(/^--color-/, "");
const fmt = (n) => n.toFixed(2);

function run(modes, css) {
  const resolve = makeResolver(modes);
  const groups = buildPairs();
  const lines = [];
  const skipped = [];
  let wcagFailures = 0;
  let apcaShortfalls = 0;

  lines.push("# Semantic token contrast report");
  lines.push("");
  lines.push(
    `Generated by \`npm run report:contrast\` from \`${MODES_PATH}\`. Do not edit by hand.`
  );
  lines.push("");
  lines.push(
    `**WCAG 2.x AA (${WCAG_AA_NORMAL}:1 normal text) is the shipped contract.** APCA Lc is a ` +
      `secondary diagnostic only and gates nothing — see \`docs/guidelines/color-generation.md\` §4.5. ` +
      `Lc is signed: positive means dark-on-light, negative means light-on-dark; compare magnitudes ` +
      `against the body-text floor of ${APCA_BODY_MIN}.`
  );
  lines.push("");
  lines.push(
    "Foreground tokens with alpha are composited over their background in sRGB before measurement."
  );
  lines.push("");

  for (const group of groups) {
    const isLowEmphasis = group.id === "7.3-low-emphasis";
    const rows = [];

    for (const [fgToken, bgToken] of group.pairs) {
      const light = measure(resolve, "light", fgToken, bgToken);
      const dark = measure(resolve, "dark", fgToken, bgToken);
      if (!light || !dark) {
        skipped.push(`${short(fgToken)} on ${short(bgToken)}`);
        continue;
      }

      const wcagFail = !isLowEmphasis && Math.min(light.wcag, dark.wcag) < WCAG_AA_NORMAL;
      const apcaFail =
        !isLowEmphasis && Math.min(Math.abs(light.lc), Math.abs(dark.lc)) < APCA_BODY_MIN;
      if (wcagFail) wcagFailures += 1;
      if (apcaFail) apcaShortfalls += 1;

      rows.push({
        fgToken,
        bgToken,
        light,
        dark,
        flags:
          [wcagFail ? "WCAG" : null, apcaFail ? "APCA" : null].filter(Boolean).join(" + ") || "—",
        worstWcag: Math.min(light.wcag, dark.wcag),
      });
    }

    if (!rows.length) continue;

    rows.sort((a, b) => a.worstWcag - b.worstWcag);

    lines.push(`## ${group.title}`);
    lines.push("");
    lines.push("| Foreground | Background | Light WCAG | Dark WCAG | Light Lc | Dark Lc | Below floor |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const row of rows) {
      lines.push(
        `| \`${short(row.fgToken)}\` | \`${short(row.bgToken)}\` | ${fmt(row.light.wcag)}:1 | ` +
          `${fmt(row.dark.wcag)}:1 | ${fmt(row.light.lc)} | ${fmt(row.dark.lc)} | ${row.flags} |`
      );
    }
    lines.push("");

    const floor = rows[0];
    lines.push(
      `Lowest WCAG in this group: \`${short(floor.fgToken)}\` on \`${short(floor.bgToken)}\` at ` +
        `${fmt(floor.light.wcag)}:1 light / ${fmt(floor.dark.wcag)}:1 dark.`
    );
    lines.push("");
  }

  if (skipped.length) {
    lines.push("## Skipped");
    lines.push("");
    lines.push(
      "Pairings whose background is translucent, so no single backdrop luminance is defined:"
    );
    lines.push("");
    for (const entry of skipped) lines.push(`- ${entry}`);
    lines.push("");
  }

  const gamut = auditGamut(css);

  lines.push("## Gamut audit — chromatic reference tokens");
  lines.push("");
  lines.push(
    `Scanned ${gamut.chromatic} chromatic reference tokens in \`${CSS_PATH}\` (achromatic greys excluded).`
  );
  lines.push("");
  lines.push(
    `- Outside sRGB: **${gamut.outsideSrgb.length}**. Expected and acceptable — browsers gamut-map these ` +
      "by reducing chroma at constant lightness and hue, which is the shipping strategy in " +
      "`color-generation.md` §4.4."
  );
  lines.push(
    `- Outside Display P3: **${gamut.outsideP3.length}**. These exceed the authoring gamut, so the ` +
      "authored chroma is not reachable on any current display and the workflow's `clampP3Chroma` " +
      "phase would have reduced them."
  );
  lines.push("");
  if (gamut.outsideP3.length) {
    lines.push("Outside P3:");
    lines.push("");
    for (const name of gamut.outsideP3) lines.push(`- \`${short(name)}\``);
    lines.push("");
  }

  lines.push("## Summary");
  lines.push("");
  lines.push(
    `- WCAG AA failures (excluding §7.3 low-emphasis tokens, which are below AA by design): **${wcagFailures}**`
  );
  lines.push(`- Pairings below the APCA body-text floor of ${APCA_BODY_MIN}: **${apcaShortfalls}**`);
  if (skipped.length) lines.push(`- Skipped (translucent background): **${skipped.length}**`);
  lines.push(`- Chromatic reference tokens outside sRGB: **${gamut.outsideSrgb.length}** (expected)`);
  lines.push(`- Chromatic reference tokens outside P3: **${gamut.outsideP3.length}**`);
  lines.push("");

  return { markdown: `${lines.join("\n")}\n`, wcagFailures, apcaShortfalls, gamut };
}

const modes = JSON.parse(await readFile(MODES_PATH, "utf8"));
const css = await readFile(CSS_PATH, "utf8");
const { markdown, wcagFailures, apcaShortfalls, gamut } = run(modes, css);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, markdown, "utf8");

console.log(`Wrote ${REPORT_PATH}`);
console.log(`WCAG AA failures: ${wcagFailures}`);
console.log(`Below APCA body-text floor (Lc ${APCA_BODY_MIN}): ${apcaShortfalls}`);
console.log(
  `Chromatic reference tokens outside sRGB: ${gamut.outsideSrgb.length}/${gamut.chromatic} (expected — browsers gamut-map)`
);
console.log(`Chromatic reference tokens outside P3: ${gamut.outsideP3.length}`);
console.log("APCA is diagnostic only — WCAG 2.x AA remains the shipped contract.");
