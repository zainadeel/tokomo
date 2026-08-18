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
  summarizeActiveMatrix,
  WCAG_AA_NORMAL,
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

test("every shipped active interaction token is covered by the matrix", () => {
  const audited = [...new Set(combos.map((combo) => combo.activeToken))].sort();
  assert.deepEqual(
    audited,
    shippedActiveTokens,
    "an active overlay token is shipped but not audited (or vice versa)"
  );
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

test("translucent rows are conditional and name their assumed backdrop", () => {
  const translucent = rows.filter((row) => row.baseToken === "--color-translucent-translucent");
  assert.equal(translucent.length, 4);
  for (const row of translucent) {
    assert.equal(row.conditional, true, "translucent must never report an unconditional result");
    assert.equal(row.baseUnderToken, "--color-background-primary");
    assert.match(row.note, /no universal backdrop/i);
  }
  // No non-translucent row should be marked conditional.
  assert.equal(rows.filter((row) => row.conditional).length, translucent.length);
});

test("driver status threshold is reported as unconfirmed pending review", () => {
  const driver = rows.filter((row) => row.family === "driver-status.interaction.active");
  assert.equal(driver.length, 10);
  for (const row of driver) {
    assert.equal(row.thresholdConfirmed, false);
    // Gate 1 must not quietly pick 3:1 for an undocumented family.
    assert.equal(row.threshold, WCAG_AA_NORMAL);
  }
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

// Regression anchors. These are the figures issue #130 reported from the
// directional audit; they pin the compositing method, not the token values, so
// they are expected to change when Gate 3 retunes the overlays.
test("reproduces the figures quoted in issue #130", () => {
  const find = (theme, base, active) =>
    rows.find(
      (row) => row.theme === theme && row.baseToken === base && row.activeToken === active
    );

  const round = (n) => Number(n.toFixed(2));

  // Dark medium walkthrough sits just under the line at white-10.
  assert.equal(
    round(
      find(
        "dark",
        "--color-background-medium-walkthrough",
        "--color-interaction-on-medium-background-active"
      ).contrastAfter
    ),
    4.47
  );

  // Light bold: eight intents fail after white-15, negative is the one that holds.
  const lightBold = (intent) =>
    round(
      find(
        "light",
        `--color-background-bold-${intent}`,
        "--color-interaction-on-bold-background-active"
      ).contrastAfter
    );
  assert.equal(lightBold("guide"), 4.05);
  assert.equal(lightBold("walkthrough"), 4.07);
  assert.equal(lightBold("neutral"), 4.12);
  assert.equal(lightBold("positive"), 4.12);
  assert.equal(lightBold("caution"), 4.22);
  assert.equal(lightBold("warning"), 4.24);
  assert.equal(lightBold("brand"), 4.41);
  assert.equal(lightBold("ai"), 4.43);
  assert.equal(lightBold("negative"), 4.73);
});
