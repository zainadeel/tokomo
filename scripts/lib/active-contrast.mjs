// Selected-state ("active") contrast matrix.
//
// Gate 1 of https://github.com/zainadeel/tokomo/issues/130: an exhaustive,
// row-level inventory of every documented selected-state combination, measured
// BEFORE and AFTER the active overlay is composited beneath content.
//
// This module only MEASURES and REPORTS. It deliberately changes no token and
// decides no threshold: issue #130 requires the exhaustive output to be reviewed
// before any reference or semantic token moves. Where the intended accessibility
// threshold for a family is not yet documented, the row is emitted with
// `thresholdConfirmed: false` and the default normal-text 4.5:1 target, so the
// review has an explicit list of decisions to make rather than a silent choice.
//
// Compositing model: sRGB alpha compositing, per docs/guidelines/color-generation.md
// §4.3, matching TokoMo's documented overlay method. The visual stack is defined in
// color-usage.md §3.4 "Interaction" — the selected overlay sits ABOVE the original
// background and BELOW inner content, so the content is measured against
// composite(active, background).

import { compositeRgb, flatten, parseCssColor, referenceOf } from "./token-colors.mjs";
import { contrastFromY, rgbEncodedToY } from "../../tools/color-system/oklch-utils.mjs";

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_LARGE_TEXT = 3;

export const THEMES = ["light", "dark"];

