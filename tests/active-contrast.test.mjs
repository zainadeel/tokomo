// Tests for the selected-state ("active") contrast matrix — issue #130 Gate 1.
//
// The matrix is only useful if it is exhaustive, so the load-bearing test here is
// the coverage test: every `active` interaction token the package ships must
// appear in the audit. That is what stops a new overlay token from being added
// later and silently going unmeasured.

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

import {
  compositeRgb,
  makeChainResolver,
  makeResolver,
  parseCssColor,
  referenceOf,
} from "../scripts/lib/token-colors.mjs";
import {
  buildActiveCombinations,
  buildActiveMatrix,
  evaluateCombination,
  EXCLUDED_ACTIVE_TOKENS,
  summarizeActiveMatrix,
  WCAG_AA_NORMAL,
  WCAG_LARGE_TEXT,
} from "../scripts/lib/active-contrast.mjs";

const modes = JSON.parse(
  await readFile(new URL("../dist/json/colors.modes.json", import.meta.url), "utf8")
);
const resolve = makeResolver(modes);
const resolveChain = makeChainResolver(modes);
const combos = buildActiveCombinations();
const rows = buildActiveMatrix(resolve, resolveChain);

// Every shipped selected-state overlay token. `active-brand` is included; focus,
// hover, and pressed are not (hover/pressed are the documented follow-up).
const shippedActiveTokens = Object.keys(modes.light)
  .filter((name) => /^--color-.*interaction.*-active(-brand)?$/.test(name))
  .sort();

test("every shipped active interaction token is audited or explicitly excluded", () => {
  const audited = [...new Set(combos.map((combo) => combo.activeToken))];
  const accounted = [...new Set([...audited, ...EXCLUDED_ACTIVE_TOKENS])].sort();
  assert.deepEqual(
    accounted,
    shippedActiveTokens,
    "an active overlay token is shipped but neither audited nor listed in EXCLUDED_ACTIVE_TOKENS"
  );
});

test("excluded tokens are out of the matrix, and only those", () => {
  const audited = new Set(combos.map((combo) => combo.activeToken));
  for (const token of EXCLUDED_ACTIVE_TOKENS) {
    assert.ok(!audited.has(token), `${token} is excluded but still audited`);
    // An exclusion must name a token that actually ships, otherwise it is a
    // stale entry silently widening the exemption.
    assert.ok(shippedActiveTokens.includes(token), `${token} is excluded but not shipped`);
  }
});

test("matrix covers both themes for every combination", () => {
  assert.equal(rows.length, combos.length * 2);
  const light = rows.filter((row) => row.theme === "light").length;
  assert.equal(light, combos.length);
  assert.equal(rows.filter((row) => row.theme === "dark").length, combos.length);
});

test("every row carries all fields issue #130 requires", () => {
  for (const row of rows) {
    for (const field of [
      "theme",
      "activeToken",
      "activeReference",
      "baseToken",
      "baseReference",
      "foregroundToken",
      "foregroundReference",
      "contrastBefore",
      "contrastAfter",
      "threshold",
      "thresholdBasis",
    ]) {
      assert.ok(
        row[field] !== undefined && row[field] !== null,
        `${row.activeToken} on ${row.baseToken} (${row.theme}) is missing ${field}`
      );
    }
    assert.equal(typeof row.pass, "boolean");
    assert.equal(typeof row.activeIntroducedFailure, "boolean");
    assert.equal(typeof row.baseAlreadyFailed, "boolean");
    // Every reference field must resolve to an actual reference token, otherwise
    // the review cannot tell which value to edit.
    for (const field of ["activeReference", "baseReference", "foregroundReference"]) {
      assert.match(row[field], /^--color-reference-/, `${row[field]} is not a reference token`);
    }
  }
});

test("literal color-intent surfaces use the matching on-*-background family", () => {
  // §3.4 forbids borrowing a semantic-intent selected token for a literal hue.
  const literal = combos.filter((combo) => combo.baseToken.startsWith("--color-color-intent-"));
  assert.ok(literal.length > 0);
  for (const combo of literal) {
    const tone = combo.baseToken.match(/-(faint|medium|bold|strong)-background$/)[1];
    assert.equal(
      combo.activeToken,
      `--color-color-intent-interaction-on-${tone}-background-active`
    );
    // Foreground must be the reciprocal-tone literal foreground, not black/white.
    assert.match(combo.foregroundToken, /^--color-color-intent-.*-foreground$/);
  }
});

