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
  contrastFromY,
  isDisplayP3InGamut,
  isSrgbInGamut,
  rgbEncodedToY,
} from "../tools/color-system/oklch-utils.mjs";
import { apcaLc, apcaThreshold } from "../tools/color-system/apca.mjs";
import {
  flatten,
  makeChainResolver,
  makeResolver,
  parseCssColor,
} from "./lib/token-colors.mjs";
import {
  buildActiveMatrix,
  summarizeActiveMatrix,
} from "./lib/active-contrast.mjs";

const MODES_PATH = "dist/json/colors.modes.json";
const CSS_PATH = "dist/colors.css";
const REPORT_PATH = "reports/contrast.md";
// The selected-state matrix is exhaustive (204 rows x 11 fields), so it gets its
// own file rather than burying the pairing report it sits alongside.
const ACTIVE_REPORT_PATH = "reports/active-contrast.md";
// Machine-readable twin, so the issue #130 Gate 2 review can filter and sort the
// inventory instead of reading 204 markdown rows by eye.
const ACTIVE_JSON_PATH = "reports/active-contrast.json";

const WCAG_AA_NORMAL = 4.5;
// WCAG 2.x 1.4.11 Non-text Contrast, which governs strokes that identify a
// control or its state. Decorative strokes have no minimum.
const WCAG_UI_NONTEXT = 3;
const APCA_BODY_MIN = apcaThreshold("bodyText").min;
const APCA_UI_MIN = apcaThreshold("uiComponent").min;