// Semantic intents present in the strong/bold/medium/faint families.
export const INTENTS = [
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

// The 12 literal hues published by the color-intent family. Their foreground is
// the reciprocal tone rather than black/white, so issue #130 requires them to be
// audited separately from the semantic intent surfaces.
export const LITERAL_HUES = [
  "blue",
  "cyan",
  "green",
  "grey",
  "magenta",
  "olive",
  "orange",
  "pink",
  "purple",
  "red",
  "teal",
  "yellow",
];

export const LITERAL_TONES = ["faint", "medium", "bold", "strong"];

export const DRIVER_STATUSES = [
  "driving",
  "off-duty",
  "on-duty",
  "personal-conveyance",
  "yard-move",
];

export const SAFETY_TIERS = ["excellent", "fair", "good"];

// ---------------------------------------------------------------------------
// Combination enumeration — mirrors the Interaction table in
// docs/guidelines/color-usage.md §3.4
// ---------------------------------------------------------------------------

// Every combination carries the surface it is documented against. A background
// that publishes no matching interaction family is NOT included: §3.4 says such a
// background is not intended for interactive UI, so inventing a pairing for it
// would report a failure that no consumer can hit.
export function buildActiveCombinations() {
  const combos = [];

  // §3.4: background.primary / background.secondary take the brand fill as their
  // selected treatment, not a black/white wash.
  for (const surface of ["primary", "secondary"]) {
    combos.push({
      group: "Default brand-selected — standard surfaces",
      family: "interaction.active-brand",
      baseToken: `--color-background-${surface}`,
      activeToken: "--color-interaction-active-brand",
      foregroundToken: "--color-foreground-primary",
    });
  }

  // §3.4: any background.faint.* takes interaction.active. There is no
  // foreground.on-faint-background family — faint surfaces carry foreground.primary.
  for (const intent of INTENTS) {
    combos.push({
      group: "Core semantic surfaces — faint",
      family: "interaction.active",
      baseToken: `--color-background-faint-${intent}`,
      activeToken: "--color-interaction-active",
      foregroundToken: "--color-foreground-primary",
    });
  }

  for (const tone of ["medium", "bold", "strong"]) {
    for (const intent of INTENTS) {
      combos.push({
        group: `Core semantic surfaces — ${tone}`,
        family: `interaction.on-${tone}-background.active`,
        baseToken: `--color-background-${tone}-${intent}`,
        activeToken: `--color-interaction-on-${tone}-background-active`,
        foregroundToken: `--color-foreground-on-${tone}-background-primary`,
      });
    }
  }

  // Literal color-intent surfaces. §3.4: keep all four states on the matching
  // on-*-background family; do not borrow a semantic-intent selected token.
  for (const tone of LITERAL_TONES) {
    for (const hue of LITERAL_HUES) {
      combos.push({
        group: `Literal color-intent surfaces — ${tone}`,
        family: `color-intent.interaction.on-${tone}-background.active`,
        baseToken: `--color-color-intent-${hue}-${tone}-background`,
        activeToken: `--color-color-intent-interaction-on-${tone}-background-active`,
        foregroundToken: `--color-color-intent-${hue}-${tone}-foreground`,
      });
    }
  }

  // Driver status publishes ONE foreground for all five status fills, and the
  // guidelines do not state a text-size restriction for it. Issue #130 flags this
  // as a Gate 2 decision, so the threshold is reported as unconfirmed.
  for (const status of DRIVER_STATUSES) {
    combos.push({
      group: "Driver status",
      family: "driver-status.interaction.active",
      baseToken: `--color-driver-status-background-${status}`,
      activeToken: "--color-driver-status-interaction-active",
      foregroundToken: "--color-driver-status-foreground",
      thresholdConfirmed: false,
      note: "No documented text-size restriction; measured against normal text pending review.",
    });
  }

  for (const tier of SAFETY_TIERS) {
    combos.push({
      group: "Safety score",
      family: "safety-score.interaction.active",
      baseToken: `--color-safety-score-background-${tier}`,
      activeToken: "--color-safety-score-interaction-active",
      foregroundToken: `--color-safety-score-foreground-on-${tier}`,
    });
  }

  // Fixed and specialized contexts. §3.4: each takes its own interaction.active,
  // or interaction.active-brand where a brand fill is the selected treatment.
  for (const family of ["always-dark", "inverted"]) {
    for (const variant of ["active", "active-brand"]) {
      combos.push({
        group: `Specialized context — ${family}`,
        family: `${family}.interaction.${variant}`,
        baseToken: `--color-${family}-background`,
        activeToken: `--color-${family}-interaction-${variant}`,
        foregroundToken: `--color-${family}-foreground-primary`,
      });
    }
  }

  for (const family of ["media", "navigation"]) {
    combos.push({
      group: `Specialized context — ${family}`,
      family: `${family}.interaction.active`,
      baseToken: `--color-${family}-background`,
      activeToken: `--color-${family}-interaction-active`,
      foregroundToken: `--color-${family}-foreground-primary`,
    });
  }

  // Translucent has no background token of its own and no universal backdrop —
  // translucent.translucent is a scrim that takes the luminance of whatever sits
  // behind it. Measuring it requires ASSUMING a backdrop, so these rows are
  // conditional and must never be reported as an unconditional pass (issue #130).
  for (const variant of ["active", "active-brand"]) {
    combos.push({
      group: "Translucent (conditional — assumed backdrop)",
      family: `translucent.interaction.${variant}`,
      baseToken: "--color-translucent-translucent",
      baseUnderToken: "--color-background-primary",
      activeToken: `--color-translucent-interaction-${variant}`,
      foregroundToken: "--color-translucent-foreground-primary",
      conditional: true,
      note:
        "Scrim composited over an ASSUMED background.primary backdrop. Translucent has no " +
        "universal backdrop, so this row is conditional, not a system-wide guarantee.",
    });
  }

  return combos;
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

function ratio(foreground, background) {
  return contrastFromY(rgbEncodedToY(foreground), rgbEncodedToY(background));
}

// One row of the exhaustive matrix, carrying every field issue #130 requires.
export function evaluateCombination(resolve, resolveChain, mode, combo) {
  const threshold = combo.threshold ?? WCAG_AA_NORMAL;
  const thresholdConfirmed = combo.thresholdConfirmed !== false;

  const activeChain = resolveChain(mode, combo.activeToken);
  const baseChain = resolveChain(mode, combo.baseToken);
  const foregroundChain = resolveChain(mode, combo.foregroundToken);

  let base = parseCssColor(resolve(mode, combo.baseToken));

  // A translucent surface is only measurable over an assumed opaque backdrop.
  if (combo.baseUnderToken) {
    const backdrop = parseCssColor(resolve(mode, combo.baseUnderToken));
    base = compositeRgb(base, backdrop);
  }
  if (base.a < 1) {
    throw new Error(
      `${combo.baseToken} is translucent in ${mode} with no assumed backdrop; ` +
        "add baseUnderToken so the row is measurable and explicitly conditional"
    );
  }

  const foreground = parseCssColor(resolve(mode, combo.foregroundToken));
  const active = parseCssColor(resolve(mode, combo.activeToken));

  const surfaceAfter = compositeRgb(active, base);

  const contrastBefore = ratio(flatten(foreground, base), base);
  const contrastAfter = ratio(flatten(foreground, surfaceAfter), surfaceAfter);

  const passBefore = contrastBefore >= threshold;
  const passAfter = contrastAfter >= threshold;

  return {
    group: combo.group,
    family: combo.family,
    theme: mode,

    activeToken: combo.activeToken,
    activeReference: referenceOf(activeChain),
    baseToken: combo.baseToken,
    baseReference: referenceOf(baseChain),
    baseUnderToken: combo.baseUnderToken ?? null,
    foregroundToken: combo.foregroundToken,
    foregroundReference: referenceOf(foregroundChain),

    contrastBefore,
    contrastAfter,

    threshold,
    thresholdConfirmed,
    conditional: combo.conditional === true,
    note: combo.note ?? null,

    pass: passAfter,
    // The distinction issue #130 turns on: a row the overlay broke needs an
    // overlay fix, a row that was already failing needs a base/foreground fix.
    activeIntroducedFailure: passBefore && !passAfter,
    baseAlreadyFailed: !passBefore,
  };
}

export function buildActiveMatrix(resolve, resolveChain, combos = buildActiveCombinations()) {
  const rows = [];
  for (const combo of combos) {
    for (const mode of THEMES) {
      rows.push(evaluateCombination(resolve, resolveChain, mode, combo));
    }
  }
  return rows;
}

export function summarizeActiveMatrix(rows) {
  const failures = rows.filter((row) => !row.pass);
  return {
    total: rows.length,
    passing: rows.length - failures.length,
    failing: failures.length,
    introducedByActive: failures.filter((row) => row.activeIntroducedFailure).length,
    baseAlreadyFailed: failures.filter((row) => row.baseAlreadyFailed).length,
    unconfirmedThreshold: rows.filter((row) => !row.thresholdConfirmed).length,
    conditional: rows.filter((row) => row.conditional).length,
  };
}