test("failure cause is attributed exactly one way", () => {
  for (const row of rows) {
    if (row.pass) {
      assert.equal(row.activeIntroducedFailure, false);
      continue;
    }
    // A failing row is either one the overlay broke, or one that was already
    // failing — never both, and never neither.
    assert.notEqual(
      row.activeIntroducedFailure,
      row.baseAlreadyFailed,
      `${row.activeToken} on ${row.baseToken} (${row.theme}) has ambiguous cause`
    );
  }
});

test("rows over an assumed backdrop are marked conditional", () => {
  // One family in scope has no opaque background of its own: the translucent
  // scrim. (The cluster marker is the other such surface, but markers are out of
  // scope — see EXCLUDED_ACTIVE_TOKENS.)
  const CONDITIONAL_BASES = ["--color-translucent-translucent"];
  for (const base of CONDITIONAL_BASES) {
    const subset = rows.filter((row) => row.baseToken === base);
    assert.ok(subset.length > 0, `${base} is not measured`);
    for (const row of subset) {
      assert.equal(row.conditional, true, `${base} must never report an unconditional result`);
      assert.equal(row.baseUnderToken, "--color-background-primary");
      assert.match(row.note, /assumed/i);
    }
  }
  // Nothing else may claim a conditional result.
  const conditional = rows.filter((row) => row.conditional);
  for (const row of conditional) {
    assert.ok(CONDITIONAL_BASES.includes(row.baseToken), `${row.baseToken} marked conditional`);
  }
  // Every conditional row must name the backdrop it assumed.
  for (const row of conditional) assert.ok(row.baseUnderToken);
});

test("driver status pairs each status fill with its own foreground and overlay", () => {
  // The family was restructured from one shared foreground to one per status,
  // which is what removed its resting failures. Guard the pairing so a future
  // export cannot silently collapse it back.
  const driver = rows.filter((row) => row.family.startsWith("driver-status.interaction.on-"));
  assert.equal(driver.length, 10);
  for (const row of driver) {
    const status = row.baseToken.replace("--color-driver-status-background-", "");
    assert.equal(row.foregroundToken, `--color-driver-status-foreground-${status}`);
    assert.equal(row.activeToken, `--color-driver-status-interaction-on-${status}-active`);
    // Restricted to bold / large text — a confirmed decision, not an assumption.
    assert.equal(row.threshold, WCAG_LARGE_TEXT);
    assert.equal(row.thresholdConfirmed, true);
    assert.match(row.thresholdBasis, /bold \/ large text/);
    assert.ok(row.pass, `${row.baseToken} (${row.theme}) fails 3:1 at ${row.contrastAfter}`);
  }
});

test("driver status no longer fails at rest", () => {
  // Before the per-status split, 6 of its 10 rows failed with no overlay applied.
  const driver = rows.filter((row) => row.family.startsWith("driver-status.interaction.on-"));
  const restFailures = driver.filter((row) => row.contrastBefore < row.threshold);
  assert.deepEqual(restFailures, [], "the per-status foreground split should clear all resting failures");
});

test("compositeRgb applies source-over against an opaque base", () => {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 1, g: 1, b: 1, a: 1 };

  // A fully opaque overlay replaces the base.
  assert.deepEqual(compositeRgb(white, black), { r: 1, g: 1, b: 1, a: 1 });

  // white at 10% over black lands at 0.1 in every channel.
  const wash = compositeRgb({ r: 1, g: 1, b: 1, a: 0.1 }, black);
  for (const channel of ["r", "g", "b"]) {
    assert.ok(Math.abs(wash[channel] - 0.1) < 1e-12);
  }
  assert.equal(wash.a, 1);

  // A zero-alpha overlay is a no-op.
  const noop = compositeRgb({ r: 1, g: 0, b: 0, a: 0 }, black);
  assert.deepEqual(noop, { r: 0, g: 0, b: 0, a: 1 });
});

test("referenceOf returns the last reference link in an alias chain", () => {
  assert.equal(
    referenceOf(["--color-interaction-active", "--color-reference-black-10", "rgb(0 0 0 / 0.1)"]),
    "--color-reference-black-10"
  );
  // A chain with no reference indirection falls back to its own head.
  assert.equal(referenceOf(["--color-thing", "rgb(0 0 0)"]), "--color-thing");
});