// Threshold pair per group kind: [WCAG ratio, APCA |Lc|]. "informational" groups
// are measured and reported but never flagged.
const THRESHOLDS = {
  text: { wcag: WCAG_AA_NORMAL, apca: APCA_BODY_MIN, label: "text (AA 4.5:1 / Lc 75)" },
  ui: { wcag: WCAG_UI_NONTEXT, apca: APCA_UI_MIN, label: "non-text (1.4.11 3:1 / Lc 30)" },
  // The 3:1 absolute floor. A content token below this cannot be used for text at
  // ANY size (3:1 is the AA large-text minimum) nor for a meaningful icon
  // (1.4.11 non-text). Below it, a token is decorative only.
  floor3: {
    wcag: WCAG_UI_NONTEXT,
    apca: null,
    label: "3:1 absolute floor (AA large text / non-text icons)",
  },
  informational: { wcag: null, apca: null, label: "not flagged (below AA by design)" },
};

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
// Measurement
// ---------------------------------------------------------------------------

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
    kind: "informational",
    pairs: [
      ["--color-foreground-tertiary", "--color-background-primary"],
      ["--color-foreground-quaternary", "--color-background-primary"],
      ["--color-border-tertiary", "--color-background-primary"],
    ],
  });

  // -------------------------------------------------------------------------
  // Borders and dividers. These are non-text, so the relevant WCAG threshold
  // is 1.4.11 Non-text Contrast at 3:1 — and it only applies where the stroke
  // is the means of identifying a control or its state (a field outline, a
  // checkbox edge, a focus ring). A purely decorative divider has no minimum.
  // -------------------------------------------------------------------------

  const NEUTRAL_STROKES = [
    "--color-border-primary",
    "--color-border-secondary",
    "--color-border-tertiary",
    "--color-divider-divider",
  ];

  // Neutral strokes must be checked on every surface they can legitimately sit
  // on, which includes the faint intent surfaces, not just primary/secondary.
  const NEUTRAL_SURFACES = [
    "--color-background-primary",
    "--color-background-secondary",
    ...INTENTS.map((intent) => `--color-background-faint-${intent}`),
  ];

  groups.push({
    id: "borders-neutral",
    title: "Neutral strokes on every surface they can sit on",
    kind: "ui",
    pairs: NEUTRAL_STROKES.flatMap((stroke) =>
      NEUTRAL_SURFACES.map((surface) => [stroke, surface])
    ),
  });

  for (const tone of ["strong", "bold", "medium"]) {
    groups.push({
      id: `borders-on-${tone}`,
      title: `border.on-${tone}-background.* on background.${tone}.*`,
      kind: "ui",
      pairs: ["primary", "secondary", "tertiary"].flatMap((emphasis) =>
        INTENTS.map((intent) => [
          `--color-border-on-${tone}-background-${emphasis}`,
          `--color-background-${tone}-${intent}`,
        ])
      ),
    });
  }

  groups.push({
    id: "borders-semantic",
    title: "Semantic intent strokes on their own faint surface",
    kind: "ui",
    pairs: ["strong", "bold", "medium"].flatMap((tone) =>
      INTENTS.map((intent) => [
        `--color-border-${tone}-${intent}`,
        `--color-background-faint-${intent}`,
      ])
    ),
  });

  // The always-dark sub-theme. Its border tokens are mode-invariant but
  // always-dark.background is deliberately NOT (grey-l18 light, grey-l20 dark),
  // so these pairs are measured in both modes to confirm that difference stays
  // immaterial to contrast.
  groups.push({
    id: "always-dark-neutral",
    title: "always-dark neutral strokes on always-dark.background",
    kind: "ui",
    pairs: [
      "--color-always-dark-border-primary",
      "--color-always-dark-border-secondary",
      "--color-always-dark-border-tertiary",
      "--color-always-dark-divider",
    ].map((stroke) => [stroke, "--color-always-dark-background"]),
  });

  groups.push({
    id: "always-dark-semantic",
    title: "always-dark intent strokes on always-dark.background",
    kind: "ui",
    pairs: ["strong", "bold", "medium", "faint"].flatMap((tone) =>
      INTENTS.map((intent) => [
        `--color-always-dark-border-${tone}-${intent}`,
        "--color-always-dark-background",
      ])
    ),
  });

  // -------------------------------------------------------------------------
  // Foreground 3:1 floor audit.
  //
  // Every content token measured against the 3:1 absolute floor rather than
  // 4.5:1. A foreground below 3:1 cannot carry text at any size, because 3:1 is
  // the AA minimum for LARGE text, and cannot carry a meaningful icon either.
  // Passing 3:1 but failing 4.5:1 means large-text-and-icons only.
  // -------------------------------------------------------------------------

  const CONTENT_STEPS = ["primary", "secondary", "tertiary", "quaternary"];

  groups.push({
    id: "floor-core-neutral",
    title: "3:1 floor — foreground.{primary…quaternary} on every neutral surface",
    kind: "floor3",
    pairs: CONTENT_STEPS.flatMap((step) =>
      NEUTRAL_SURFACES.map((surface) => [`--color-foreground-${step}`, surface])
    ),
  });

  for (const tone of ["strong", "bold", "medium"]) {
    groups.push({
      id: `floor-on-${tone}`,
      title: `3:1 floor — foreground.on-${tone}-background.{primary…quaternary} on background.${tone}.*`,
      kind: "floor3",
      pairs: CONTENT_STEPS.flatMap((step) =>
        INTENTS.map((intent) => [
          `--color-foreground-on-${tone}-background-${step}`,
          `--color-background-${tone}-${intent}`,
        ])
      ),
    });
  }

  groups.push({
    id: "floor-intent-on-neutral",
    title: "3:1 floor — foreground.{strong,bold,medium,faint}.* on background.primary",
    kind: "floor3",
    pairs: ["strong", "bold", "medium", "faint"].flatMap((tone) =>
      INTENTS.map((intent) => [
        `--color-foreground-${tone}-${intent}`,
        "--color-background-primary",
      ])
    ),
  });

  // Sub-themes, each against its own surface.
  const SUBTHEMES = [
    ["always-dark", "--color-always-dark-background", INTENTS],
    ["inverted", "--color-inverted-background", INTENTS],
    ["media", "--color-media-background", []],
    ["navigation", "--color-navigation-background", ["brand"]],
  ];

  for (const [family, surface, intents] of SUBTHEMES) {
    groups.push({
      id: `floor-${family}`,
      title: `3:1 floor — ${family}.foreground.* on ${family}.background`,
      kind: "floor3",
      pairs: [
        ...CONTENT_STEPS.map((step) => [`--color-${family}-foreground-${step}`, surface]),
        ...intents.map((intent) => [`--color-${family}-foreground-${intent}`, surface]),
      ],
    });
  }

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

// ---------------------------------------------------------------------------
// Selected-state ("active") overlay matrix — issue #130 Gate 1
// ---------------------------------------------------------------------------

