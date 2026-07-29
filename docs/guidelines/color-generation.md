# Color Generation Guidelines

## 1. Objective

This document explains how the core color should be understood and maintained in this repository. It adapts the working color-generation specification to the token structure that exists here:

1. reference colors live in `src/json/colors/reference/color.reference.tokens.json`,
2. data and semantic colors consume those reference colors by alias,
3. the exported token JSON files are the shipped source of truth.

If this document and the token JSON files ever disagree, the token JSON files win until this document is updated.

## 2. Canonical Files

The repository-level color is defined by these files:

1. `src/json/colors/reference/color.reference.tokens.json`
2. `src/json/colors/data/color.data.light.tokens.json`
3. `src/json/colors/data/color.data.dark.tokens.json`
4. `src/json/colors/semantic/color.semantic.light.tokens.json`
5. `src/json/colors/semantic/color.semantic.dark.tokens.json`
6. `tools/color-system/oklch-utils.mjs`
7. `tools/color-system/run-color-generation-workflow.mjs`
8. `tools/color-system/apca.mjs`
9. `scripts/report-contrast.mjs`

This repository stores exported token artifacts and now also includes a repo-local reference workflow for palette working files. If external scripts are still used outside this repository, record their exact usage in the same PR that changes the palette.

## 3. Token Topology

### 3.1 System Layers

The repository uses a layered color model:

1. reference tokens define the base palette,
2. data tokens alias selected reference colors for visualization use cases,
3. semantic tokens alias selected reference colors for UI meaning and component usage.

Generation rules in this document apply primarily to the reference layer. Data and semantic layers should consume reference tokens rather than inventing parallel raw hex values unless there is an explicit exception.

### 3.2 Reference File Shape

The top-level structure of `src/json/colors/reference/color.reference.tokens.json` is:

1. `black`
2. `white`
3. `grey`
4. `light`
5. `dark`

These groups have different roles:

1. `black` and `white` are opacity scales,
2. `grey` is the shared neutral ladder,
3. `light` contains chromatic reference hues for light usage,
4. `dark` contains chromatic reference hues for dark usage.

### 3.3 Reference Hue Inventory

The chromatic hue order currently present in both `light` and `dark` is:

1. `blue-250`
2. `purple-290`
3. `magenta-325`
4. `pink-0`
5. `red-30`
6. `orange-60`
7. `yellow-85`
8. `olive-115`
9. `green-145`
10. `teal-180`
11. `cyan-215`

Neutral grey is stored separately as its own ladder rather than repeating under `light` and `dark`.

### 3.4 Tone Model

Each chromatic hue has four tones per theme:

1. `strong`
2. `bold`
3. `medium`
4. `faint`

In the exported reference tokens, these tones are encoded into names that also include lightness and chroma, for example:

1. `light/blue-250/L32-C09-strong`
2. `light/blue-250/L50-C18-bold`
3. `light/blue-250/L70-C18-medium`
4. `light/blue-250/L92-C04-faint`

Grey follows the same conceptual tone model, but its tokens are stored as individually named neutral steps such as:

1. `grey/L30-light-strong`
2. `grey/L51-light-bold`
3. `grey/L75-light-medium`
4. `grey/L93-light-faint`
5. `grey/L91-dark-strong`
6. `grey/L65-dark-bold`
7. `grey/L50-dark-medium`
8. `grey/L27-dark-faint`

### 3.5 Consumer Token Mapping

Data and semantic tokens should map back to the reference layer through Figma alias metadata. Current files already follow this pattern. Representative examples are:

1. `background.strong.brand -> light/blue-250/L32-C09-strong`
2. `background.strong.negative -> light/red-30/L30-C11-strong`
3. `data-misc.2 -> grey/L51-light-bold`

That mapping is part of the system design. When the reference palette changes, downstream aliases must continue to resolve cleanly.

## 4. Mathematical Model

### 4.1 Contrast Formula

Use WCAG 2.x contrast ratio on relative luminance $Y$:

$$
C(Y_1,Y_2)=\frac{\max(Y_1,Y_2)+0.05}{\min(Y_1,Y_2)+0.05}
$$

### 4.2 Working Color Space

OKLCH is the working model **and** the shipped output for the chromatic reference layer. Token names are not labels — they are the specification:

1. `scripts/generate-color-tokens.mjs` parses `L<lightness>-C<chroma>` out of each reference token name and takes the hue angle from the family suffix (`blue-250` → 250).
2. It emits that as a CSS `oklch()` value — `light/blue-250/L32-C09-strong` becomes `--color-reference-light-blue-250-l32-c09-strong: oklch(32% 0.09 250)`.
3. The `hex` and `components` fields in the reference JSON are **Figma-mirror metadata**. They are not the shipped value for chromatic families, so renaming a token changes the shipped color even if the hex is left untouched.