test("an active overlay that lowers contrast is attributed to the overlay", () => {
  // Synthetic fixture: white text on a dark base passes; a white wash beneath it
  // lifts the surface and breaks it. Cause must be "active introduced".
  const fixture = {
    light: {
      "--fg": { $value: "rgb(255 255 255)" },
      "--base": { $value: "rgb(60 60 60)" },
      "--overlay": { $value: "rgb(255 255 255 / 0.4)" },
    },
  };
  const row = evaluateCombination(
    makeResolver(fixture),
    makeChainResolver(fixture),
    "light",
    {
      group: "fixture",
      family: "fixture",
      baseToken: "--base",
      activeToken: "--overlay",
      foregroundToken: "--fg",
    }
  );
  assert.ok(row.contrastBefore >= WCAG_AA_NORMAL);
  assert.ok(row.contrastAfter < row.contrastBefore);
  assert.equal(row.pass, false);
  assert.equal(row.activeIntroducedFailure, true);
  assert.equal(row.baseAlreadyFailed, false);
});

test("a base pairing that already fails is not blamed on the overlay", () => {
  const fixture = {
    light: {
      "--fg": { $value: "rgb(140 140 140)" },
      "--base": { $value: "rgb(160 160 160)" },
      "--overlay": { $value: "rgb(0 0 0 / 0.1)" },
    },
  };
  const row = evaluateCombination(
    makeResolver(fixture),
    makeChainResolver(fixture),
    "light",
    {
      group: "fixture",
      family: "fixture",
      baseToken: "--base",
      activeToken: "--overlay",
      foregroundToken: "--fg",
    }
  );
  assert.equal(row.pass, false);
  assert.equal(row.baseAlreadyFailed, true);
  assert.equal(row.activeIntroducedFailure, false);
});

test("a translucent base with no assumed backdrop is an error, not a silent skip", () => {
  const fixture = {
    light: {
      "--fg": { $value: "rgb(0 0 0)" },
      "--base": { $value: "rgb(255 255 255 / 0.5)" },
      "--overlay": { $value: "rgb(0 0 0 / 0.1)" },
    },
  };
  assert.throws(
    () =>
      evaluateCombination(makeResolver(fixture), makeChainResolver(fixture), "light", {
        group: "fixture",
        family: "fixture",
        baseToken: "--base",
        activeToken: "--overlay",
        foregroundToken: "--fg",
      }),
    /no assumed backdrop/
  );
});

test("summary totals are internally consistent", () => {
  const summary = summarizeActiveMatrix(rows);
  assert.equal(summary.total, rows.length);
  assert.equal(summary.passing + summary.failing, summary.total);
  assert.equal(summary.introducedByActive + summary.baseAlreadyFailed, summary.failing);
});

// ---------------------------------------------------------------------------
// Gate 2 review outcomes (issue #130). These lock in the threshold
// determinations and the root-cause split, so a later palette retune cannot
// quietly regress them.
// ---------------------------------------------------------------------------

test("safety score is measured against its confirmed 3:1 restriction", () => {
  const safety = rows.filter((row) => row.family === "safety-score.interaction.active");
  assert.equal(safety.length, 6);
  for (const row of safety) {
    assert.equal(row.threshold, WCAG_LARGE_TEXT);
    assert.equal(row.thresholdConfirmed, true);
    assert.match(row.thresholdBasis, /large text/);
  }
  // Every tier clears 3:1 both at rest and after the overlay. Dark `good` rests
  // at 3.56:1 — below 4.5 but above its actual threshold, so not a defect.
  for (const row of safety) {
    assert.ok(row.contrastBefore >= WCAG_LARGE_TEXT, `${row.baseToken} fails 3:1 at rest`);
    assert.ok(row.pass, `${row.baseToken} fails 3:1 after the overlay`);
  }
  const darkGood = safety.find(
    (row) => row.theme === "dark" && row.baseToken === "--color-safety-score-background-good"
  );
  assert.ok(darkGood.contrastBefore < WCAG_AA_NORMAL);
});

test("nothing in scope fails at rest", () => {
  // Every audited surface clears its threshold with no overlay applied, so every
  // failure in the matrix is overlay-induced. If this breaks, a base or
  // foreground pairing regressed and no overlay change will fix it.
  const restFailures = rows.filter((row) => row.contrastBefore < row.threshold);
  assert.deepEqual(
    restFailures.map((row) => `${row.theme} ${row.baseToken}`),
    [],
    "a surface fails before any overlay is applied"
  );
});

test("every failure is attributed to the overlay", () => {
  const summary = summarizeActiveMatrix(rows);
  assert.equal(summary.baseAlreadyFailed, 0);
  assert.equal(summary.introducedByActive, summary.failing);
});