// Renders the exhaustive inventory. This report MEASURES only: no token value is
// changed and no unconfirmed threshold is decided here, because issue #130
// requires this output to be reviewed before any token moves.
function renderActiveMatrix(rows, summary) {
  const lines = [];
  const verdict = (row) => {
    if (row.pass) return "pass";
    if (row.activeIntroducedFailure) return "**FAIL — active introduced**";
    return "**FAIL — base already failed**";
  };

  lines.push("# Selected-state (`active`) overlay contrast matrix");
  lines.push("");
  lines.push(
    `Generated by \`npm run report:contrast\` from \`${MODES_PATH}\`. Do not edit by hand.`
  );
  lines.push("");
  lines.push(
    "Exhaustive row-level inventory of every documented selected-state combination, per the " +
      "Interaction table in `docs/guidelines/color-usage.md` §3.4. In interaction token names " +
      "`active` means the persistent **selected** state, not the transient CSS `:active` pointer " +
      "state."
  );
  lines.push("");
  lines.push(
    "The documented visual stack puts the selected overlay **above** the original background and " +
      "**below** inner content, so content is measured against `composite(active, background)` " +
      "using sRGB alpha compositing (`color-generation.md` §4.3). Foreground tokens with alpha are " +
      "then composited over that result."
  );
  lines.push("");
  lines.push(
    "**This report changes nothing.** It is the Gate 1 measurement for " +
      "[issue #130](https://github.com/zainadeel/tokomo/issues/130). Tuning overlay references, " +
      "base/foreground pairings, or palette relationships is Gate 3, and is blocked until the " +
      "compatibility and threshold review in Gate 2 is complete."
  );
  lines.push("");
  lines.push("Columns:");
  lines.push("");
  lines.push("- **Before** — foreground on the base background, with no overlay applied.");
  lines.push("- **After** — foreground on the base background with the selected overlay composited beneath it.");
  lines.push(
    "- **Result** — `pass`, `FAIL — active introduced` (the base pairing passed and the overlay " +
      "broke it), or `FAIL — base already failed` (the pairing was already below threshold before " +
      "the overlay)."
  );
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Combinations measured: **${summary.total}** (${summary.total / 2} pairings x 2 themes)`);
  lines.push(`- Passing: **${summary.passing}**`);
  lines.push(`- Failing: **${summary.failing}**`);
  lines.push(`  - Introduced by the active overlay: **${summary.introducedByActive}**`);
  lines.push(`  - Already failing before the overlay: **${summary.baseAlreadyFailed}**`);
  lines.push(
    `- Rows whose applicable threshold is **not yet documented**: **${summary.unconfirmedThreshold}** ` +
      "(measured against normal text pending the Gate 2 decision)"
  );
  lines.push(
    `- Rows that are **conditional**, not a system-wide guarantee: **${summary.conditional}**`
  );
  lines.push("");

  // Group-level orientation, explicitly labelled as non-authoritative so it is
  // not mistaken for the inventory the issue asks for.
  lines.push("### By family");
  lines.push("");
  lines.push(
    "Orientation only. The authoritative inventory is the per-row tables below — issue #130 " +
      "requires every failing combination listed individually, not totals by family."
  );
  lines.push("");
  lines.push("| Group | Pass | Fail | Active introduced | Base already failed |");
  lines.push("| --- | --- | --- | --- | --- |");
  const groups = [];
  for (const row of rows) {
    let entry = groups.find((g) => g.title === row.group);
    if (!entry) {
      entry = { title: row.group, pass: 0, fail: 0, introduced: 0, base: 0, rows: [] };
      groups.push(entry);
    }
    entry.rows.push(row);
    if (row.pass) entry.pass += 1;
    else {
      entry.fail += 1;
      if (row.activeIntroducedFailure) entry.introduced += 1;
      if (row.baseAlreadyFailed) entry.base += 1;
    }
  }
  for (const g of groups) {
    lines.push(`| ${g.title} | ${g.pass} | ${g.fail} | ${g.introduced} | ${g.base} |`);
  }
  lines.push("");

  lines.push("## Full matrix");
  lines.push("");

  for (const g of groups) {
    lines.push(`### ${g.title}`);
    lines.push("");

    const notes = [...new Set(g.rows.map((r) => r.note).filter(Boolean))];
    for (const note of notes) {
      lines.push(`> ${note}`);
      lines.push("");
    }
    if (g.rows.some((r) => !r.thresholdConfirmed)) {
      lines.push(
        "> **Threshold unconfirmed.** These rows are measured against the " +
          `${WCAG_AA_NORMAL}:1 normal-text target because no large-text or non-text restriction is ` +
          "documented for this family. Confirming or restricting that threshold is a Gate 2 decision."
      );
      lines.push("");
    }

    lines.push(
      "| Theme | Active token | Active ref | Base background | Base ref | Foreground | Foreground ref | Before | After | Threshold | Result |"
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const row of [...g.rows].sort(
      (a, b) => a.contrastAfter - b.contrastAfter || a.theme.localeCompare(b.theme)
    )) {
      lines.push(
        `| ${row.theme} | \`${short(row.activeToken)}\` | \`${short(row.activeReference)}\` | ` +
          `\`${short(row.baseToken)}\` | \`${short(row.baseReference)}\` | ` +
          `\`${short(row.foregroundToken)}\` | \`${short(row.foregroundReference)}\` | ` +
          `${fmt(row.contrastBefore)}:1 | ${fmt(row.contrastAfter)}:1 | ` +
          `${fmt(row.threshold)}:1${row.thresholdConfirmed ? "" : " (unconfirmed)"} | ${verdict(row)} |`
      );
    }
    lines.push("");
  }

  // Every failure, individually, as the acceptance criteria require.
  const failures = rows.filter((row) => !row.pass);
  lines.push("## Every failing combination");
  lines.push("");
  if (!failures.length) {
    lines.push("No documented selected-state combination falls below its threshold.");
    lines.push("");
  } else {
    lines.push(
      `${failures.length} failing combinations, each listed individually and sorted by severity. ` +
        "`Cause` separates the two fixes issue #130 distinguishes: a row the overlay broke needs an " +
        "overlay-reference fix, a row that was already failing needs a base or foreground fix."
    );
    lines.push("");
    lines.push(
      "| Theme | Active token | Base background | Foreground | Before | After | Threshold | Cause |"
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const row of [...failures].sort((a, b) => a.contrastAfter - b.contrastAfter)) {
      lines.push(
        `| ${row.theme} | \`${short(row.activeToken)}\` | \`${short(row.baseToken)}\` | ` +
          `\`${short(row.foregroundToken)}\` | ${fmt(row.contrastBefore)}:1 | ` +
          `${fmt(row.contrastAfter)}:1 | ${fmt(row.threshold)}:1` +
          `${row.thresholdConfirmed ? "" : " (unconfirmed)"} | ` +
          `${row.activeIntroducedFailure ? "active introduced" : "base already failed"} |`
      );
    }
    lines.push("");
  }

  // The explicit Gate 2 agenda.
  lines.push("## Gate 2 review agenda");
  lines.push("");
  lines.push(
    "Issue #130 requires the intended compatibility and threshold for each family to be confirmed " +
      "before any token changes. The rows below are the ones this measurement cannot settle on its own."
  );
  lines.push("");

  const unconfirmed = rows.filter((row) => !row.thresholdConfirmed);
  lines.push("### Undocumented thresholds");
  lines.push("");
  if (!unconfirmed.length) {
    lines.push("Every measured family has a documented threshold.");
  } else {
    const families = [...new Set(unconfirmed.map((row) => row.family))];
    for (const family of families) {
      const subset = unconfirmed.filter((row) => row.family === family);
      const failing = subset.filter((row) => !row.pass).length;
      lines.push(
        `- \`${family}\` — ${subset.length} rows, ${failing} failing at ${WCAG_AA_NORMAL}:1. ` +
          "Confirm whether this family is restricted to large text / non-text (3:1), or whether the " +
          "base foreground choices need correction."
      );
    }
  }
  lines.push("");

  const conditional = rows.filter((row) => row.conditional);
  lines.push("### Conditional rows");
  lines.push("");
  if (!conditional.length) {
    lines.push("No measured row depends on an assumed backdrop.");
  } else {
    lines.push(
      "These pass only against the assumed backdrop named below. They are **not** an unconditional " +
        "guarantee, and must not be reported as one."
    );
    lines.push("");
    for (const row of conditional) {
      lines.push(
        `- ${row.theme} — \`${short(row.activeToken)}\` on \`${short(row.baseToken)}\` over an ` +
          `assumed \`${short(row.baseUnderToken)}\` backdrop: ${fmt(row.contrastAfter)}:1.`
      );
    }
  }
  lines.push("");

  lines.push("## Out of scope here");
  lines.push("");
  lines.push(
    "- **Token changes.** Gate 3, blocked on the Gate 2 review above."
  );
  lines.push(
    "- **Hover and pressed overlays.** Issue #130 defers these to a follow-up. They stack *above* " +
      "both the selected overlay and the content, not beneath it, so the composite order differs " +
      "from the one measured here and they need their own audit rather than a re-run of this one. " +
      "`buildActiveMatrix()` accepts a caller-supplied combination list, and `evaluateCombination()` " +
      "is agnostic about which overlay token it is handed, so the resolution and compositing layer " +
      "is reusable; the enumeration and the stacking order are not."
  );
  lines.push(
    "- **CompoMo.** Explicitly out of scope for both the calculation and the fix. Consumers stay on " +
      "the correct semantic token; failures are not to be fixed by component-specific token " +
      "substitution."
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}