Because the name drives the output, a reference token's name and its stored hex must agree. See Section 9 for the parity rule.

There is one caveat on that agreement. `oklchToHex` in `tools/color-system/oklch-utils.mjs` converts by clipping each sRGB channel independently, which shifts hue for any color outside sRGB. For colors inside sRGB the mirrored hex and the shipped `oklch()` describe the same color. For colors outside it, they do not, and the `oklch()` is authoritative. This is acceptable because the hex is Figma-mirror metadata rather than a shipped value, but it means exact hex parity can only be required for in-gamut colors.

sRGB hex is still the shipped form where a name carries no OKLCH spec:

1. the `black` and `white` opacity scales,
2. semantic and data tokens that do not alias a reference token (these emit `var(--color-reference-…)` when they do alias one).

Generation work may reason in OKLCH freely, but final artifacts must remain valid exported tokens in the current JSON format.

### 4.3 Overlay And Opacity Analysis

For separate opacity-threshold reporting, use sRGB alpha compositing before luminance conversion and WCAG contrast evaluation. This matches common design and web-tool behavior.

### 4.4 Gamut And Browser Support Strategy

The palette is authored inside **Display P3** and ships a single unqualified `oklch()` value per chromatic token. There is no `@media (color-gamut: p3)` tier and no second sRGB value, and that is deliberate.

The reasoning is:

1. `clampP3Chroma` in the workflow fits every chromatic tone to P3 using `fitOklchToP3Gamut`, so authored values are inside P3 by construction,
2. when a browser renders an `oklch()` value the display cannot show, CSS Color 4 requires it to gamut-map by reducing chroma at constant lightness and hue rather than clipping channels,
3. so one authored value renders at full chroma on a P3 display and degrades perceptually on an sRGB display, with no duplicate declarations to keep in sync.

This means P3-capable displays get the intended color and sRGB displays get a hue-stable and lightness-stable approximation of it. Note that this browser-side behavior is better than the naive per-channel clipping used for the Figma hex mirror described in Section 4.2; the two are not the same operation and only the browser path affects shipped rendering.

The consequence to accept is the syntax floor. `oklch()` is Baseline 2023, which means Chrome 111, Safari 15.4, and Firefox 113. Below those versions the `--color-reference-*` declarations are invalid, the custom properties go unset, and every semantic and data token that aliases them resolves to nothing rather than to a fallback color. There is currently no `@supports (color: oklch(0 0 0))` hex tier guarding against this.

That floor is an accepted constraint rather than an oversight. If a consumer must support a browser below it, the correct fix is a consumer-side fallback layer or an added `@supports` tier in this repository, and either choice should be recorded here.

How much this strategy is relied on in practice, from `npm run report:contrast`:

1. of 88 chromatic reference tokens, **49 are outside sRGB**. Browser gamut mapping is therefore load-bearing for more than half the palette on an sRGB display, not an edge case,
2. **5 are outside Display P3**, so their authored chroma is not reachable on any current display:

```text
dark-blue-250-l91-c05-strong
dark-cyan-215-l93-c07-strong
dark-purple-290-l92-c05-strong
light-blue-250-l70-c18-medium
light-teal-180-l35-c09-strong
```

Those five are an accepted state, not a defect to fix. They still render correctly, because the browser reduces their chroma to fit the display, so the only consequence is that the authored value overstates the chroma actually achievable. The likely cause is manual tuning under Section 8 without a subsequent clamp pass.

The decision is to leave them as they are. Correcting them would change shipped color values for no visible benefit, since gamut mapping already produces the same practical result. Two follow-on rules apply:

1. do not "fix" these tokens in isolation,
2. if a future retune touches `blue-250`, `cyan-215`, `purple-290`, or `teal-180`, re-run the `clampP3Chroma` phase so new values land inside P3 by construction.

Treat a rising count here as a signal that manual tuning is drifting away from the clamp phase, not as a release blocker.

### 4.5 APCA As A Secondary Diagnostic

WCAG 2.x contrast ratio remains the shipped accessibility contract for this system. Every hard constraint in Section 6 and every pairing guarantee in `color-usage.md` Section 7 is expressed as a WCAG ratio, and nothing in the build gates on anything else.

APCA is tracked alongside it as a **non-binding** forward-looking signal. WCAG 2.x is known to be lenient on dark backgrounds and harsh in the mid-tones, which is exactly the range the `strong` and `medium` tones occupy, so a second measure is useful for spotting pairs whose ratio looks acceptable but whose perceived readability is weaker.

APCA reports a signed lightness contrast value `Lc`: positive for dark content on a light background, negative for light content on a dark background. Compare magnitudes against these floors:

