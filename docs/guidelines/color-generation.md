# Color Generation Guidelines

## 1. Objective

This document explains how the core color should be understood and maintained in this repository. It adapts the working color-generation specification to the token structure that exists here:

1. reference colors live in `tokens/colors/reference/hex.tokens.json`,
2. data and semantic colors consume those reference colors by alias,
3. the exported token JSON files are the shipped source of truth.

If this document and the token JSON files ever disagree, the token JSON files win until this document is updated.

## 2. Canonical Files

The repository-level color is defined by these files:

1. `tokens/colors/reference/hex.tokens.json`
2. `tokens/colors/data/light.tokens.json`
3. `tokens/colors/data/dark.tokens.json`
4. `tokens/colors/semantic/light.tokens.json`
5. `tokens/colors/semantic/dark.tokens.json`
6. `tools/color-system/oklch-utils.js`
7. `tools/color-system/run-color-generation-workflow.js`

This repository stores exported token artifacts and now also includes a repo-local reference workflow for palette working files. If external scripts are still used outside this repository, record their exact usage in the same PR that changes the palette.

## 3. Token Topology

### 3.1 System Layers

The repository uses a layered color model:

1. reference tokens define the base palette,
2. data tokens alias selected reference colors for visualization use cases,
3. semantic tokens alias selected reference colors for UI meaning and component usage.

Generation rules in this document apply primarily to the reference layer. Data and semantic layers should consume reference tokens rather than inventing parallel raw hex values unless there is an explicit exception.

### 3.2 Reference File Shape

The top-level structure of `tokens/colors/reference/hex.tokens.json` is:

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

1. `light/blue-250/L33-C09-strong`
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

1. `background.strong.brand -> light/blue-250/L33-C09-strong`
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

The shipped tokens in this repository are exported as sRGB color values with hex output. Generation work may use OKLCH as the working model for lightness and chroma decisions, but the final repository artifacts must remain valid exported tokens in the current JSON format.

### 4.3 Overlay And Opacity Analysis

For separate opacity-threshold reporting, use sRGB alpha compositing before luminance conversion and WCAG contrast evaluation. This matches common design and web-tool behavior.

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

### 6.4 Grey Neutrality

Grey is not a chromatic family. Preserve it as a neutral ladder.

When grey is retuned:

1. do not introduce hue drift,
2. preserve the existing role of light and dark tone anchors,
3. validate that downstream semantic and data aliases still behave as neutral colors.

## 7. Candidate Selection Logic

The working specification includes faint and bold solver behavior. That logic is now captured in the consolidated workflow utility at `tools/color-system/run-color-generation-workflow.js`.

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
8. downstream semantic and data usage still matches the intended reference tone semantics.

## 10. Practical Workflow In This Repository

When working on core colors here:

1. treat `tokens/colors/reference/hex.tokens.json` as the base palette artifact,
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
node tools/color-system/run-color-generation-workflow.js path/to/config.json
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