function run(modes, css) {
  const resolve = makeResolver(modes);
  const resolveChain = makeChainResolver(modes);
  const groups = buildPairs();
  const activeRows = buildActiveMatrix(resolve, resolveChain);
  const activeSummary = summarizeActiveMatrix(activeRows);
  const lines = [];
  const skipped = [];
  const floorFailures = [];
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
  lines.push(
    "An `Lc` of exactly `0.00` is not an error: APCA clamps contrast below its own low-contrast " +
      "threshold to zero rather than reporting a misleadingly small number. Read it as " +
      "\"indistinguishable by APCA\" and use the WCAG column for those rows."
  );
  lines.push("");
  lines.push(
    "Strokes are measured against WCAG 1.4.11 Non-text Contrast (3:1). That threshold applies only " +
      "where the stroke is what identifies a control or its state — a field outline, a checkbox " +
      "edge, a focus ring. A stroke that is purely decorative, or a divider between blocks of " +
      "content, has no minimum, so a flagged row is a prompt to check how the token is used rather " +
      "than an automatic defect."
  );
  lines.push("");

  for (const group of groups) {
    const threshold = THRESHOLDS[group.kind ?? "text"];
    const rows = [];

    for (const [fgToken, bgToken] of group.pairs) {
      const light = measure(resolve, "light", fgToken, bgToken);
      const dark = measure(resolve, "dark", fgToken, bgToken);
      if (!light || !dark) {
        skipped.push(`${short(fgToken)} on ${short(bgToken)}`);
        continue;
      }

      const wcagFail =
        threshold.wcag !== null && Math.min(light.wcag, dark.wcag) < threshold.wcag;
      const apcaFail =
        threshold.apca !== null &&
        Math.min(Math.abs(light.lc), Math.abs(dark.lc)) < threshold.apca;
      if (wcagFail) wcagFailures += 1;
      if (apcaFail) apcaShortfalls += 1;

      if (group.kind === "floor3" && wcagFail) {
        floorFailures.push({
          group: group.title,
          fgToken,
          bgToken,
          light: light.wcag,
          dark: dark.wcag,
          failsLight: light.wcag < WCAG_UI_NONTEXT,
          failsDark: dark.wcag < WCAG_UI_NONTEXT,
        });
      }

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
    lines.push(`Threshold applied: ${threshold.label}.`);
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

  // Consolidated list of every content token that cannot carry text at any size.
  lines.push("## Below the 3:1 absolute floor — consolidated");
  lines.push("");
  lines.push(
    "Every foreground pairing below $3{:}1$ in at least one theme. $3{:}1$ is the AA minimum for " +
      "**large** text (24px, or 18.5px bold) and the 1.4.11 minimum for a meaningful icon, so a " +
      "pairing below it cannot carry text at any size and cannot carry an icon. It is decorative " +
      "only — suitable for a disabled-state hint or a de-emphasis wash, nothing that must be read."
  );
  lines.push("");

  if (!floorFailures.length) {
    lines.push("No foreground pairing falls below 3:1.");
    lines.push("");
  } else {
    lines.push(`${floorFailures.length} pairings below 3:1.`);
    lines.push("");
    lines.push("| Foreground | Background | Light | Dark | Fails in |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of [...floorFailures].sort((a, b) => {
      const worst = (r) => Math.min(r.light, r.dark);
      return worst(a) - worst(b);
    })) {
      const where =
        row.failsLight && row.failsDark ? "both" : row.failsLight ? "light only" : "dark only";
      lines.push(
        `| \`${short(row.fgToken)}\` | \`${short(row.bgToken)}\` | ${fmt(row.light)}:1 | ` +
          `${fmt(row.dark)}:1 | ${where} |`
      );
    }
    lines.push("");
  }

  // Selected-state overlays are measured in their own report because the matrix
  // is exhaustive. Surfaced here so this report does not read as complete
  // coverage of the shipped pairings when it excludes interaction overlays.
  lines.push("## Selected-state (`active`) overlays");
  lines.push("");
  lines.push(
    `Measured separately in \`${ACTIVE_REPORT_PATH}\` (machine-readable twin at ` +
      `\`${ACTIVE_JSON_PATH}\`), written by this same command. The pairings above are measured ` +
      "**without** any interaction overlay applied, so a pass here does not imply a pass once the " +
      "selected overlay is composited beneath the content."
  );
  lines.push("");
  lines.push(
    `- Combinations measured: **${activeSummary.total}**` +
      ` — passing **${activeSummary.passing}**, failing **${activeSummary.failing}**.`
  );
  lines.push(
    `- Of the failures, **${activeSummary.introducedByActive}** were introduced by the overlay and ` +
      `**${activeSummary.baseAlreadyFailed}** were already failing at the base pairing.`
  );
  lines.push("");

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
    `- WCAG failures against each group's own threshold — ${WCAG_AA_NORMAL}:1 for text, ` +
      `${WCAG_UI_NONTEXT}:1 for non-text strokes, none for informational groups: **${wcagFailures}**`
  );
  lines.push(
    `- Pairings below their APCA floor (Lc ${APCA_BODY_MIN} text, Lc ${APCA_UI_MIN} non-text): **${apcaShortfalls}**`
  );
  if (skipped.length) lines.push(`- Skipped (translucent background): **${skipped.length}**`);
  lines.push(
    `- Selected-state (\`active\`) combinations failing their threshold: ` +
      `**${activeSummary.failing}/${activeSummary.total}** (see \`${ACTIVE_REPORT_PATH}\`)`
  );
  lines.push(`- Chromatic reference tokens outside sRGB: **${gamut.outsideSrgb.length}** (expected)`);
  lines.push(`- Chromatic reference tokens outside P3: **${gamut.outsideP3.length}**`);
  lines.push("");

  return {
    markdown: `${lines.join("\n")}\n`,
    wcagFailures,
    apcaShortfalls,
    gamut,
    activeRows,
    activeSummary,
    activeMarkdown: renderActiveMatrix(activeRows, activeSummary),
  };
}