| Content | Minimum | Preferred |
| --- | --- | --- |
| Body text | 75 | 90 |
| Non-body text | 60 | 75 |
| Large text (at or above 36px) | 45 | 60 |
| UI components | 30 | — |
| Any discernible element | 15 | — |

To score the current exported tokens against both measures:

```bash
npm run build
npm run report:contrast
```

That writes `reports/contrast.md`, covering every pairing documented in `color-usage.md` Section 7 in both themes, with the WCAG ratio and the APCA `Lc` side by side. The report is regenerable output and is not committed.

Two rules apply to it:

1. a WCAG regression is a blocking problem, because WCAG is the contract,
2. an APCA shortfall is information, not a failure, and should not be "fixed" by changing a token unless a design review agrees the pair is genuinely hard to read.

## 5. Background Anchors

When retuning the reference palette, use these anchor relationships:

1. light faint contrasts against white,
2. dark faint contrasts against `#161616`,
3. light strong contrasts against black,
4. dark strong contrasts against white,
5. bold contrasts against the corresponding faint tone of the same hue and theme,
6. strong and medium are evaluated against each other within the same hue and theme.

## 6. Hard Constraints

### 6.1 Faint

1. Minimum contrast floor: `>= 1.2`
2. Measure light faint against white.
3. Measure dark faint against `#161616`.
4. Non-grey faint chroma should stay restrained, typically at or below `0.05`.
5. Grey faint remains neutral chroma.

### 6.2 Bold

1. Minimum contrast floor versus corresponding faint: `>= 4.5`
2. Measure within the same hue and theme.
3. Non-grey bold chroma should stay restrained, typically at or below `0.20`.
4. Grey bold remains neutral chroma.

### 6.3 Strong And Medium

1. Strong and medium must be `>= 4.5` apart within the same hue and theme.
2. Light strong versus black must be `>= 1.4`.
3. Dark strong versus white must be `>= 1.2`.
4. Dark medium chroma should remain controlled, typically at or below `0.17`.
5. Grey medium remains neutral chroma.

### 6.4 Chroma Caps Are Absolute, And Gamut Headroom Is Not

The chroma caps in 6.1 through 6.3 are absolute numbers applied uniformly across hues. Maximum displayable chroma is not uniform across hues, so those caps do not represent the same amount of headroom for every family.

Measured maximum chroma at $L=0.5$, the lightness band the `bold` tone occupies:

| Hue | sRGB max C | P3 max C |
| --- | --- | --- |
| `cyan-215` | 0.088 | 0.117 |
| `teal-180` | 0.091 | 0.123 |
| `yellow-85` | 0.102 | 0.118 |
| `olive-115` | 0.113 | 0.132 |
| `orange-60` | 0.117 | 0.134 |
| `blue-250` | 0.142 | 0.183 |
| `green-145` | 0.157 | 0.213 |
| `red-30` | 0.200 | 0.224 |
| `pink-0` | 0.203 | 0.228 |
| `magenta-325` | 0.234 | 0.254 |
| `purple-290` | 0.283 | 0.290 |

The spread is more than threefold. The practical consequences are:

1. the `bold` cap of `0.20` is not reachable in P3 for `cyan-215`, `teal-180`, `yellow-85`, `olive-115`, `orange-60`, or `blue-250`, so for those families the gamut boundary is the real constraint and the cap never binds,
2. for `purple-290` the cap binds well inside the gamut, leaving roughly 30 percent of available chroma unused,
3. the currently exported bolds reflect exactly that: `light/blue-250/L50-C18-bold` sits at about 98 percent of its P3 maximum and `light/cyan-215/L51-C11-bold` at about 94 percent, while `light/purple-290/L52-C20-bold` sits at about 69 percent of its own.

So the cool families run at their ceiling and the violet families do not. This is the structural reason the blue and cyan `strong` tones needed retuning in `81748c3`, and it is worth understanding before assuming a future retune has free chroma to spend.

The considered alternative is to express caps as a **percentage of each hue's maximum chroma** at the tone's lightness, which is the usual way to make multi-hue palettes read as equally vivid, since equal absolute chroma does not look equally colorful across hues.

Absolute caps are retained for now because:

1. they are predictable and reviewable, since a cap is a single number rather than a function of hue and lightness,
2. the token names encode chroma directly (`C18`, `C11`) and are the shipped specification per Section 4.2, so a percentage model would still have to resolve to a concrete per-hue number in the name,
3. the gamut fit already prevents a cap from producing an undisplayable color, so the failure mode of an over-generous cap is a color that is less vivid than intended, not a broken one.

If the palette is ever rebuilt for perceptual evenness across hues rather than per-hue tuning, revisit this decision and update Sections 6.1 through 6.3 together with the workflow utility.

### 6.5 Grey Neutrality