test("literal color-intent selected state is restricted to 3:1 and clears it", () => {
  const literal = rows.filter((row) => row.baseToken.startsWith("--color-color-intent-"));
  assert.equal(literal.length, 96);
  for (const row of literal) {
    assert.equal(row.threshold, WCAG_LARGE_TEXT);
    assert.equal(row.thresholdConfirmed, true);
    assert.match(row.thresholdBasis, /large text/);
    assert.ok(row.pass, `${row.baseToken} (${row.theme}) fails 3:1 at ${row.contrastAfter}`);
  }
  // The restriction is what the decision bought, so record what it gave up: at
  // normal-text 4.5:1 most of these combinations do not clear.
  const wouldFailAtNormalText = literal.filter((row) => row.contrastAfter < WCAG_AA_NORMAL);
  assert.ok(
    wouldFailAtNormalText.length > 60,
    `expected the restriction to be load-bearing, only ${wouldFailAtNormalText.length} rows need it`
  );
  // And that the restriction applies to the SELECTED state only — these surfaces
  // still clear normal text at rest.
  for (const row of literal) {
    assert.ok(
      row.contrastBefore >= WCAG_AA_NORMAL,
      `${row.baseToken} (${row.theme}) fails normal text at rest, which the restriction does not cover`
    );
  }
});

test("every in-scope selected-state combination clears its threshold", () => {
  // The contract, end to end. If this breaks, something regressed.
  const failures = rows.filter((row) => !row.pass);
  assert.deepEqual(
    failures.map(
      (row) => `${row.theme} ${row.baseToken} ${row.contrastAfter.toFixed(2)} < ${row.threshold}`
    ),
    []
  );
});

test("no family is measured against an assumed threshold", () => {
  // Every restriction in play is a recorded decision. An unconfirmed threshold
  // means a family is being scored against a guess.
  const unconfirmed = rows.filter((row) => !row.thresholdConfirmed);
  assert.deepEqual([...new Set(unconfirmed.map((row) => row.family))], []);
});

test("families restricted to 3:1 are the ones documented as restricted", () => {
  // Guard against the restriction quietly spreading to families that should be
  // held to normal text.
  const RESTRICTED = ["safety-score.interaction.active"];
  const restrictedPrefixes = ["color-intent.interaction.on-", "driver-status.interaction.on-"];
  for (const row of rows) {
    if (row.threshold !== WCAG_LARGE_TEXT) continue;
    const ok =
      RESTRICTED.includes(row.family) ||
      restrictedPrefixes.some((prefix) => row.family.startsWith(prefix));
    assert.ok(ok, `${row.family} is scored at 3:1 but is not a documented restriction`);
  }
});

// Regression anchors. These pin the compositing method against the shipped
// overlay values, not the token values themselves — they are expected to move
// whenever the overlay alphas or the palette are retuned, and updating them is
// part of that change. Values below reflect the retune that dropped every
// selected overlay to 5%.
test("reproduces the shipped selected-state figures", () => {
  const find = (theme, base, active) =>
    rows.find(
      (row) => row.theme === theme && row.baseToken === base && row.activeToken === active
    );
  const round = (n) => Number(n.toFixed(2));

  // The three core-semantic rows that the 10% overlay used to break. Pinned
  // because they were the tightest in the family and are the first to regress if
  // the overlay alpha is raised again.
  assert.equal(
    round(
      find(
        "dark",
        "--color-background-medium-walkthrough",
        "--color-interaction-on-medium-background-active"
      ).contrastAfter
    ),
    4.91
  );
  assert.equal(
    round(
      find(
        "light",
        "--color-background-bold-guide",
        "--color-interaction-on-bold-background-active"
      ).contrastAfter
    ),
    4.88
  );
  assert.equal(
    round(
      find(
        "light",
        "--color-background-bold-walkthrough",
        "--color-interaction-on-bold-background-active"
      ).contrastAfter
    ),
    4.91
  );
});

test("every main interaction family clears its threshold", () => {
  // "Main" is everything outside the two families still under review: literal
  // color-intent and driver status. This is the contract to protect — if it
  // breaks, a shipped interaction surface regressed.
  const main = rows.filter(
    (row) =>
      !row.family.startsWith("driver-status") &&
      !row.baseToken.startsWith("--color-color-intent-")
  );
  assert.equal(main.length, 98);
  const failures = main.filter((row) => !row.pass);
  assert.deepEqual(
    failures.map((row) => `${row.theme} ${row.baseToken} ${row.contrastAfter.toFixed(2)}`),
    []
  );
});