const modes = JSON.parse(await readFile(MODES_PATH, "utf8"));
const css = await readFile(CSS_PATH, "utf8");
const { markdown, wcagFailures, apcaShortfalls, gamut, activeRows, activeSummary, activeMarkdown } =
  run(modes, css);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, markdown, "utf8");
await writeFile(ACTIVE_REPORT_PATH, activeMarkdown, "utf8");
await writeFile(
  ACTIVE_JSON_PATH,
  `${JSON.stringify({ summary: activeSummary, rows: activeRows }, null, 2)}\n`,
  "utf8"
);

console.log(`Wrote ${REPORT_PATH}`);
console.log(`Wrote ${ACTIVE_REPORT_PATH}`);
console.log(`Wrote ${ACTIVE_JSON_PATH}`);
console.log(
  `WCAG failures vs per-group threshold (${WCAG_AA_NORMAL}:1 text, ${WCAG_UI_NONTEXT}:1 non-text): ${wcagFailures}`
);
console.log(
  `Below APCA floor (Lc ${APCA_BODY_MIN} text, Lc ${APCA_UI_MIN} non-text): ${apcaShortfalls}`
);
console.log(
  `Chromatic reference tokens outside sRGB: ${gamut.outsideSrgb.length}/${gamut.chromatic} (expected — browsers gamut-map)`
);
console.log(`Chromatic reference tokens outside P3: ${gamut.outsideP3.length}`);
console.log("APCA is diagnostic only — WCAG 2.x AA remains the shipped contract.");
console.log(
  `Selected-state (active) combinations: ${activeSummary.failing}/${activeSummary.total} failing ` +
    `(${activeSummary.introducedByActive} introduced by the overlay, ` +
    `${activeSummary.baseAlreadyFailed} already failing at base)`
);
console.log(
  `Selected-state rows awaiting a documented threshold: ${activeSummary.unconfirmedThreshold}; ` +
    `conditional rows: ${activeSummary.conditional}. This report changes no tokens (issue #130 Gate 1).`
);