Grey is not a chromatic family. Preserve it as a neutral ladder.

When grey is retuned:

1. do not introduce hue drift,
2. preserve the existing role of light and dark tone anchors,
3. validate that downstream semantic and data aliases still behave as neutral colors.

## 7. Candidate Selection Logic

The working specification includes faint and bold solver behavior. That logic is now captured in the consolidated workflow utility at `tools/color-system/run-color-generation-workflow.mjs`.

### 7.1 Faint Solver Guidance

1. Iterate chroma downward from the target cap.
2. Iterate lightness candidates in small steps.
3. Reject out-of-gamut or invalid export candidates.
4. Reject candidates below the required faint contrast floor.
5. Prefer the candidate with the smallest excess above the floor.
6. Break ties by keeping more chroma when possible.

### 7.2 Bold Solver Guidance

1. Enumerate candidates across lightness and chroma.
2. Reject out-of-gamut or invalid export candidates.
3. Reject candidates below `4.5` contrast against the corresponding faint.
4. Prefer higher chroma when constraints are still satisfied.
5. Break ties by minimizing excess above the floor.

These are guidance rules, not a replacement for design review.

## 8. Manual Override Policy

Manual tuning is part of the intended workflow.

1. Lightness and chroma may be adjusted manually.
2. Manual values are acceptable if the hard constraints in Section 6 still hold.
3. If a manually chosen value conflicts with an automated suggestion, keep the manual value unless there is a clear regression.
4. If a consumer token must stop aliasing for a justified reason, document that exception in the PR and update this file if it becomes a pattern.

## 9. Validation Rules

Before accepting a color change in this repository, validate the following:

1. no missing or renamed reference tokens,
2. no broken alias references in data or semantic files,
3. `black` and `white` opacity scales remain structurally intact,
4. grey remains neutral,
5. light and dark hue order remains consistent,
6. each chromatic hue still has strong, bold, medium, and faint coverage,
7. faint, bold, strong, and medium contrast rules still hold,
8. downstream semantic and data usage still matches the intended reference tone semantics,
9. `npm run report:contrast` shows no new WCAG AA failure among the pairings in `color-usage.md` Section 7.

On the name and hex parity rule: a reference token's name and its stored hex must agree for colors inside sRGB. For colors outside sRGB they cannot agree exactly, because the mirrored hex is produced by per-channel clipping while the shipped value is the `oklch()` parsed from the name. In that case treat the name as correct and the hex as an approximation. See Section 4.2.

## 10. Practical Workflow In This Repository

When working on core colors here:

1. treat `src/json/colors/reference/color.reference.tokens.json` as the base palette artifact,
2. check which semantic and data tokens alias the reference values being changed,
3. update exported token files together so the repository stays internally consistent,
4. record any external generation or analysis commands in the PR if they were used,
5. update this document when the generation logic or validation rules change.

For palette working files in CSS form, use the consolidated workflow utility instead of running multiple one-off scripts by hand.

Example config:

```json
{
  "workingFile": "../Color analysis/colors-bold-updated.css",
  "hueOrder": [
    "grey",
    "blue",
    "purple",
    "magenta",
    "pink",
    "red",
    "orange",
    "yellow",
    "olive",
    "green",
    "teal",
    "cyan",
    "indigo"
  ],
  "extraTones": [],
  "toneOrder": ["strong", "bold", "medium", "faint"]
}
```

Run it with:

```bash
node tools/color-system/run-color-generation-workflow.mjs path/to/config.json
```

What the workflow does:

1. retunes core faint and bold tones,
2. optionally applies legacy light-bold-only steps,
3. clamps out-of-gamut chroma,
4. re-annotates faint contrast comments,
5. reorders hues and tones,
6. writes contrast and faint-extremes reports.

Behavior for additional shades:

1. extra tones are preserved and reordered according to `toneOrder`,
2. gamut clamping applies to all tones,
3. reporting still focuses on the four core tones unless the workflow is extended,
4. automatic solving is currently defined only for `strong`, `bold`, `medium`, and `faint` because those are the tones covered by the current specification.

## 11. Non-Goals

This document does not require every color decision to be regenerated automatically on every change.

It exists to capture:

1. the reference palette model,
2. the hard contrast and neutrality rules,
3. the alias relationship from reference tokens to consumer tokens,
4. the expectations for future documentation and review.

## 12. Future Expansion

This file should stay focused on generation logic for the core palette.

If the docs folder expands, keep adjacent files separate by purpose:

1. design dos and don’ts,
2. accessibility guidance,
3. semantic color usage rules,
4. token update workflows,
5. ADR-style decisions for major palette changes.

If additional tone families become first-class system concepts, extend both the workflow utility and this document together so the generation rules, ordering rules, and validation rules stay aligned.
