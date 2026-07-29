# Color Usage Guidelines

## 1. Objective

This document explains how to use color tokens in product code and design implementation.

The key distinction is:

1. semantic colors are for UI meaning, hierarchy, and component states,
2. data colors are for charts, graphs, and other visualization marks,
3. both layers are aliases on top of the reference palette.

If a choice is available between semantic and data tokens, default to semantic for interface chrome and default to data for visualization marks.

Semantic and data tokens should continue to alias reference tokens rather than introducing disconnected raw values.

## 2. Quick Decision Rule

Use this rule first:

1. use semantic colors when the color communicates UI role,
2. use data colors when the color differentiates or encodes data,
3. use reference colors only when working on the token system itself.

Examples:

1. page background, card text, button hover, error banner: semantic
2. bar series, line series, pie slices, heatmap steps: data
3. palette generation or alias maintenance: reference

## 3. Semantic Colors

### 3.1 What Semantic Means

Semantic tokens are named by purpose, not by visual appearance. They should be chosen based on what the UI element is doing, not based on whether a blue, red, or grey value looks convenient.

For example:

1. `background.primary` means the main surface,
2. `foreground.secondary` means lower-emphasis content,
3. `background.strong.negative` means a strong negative-intent surface,
4. `interaction.hover` means an interaction overlay,
5. `foreground.on-strong-background.primary` means primary content placed on a strong colored background.

### 3.2 When To Use Semantic Colors

Use semantic tokens for:

1. application and component surfaces,
2. text and icon hierarchy,
3. borders and strokes when they convey UI structure,
4. status styling such as brand, positive, warning, and negative,
5. hover and pressed overlays,
6. special product-domain markers that are part of the product language.

Do not use semantic tokens to color arbitrary chart series just because a semantic hue looks nice.

A foundational semantic layer should keep its first-class intent set small and durable.

In practice, intents should represent long-lived UI meaning rather than short-lived product categorization. Product-specific concepts should only become first-class semantic intents when they are expected to recur broadly and remain stable over time.

### 3.3 Common Semantic Families

The semantic files are organized around usage families.

#### Background

Use background tokens for surfaces and fills.

1. `background.primary` and `background.secondary` are standard UI surfaces,
2. `background.strong.*`, `background.bold.*`, `background.medium.*`, and `background.faint.*` express emphasis and intent,
3. `background.translucent`, `background.shade`, and `background.transparent` are utility surface values.

Typical mapping:

1. nested card or panel surface: `background.primary`
2. app shell or secondary panel: `background.secondary`
3. bold status banner: `background.bold.negative`
4. subtle info container: `background.faint.neutral`

#### Foreground

Use foreground tokens for text, icons, and strokes that follow content hierarchy.

1. `foreground.primary` is the highest-emphasis content,
2. `foreground.secondary` through `foreground.quaternary` reduce emphasis,
3. `foreground.strong.*`, `foreground.bold.*`, `foreground.medium.*`, and `foreground.faint.*` provide colored content roles,
4. `foreground.on-strong-background.*` is for content placed on strong colored surfaces.

Typical mapping:

1. main body text: `foreground.primary`
2. helper text or secondary icon: `foreground.secondary`
3. inactive or intentionally de-emphasized content: `foreground.tertiary`
4. disabled or very low-emphasis ornament: lower-emphasis foreground token such as `foreground.quaternary`
5. text on a bold brand or status fill: `foreground.on-bold-background.primary`

`foreground.tertiary` is primarily a low-emphasis UI color. A common use is to show that an element is inactive, secondary to the current task, or intentionally not meant to attract attention yet.

It can also be used to soften emphasis on screen more generally, but it should not be treated as a default text color for normal body copy. On the current primary surface, `foreground.tertiary` is only about $3.35{:}1$ in light mode and $3.23{:}1$ in dark mode after alpha compositing, so it does not meet AA for standard text sizes.

#### Interaction

Use interaction tokens for overlays caused by state changes, not for base surfaces or replacement fills.

1. `interaction.hover` and `interaction.pressed` are for standard surfaces,
2. `interaction.on-strong-background.hover` and `interaction.on-strong-background.pressed` are for colored fills,
3. paired interaction tokens preserve visible state change without breaking contrast.

Interaction tokens should preserve the underlying semantic meaning of the surface they sit on. They are state overlays, not an alternate surface-color system.

#### Elevation, Border, and Divider

Use elevation, border, and divider semantic tokens for depth treatments and structural chrome that should visually belong to the surface layer rather than to a semantic status or intent family.

1. `elevation.shadow` and `elevation.highlight` support surface depth and edge-light treatments,
2. `border.primary`, `border.secondary`, and `border.tertiary` are the default border colors for container edges, field outlines, card strokes, and similar chrome,
3. `divider.divider` is for internal rules that separate content inside a surface,
4. `divider.on-strong-background`, `divider.on-bold-background`, `divider.on-medium-background`, and `divider.on-translucent-background` are divider variants for those fills.

Border tokens should be treated as surface-adjacent colors. They are the right choice when the stroke should feel like part of the container or surface itself.

The three neutral steps are tuned for different jobs, and the difference is a contrast decision rather than a taste one:

1. `border.tertiary` is decorative chrome: container edges and other structure on a surface that is already distinguishable without the stroke,
2. `border.secondary` is the default for controls that contain their own identifying content, such as a text field with a label or placeholder inside it,
3. `border.primary` is reserved for small non-text controls where the stroke itself is the only thing identifying the control, such as an unchecked checkbox, a radio ring, or a toggle track.

Do not reach for `border.primary` simply because a stroke should look stronger. It is the only neutral step that clears the $3{:}1$ non-text contrast threshold, so spending it on ordinary chrome removes the one option available when a control genuinely needs it. See Section 7.4 for the measured values and the reasoning.

`border.tertiary` is the lowest-emphasis border option. It is best for subtle container hints, inactive outlines, and other edges that should be visible but not prominent. In practice it is intentionally very dim, so it should not be used when the border itself needs to carry strong affordance or attention.

Divider tokens are narrower in purpose. Use them only when drawing a horizontal or vertical rule inside a surface to create separation between elements or blocks of information. Do not treat divider tokens as the default border color for every component edge.

#### Always-Dark

Use `always-dark.*` only when the component must stay dark regardless of surrounding theme.

This is a special-case family for fixed dark contexts. It should not replace normal theme-aware semantic tokens for standard application surfaces.

More generally, fixed-context themes and subthemes should be treated as rare exceptions.

Introduce them only when a region must remain visually distinct from the surrounding theme or must preserve a deliberately fixed visual environment. They should not become a general escape hatch from the main semantic theme system.

### 3.4 Semantic Tone Selection

When multiple semantic intensities exist, choose the one that matches the amount of emphasis required.

1. `strong` is for highest-emphasis fills or content,
2. `bold` is strong but less dominant than `strong`,
3. `medium` is mid-emphasis,
4. `faint` is low-emphasis tinting or supporting treatment.

In practice:

1. status chip with urgency: `background.bold.negative`
2. subtle contextual surface: `background.faint.positive`
3. colored text over faint surface: `foreground.bold.brand`

When a surface uses a strong semantic background, pair it with the matching on-background content token rather than reusing normal foreground tokens.

## 4. Data Colors

### 4.1 What Data Means

Data tokens are for visualization encoding. They help users distinguish series, categories, ranges, and outcomes inside charts and maps.

Data tokens are not general UI colors. They should usually appear inside the visualization itself, while surrounding labels, panels, controls, and layout surfaces remain semantic.

### 4.2 When To Use Data Colors

Use data tokens for:

1. chart series colors,
2. legend keys,
3. map overlays and plotted markers used as data marks,
4. heatmaps and gradients tied to values,
5. ordered or diverging color ramps.

Do not use data tokens for:

1. page backgrounds,
2. standard text hierarchy,
3. button states,
4. banners, alerts, or form validation chrome.

### 4.3 Common Data Families

The data files already expose several palette shapes.

#### `data-misc`

Use `data-misc` for neutral visualization elements.

Typical uses:

1. gridlines,
2. reference lines,
3. axes or low-emphasis data-supporting marks,
4. neutral legend items.

#### `data-category`

Use `data-category` for nominal categories where each series is different but unordered.

Typical uses:

1. multi-series bar charts,
2. pie or donut slices,
3. legend palettes for distinct segments,
4. map layers representing different classes.

When `data-category` colors are used together in the same visualization, their numeric order matters.

Treat the category palette as an ordered assignment sequence:

1. if you need four category colors, start with `data-category.1`, `data-category.2`, `data-category.3`, and `data-category.4`,
2. if you need six, continue with `data-category.5` and `data-category.6`,
3. avoid cherry-picking random category numbers unless there is a specific reason to do so.

This is especially important when categories appear directly next to each other, such as in donut charts, pie charts, stacked bars, stacked areas, or any visualization where one colored segment touches another. In those cases, the palette order is part of the intended visual system, and using the colors sequentially gives a more consistent and predictable result than selecting arbitrary category tokens.

#### `data-win-loss`

Use `data-win-loss` when the data communicates an outcome polarity or small fixed outcome set.

Typical uses:

1. positive versus negative outcomes,
2. pass versus fail,
3. win versus loss,
4. binary result comparisons.

#### `data-sequence-*`

Use sequential families such as `data-sequence-blue` when values move in one direction from low to high within the same hue family.

Typical uses:

1. ordered buckets,
2. intensity ramps,
3. single-metric choropleths,
4. progressive emphasis inside one category.

#### `data-diverging-*`

Use diverging families when the data has a meaningful midpoint and values extend in two directions away from that center.

Typical uses:

1. above versus below target,
2. negative to positive change,
3. deviation from baseline,
4. symmetric distribution around zero.

### 4.4 Data Selection Rules

When assigning data colors:

1. keep the same token mapped to the same meaning across views when possible,
2. prefer a whole family instead of mixing unrelated tokens from different families,
3. use sequential ramps only for ordered values,
4. use diverging ramps only when a real midpoint exists,
5. use `data-category` tokens in numeric order when assigning multiple category colors in the same chart,
6. avoid reusing status semantics unless the chart is explicitly encoding status.

For example, if a chart has five unrelated categories, start with `data-category.*` rather than pulling colors from semantic brand, warning, and negative roles.

If those five categories are displayed side by side or touch each other visually, use `data-category.1` through `data-category.5` rather than selecting a random subset like `2`, `5`, `8`, and `11`.

## 5. How Semantic And Data Colors Work Together

Most product screens need both layers.

A good rule is:

1. semantic colors define the visualization container,
2. data colors define the marks inside the visualization,
3. semantic colors define labels, axes text, controls, and surrounding UI.

Example split:

1. chart card background: `background.primary`
2. chart title: `foreground.primary`
3. chart subtitle or axis labels: `foreground.secondary`
4. chart gridlines: `data-misc.*` when treated as visualization marks, or low-emphasis semantic foreground/stroke when treated as UI chrome
5. chart bars or lines: `data-category.*`, `data-sequence-*`, or `data-diverging-*`
6. alert banner around the chart: semantic status token such as `background.faint.warning`

## 6. Theme Behavior

Both semantic and data colors ship in light and dark modes and should be consumed from the matching theme file.

This means:

1. do not hardcode light-token values into dark mode,
2. do not assume a token keeps the same hex value across themes,
3. do preserve the same semantic or data token name across themes so meaning stays stable,
4. do rely on the exported theme-specific files to resolve the right alias.

The token name should stay stable while the underlying reference alias may change to preserve contrast and visual balance.

## 7. Accessibility And Pairing

### 7.1 Preferred Text Pairings

For text, labels, supporting typography, and most icon usage, prefer the explicit foreground/background pairs the system defines for you.

The default combinations are:

1. `background.primary` with `foreground.primary` or `foreground.secondary`,
2. `background.strong.*` with `foreground.on-strong-background.primary` or `foreground.on-strong-background.secondary`,
3. `background.bold.*` with `foreground.on-bold-background.primary` or `foreground.on-bold-background.secondary`.

These are the safest defaults because they encode the intended contrast relationship directly into the token system. They are the right choice for most text-first UI work.

Current exported tokens verify that all of those primary and secondary pairings clear the AA $4.5{:}1$ threshold in both themes. The lowest verified floors are:

1. `background.primary` with `foreground.secondary`: about $5.74{:}1$ in light and $6.13{:}1$ in dark,
2. `background.strong.*` with `foreground.on-strong-background.secondary`: about $4.96{:}1$ in light (`caution`) and $5.21{:}1$ in dark (`negative`),
3. `background.bold.*` with `foreground.on-bold-background.secondary`: about $5.38{:}1$ in light and $4.81{:}1$ in dark (`neutral` in both).

If you are choosing text colors for standard surfaces or strong semantic fills, start with these pairings before considering more custom tone mixing.

All figures in this section are generated by `npm run report:contrast`, which measures the shipped tokens in `dist/` after alpha compositing and reports both WCAG ratios and APCA `Lc`. Regenerate it rather than editing these numbers by hand, and treat a mismatch as a signal that the palette moved.

### 7.2 Using Tone Pairs Directly

The core semantic tones can also be used more directly when you intentionally want to compose the system from tone relationships rather than from the dedicated on-background tokens.

The strongest current rule is:

1. `background.bold.*` with `foreground.faint.*`,
2. `background.faint.*` with `foreground.bold.*`.

Across the current exported semantic intents in both light and dark themes, those reciprocal bold/faint pairings stay above the AA $4.5{:}1$ threshold. The lowest verified floor is about $4.72{:}1$ in light and $4.54{:}1$ in dark (`ai`).

`background.strong.*` with `foreground.medium.*`, and the reverse pairing of `background.medium.*` with `foreground.strong.*`, are designed toward the same AA relationship. As of the blue and cyan retune in `81748c3`, every exported intent now clears $4.5{:}1$ in both themes, with the lowest case at about $4.68{:}1$ in light and $4.53{:}1$ in dark (`brand`). Earlier revisions of this system had a sub-AA case in `guide`, which that retune resolved.

That margin is thin, however, so treat it as a measured current state rather than a structural guarantee.

That means:

1. bold/faint reciprocal tone pairings are safe to describe as AA pairings in the current exported system,
2. strong/medium reciprocal tone pairings currently pass in every intent, but with under $0.1$ of headroom in the tightest case, so a palette change can regress them and `npm run report:contrast` should be run whenever the reference tones move,
3. if you need guaranteed accessible text on strong or bold fills, prefer the dedicated `foreground.on-*` tokens.

Note also that clearing WCAG AA does not mean these pairs are strong by APCA. Several tone pairings sit well below the APCA body-text floor of $\lvert Lc\rvert \ge 75$ even while passing $4.5{:}1$ — `foreground.medium.brand` on `background.strong.brand` measures about $Lc\ 43.6$ in light, for example. APCA is diagnostic only and gates nothing here (see `color-generation.md` Section 4.5), but it is a useful signal that the reciprocal tone pairings are better suited to chips, tinted labels, and short non-body text than to sustained reading.

These direct tone relationships are still useful. They let you build chips, highlights, tinted labels, and other treatments from the core semantic tones alone, but they should be used deliberately rather than as a replacement for the explicit text pairings above.

### 7.3 Low-Emphasis Tokens

Some semantic tokens are intentionally tuned below normal body-text contrast because their purpose is de-emphasis, not primary readability.

The most important examples are:

1. `foreground.tertiary`, which is suited to inactive or low-emphasis UI content,
2. `border.tertiary`, which is suited to very soft edges and inactive outlines.

Current exported values confirm that these tokens are visually subdued:

1. `foreground.tertiary` on `background.primary` is about $3.35{:}1$ in light and $3.23{:}1$ in dark,
2. `border.tertiary` against `background.primary` is about $1.25{:}1$ in light and $1.32{:}1$ in dark.

That means:

1. `foreground.tertiary` should not be used for normal-size body text when AA text contrast is required,
2. `border.tertiary` should be understood as a dim structural hint, not as a prominent border,
3. if the user needs clearer readability or stronger affordance, move up to a higher-emphasis foreground or border token.

There is an important distinction between these two. `foreground.tertiary` clears $3{:}1$, so it remains usable for large text and for icons — it is de-emphasised, not unreadable. `border.tertiary` and the whole `quaternary` step sit below $3{:}1$ and cannot carry content at all. Section 7.5 lists every content pairing below that floor, including the cases where a token intended to be readable does not clear it.

### 7.4 Stroke Contrast

Strokes are not text, so the threshold that applies to them is WCAG 1.4.11 Non-text Contrast at $3{:}1$, not the $4.5{:}1$ text threshold.

That threshold is conditional. It applies when the stroke is what identifies a control or its state, such as a text field outline, a checkbox edge, a radio ring, or a focus indicator. It does not apply to decoration, to a divider between blocks of content, or to a container edge on a surface that is already distinguishable by fill.

#### The neutral stroke ladder

The three neutral steps are aligned to the foreground de-emphasis ladder: `border.primary` carries the same value as `foreground.tertiary`, and `border.secondary` the same value as `foreground.quaternary`. `border.tertiary` is unchanged and remains the lightest step.

Measured against every surface they can legitimately sit on, including all nine faint intent surfaces:

| Token | Light | Dark | Clears $3{:}1$ |
| --- | --- | --- | --- |
| `border.primary` | $3.22$–$3.35{:}1$ | $3.04$–$3.23{:}1$ | yes |
| `border.secondary` | $1.59$–$1.61{:}1$ | $1.84$–$1.92{:}1$ | no |
| `border.tertiary` | $1.25{:}1$ | $1.30$–$1.37{:}1$ | no |
| `divider.divider` | $1.25{:}1$ | $1.30$–$1.37{:}1$ | no |

Two things follow.

First, `border.primary` is the only neutral step that clears $3{:}1$, and it does so on every surface in both themes. That is what makes it the correct choice for a small non-text control whose stroke is its only identifier.

Second, the surface barely matters. These are alpha values over near-white or near-black surfaces, so `border.secondary` lands within $0.02$ of itself across `background.primary`, `background.secondary`, and every faint surface in light mode. Choosing a different neutral surface will not rescue a stroke that needs more contrast; only a different token will.

#### Why `border.secondary` is the right default for fields

`border.secondary` sits at about $1.6{:}1$, well under $3{:}1$, and that is deliberate rather than an oversight.

WCAG 1.4.11 applies to visual information *required to identify* a control. A text input carries its own label, placeholder, or value inside it, so the control is identifiable without its outline and the outline is not what conveys "this is a field". The stroke is there to define the editable region, not to announce the component.

That reasoning does not extend to a bare checkbox, radio, or toggle. Those have no internal text, so the stroke is the only thing distinguishing the control from the surface, and $3{:}1$ does bind. Use `border.primary` there.

If a field's state must be communicated — invalid, focused, disabled — that state needs its own treatment and cannot lean on the resting stroke. Use a semantic intent stroke plus a non-color cue, per Section 7.6.

#### Intent strokes

On their own faint surface:

1. `border.strong.*` measures about $7.49$–$11.38{:}1$ light and $10.93$–$12.38{:}1$ dark,
2. `border.bold.*` measures about $4.55$–$4.68{:}1$ light and $4.54$–$7.76{:}1$ dark,
3. `border.medium.*` measures about $1.33$–$2.37{:}1$ light and $2.37$–$2.73{:}1$ dark, so it does **not** clear $3{:}1$ and is a tinted edge rather than a control boundary.

For strokes on colored fills, all three on-background families now clear the threshold in every intent and both themes: `border.on-strong-background.primary` at $3.18$–$4.05{:}1$, `border.on-bold-background.primary` at $3.16{:}1$ and above, and `border.on-medium-background.primary` at $3.21$–$4.17{:}1$.

The on-medium family previously missed the threshold in three intents and was retuned for it — see Section 7.5. Because `border.on-medium-background.primary` shares its value with `foreground.on-medium-background.tertiary`, that retune fixed the stroke and the content token together.

The `secondary` and `tertiary` steps of all three on-background families remain well below $3{:}1$ and are decorative.

#### Always-dark sub-theme

`always-dark.border-*` tokens are mode-invariant, but `always-dark.background` is intentionally mode-dependent (`grey-l18` in light, `grey-l20` in dark). That difference is immaterial to contrast:

| Token | Light | Dark | Clears $3{:}1$ |
| --- | --- | --- | --- |
| `always-dark.border-primary` | $3.21{:}1$ | $3.23{:}1$ | yes |
| `always-dark.border-secondary` | $1.84{:}1$ | $1.88{:}1$ | no |
| `always-dark.border-tertiary` | $1.30{:}1$ | $1.32{:}1$ | no |
| `always-dark.divider` | $1.30{:}1$ | $1.32{:}1$ | no |

The mode gap is at most $0.02$, so the mode-dependent background is not a contrast risk. The ladder mirrors the theme-aware one, so the same usage rules apply. The `inverted`, `media`, `navigation`, and `translucent` sub-themes follow the same alignment.

For the always-dark intent strokes, `strong` measures about $13.3$–$15.8{:}1$ and `bold` about $5.6$–$10.0{:}1$, both comfortably clear. `faint` measures $1.20$–$1.29{:}1$ and is decorative only. `medium` sits at about $2.89$–$3.48{:}1$ and straddles the threshold, with `always-dark.border-medium-negative` at $3.00{:}1$ light but $2.89{:}1$ dark, so do not treat the always-dark `medium` strokes as reliably meeting $3{:}1$.

#### Regenerating these figures

`npm run report:contrast` measures all of the above and flags strokes against $3{:}1$ rather than $4.5{:}1$. A flagged row is a prompt to check how the token is used, not an automatic defect, because the threshold only applies to control-identifying strokes. Expect `border.secondary`, `border.tertiary`, `divider.*`, and the `secondary`/`tertiary` on-background steps to be flagged permanently: they are decorative by design.

### 7.5 Content Tokens Below The 3:1 Absolute Floor

$3{:}1$ is the AA minimum for **large** text (24px, or 18.5px bold) and the 1.4.11 minimum for a meaningful icon. A content pairing below $3{:}1$ therefore cannot carry text at any size and cannot carry an icon. It is decorative only.

`npm run report:contrast` measures every foreground token against this floor on the surfaces it can sit on. There are currently **60 pairings below it**: 42 `quaternary` steps, 9 `faint` tones used as content, and 9 `foreground.medium.*` on standard surfaces.

None of the 60 is a defect in a token. The first 51 are steps and tones that are not meant to carry content at all, and the remaining 9 are a correct token used on a surface it was not designed for. The categories below matter more than the count.

Category C separately records four pairings that *were* genuine gaps — a token used exactly as intended and still missing the floor. All four have been fixed. They are kept here because the causes are worth understanding before the next retune.

#### Category A — decorative by design (51 pairings)

**All `quaternary` steps (42).** `foreground.quaternary` on all eleven neutral surfaces ($1.59$–$1.92{:}1$), all three `foreground.on-*-background.quaternary` families on their fills ($1.47$–$1.90{:}1$), and the `always-dark`, `inverted`, `media`, and `navigation` quaternary steps ($1.61$–$1.88{:}1$).

`quaternary` is the bottom of the de-emphasis ladder. It exists for washes, disabled hints, and ornament. **It must never carry text or an icon**, at any size, on any surface. That is a property of the step, not a bug to fix.

**`foreground.faint.*` used as content (9).** On `background.primary` these measure $1.17$–$1.28{:}1$, the lowest values in the entire system. The `faint` tone is a surface tint; using it as a foreground on a standard surface is a misuse of the tone. It is only meaningful as content on a `bold` fill, where Section 7.2 measures it at $4.54{:}1$ or better.

#### Category B — right token, wrong surface (9 pairings)

`foreground.medium.*` on `background.primary`:

| Intent | Light | Dark |
| --- | --- | --- |
| `caution` | $1.64{:}1$ | $3.13{:}1$ |
| `walkthrough` | $1.98{:}1$ | $3.35{:}1$ |
| `guide` | $2.02{:}1$ | $3.24{:}1$ |
| `positive` | $2.06{:}1$ | $3.28{:}1$ |
| `neutral` | $2.23{:}1$ | $3.02{:}1$ |
| `ai` | $2.34{:}1$ | $3.07{:}1$ |
| `warning` | $2.40{:}1$ | $3.03{:}1$ |
| `brand` | $2.71{:}1$ | $3.07{:}1$ |
| `negative` | $2.97{:}1$ | $2.89{:}1$ |

Every intent fails the floor in light mode, and `negative` fails in both.

This is not a defect in the `medium` tone. Section 7.2 pairs `foreground.medium.*` with `background.strong.*`, where it measures $4.53$–$4.71{:}1$ and passes AA. The tone is designed for strong fills, not for standard surfaces.

The problem is that the token name invites the wrong use. `foreground.medium.brand` reads like a general-purpose colored text token, and on a card it silently lands at $2.71{:}1$.

**For colored text on a standard surface, use `foreground.bold.*`** ($5.36$–$6.02{:}1$ light, $5.57$–$9.60{:}1$ dark) or `foreground.strong.*` ($9.26$–$14.26{:}1$ light, $13.32$–$15.19{:}1$ dark). Both clear AA for body text in both themes.

Note that `negative` is the worst case here despite being the intent most likely to carry an urgent message.

#### Category C — genuine gaps, now resolved

Four pairings had a token used exactly as intended and still missing the floor. All four have been retuned.

**`foreground.on-medium-background.tertiary` on `background.medium.*`** missed the floor in three intents: `walkthrough` at $2.96{:}1$ dark, `positive` at $2.97{:}1$ dark, and `negative` at $2.98{:}1$ light. The other six passed at only $3.03$–$3.57{:}1$, so the whole family was marginal rather than just those three.

Retuned to `black/55` in light and `white/65` in dark, giving $3.36$–$4.17{:}1$ light and $3.21$–$3.60{:}1$ dark. Because `border.on-medium-background.primary` shares this value, the same fix resolved the stroke side.

**`navigation.foreground.tertiary` on `navigation.background`** was $3.21{:}1$ light but $2.68{:}1$ dark — the largest shortfall found, with a compounding cause. In dark mode `navigation.background` resolves to `grey-l27-dark-faint`, which is *lighter* than the standard dark surface `grey-l20`, while `navigation.foreground.tertiary` resolved to `white-30`, *dimmer* than the standard `white-35`. The sub-theme moved both sides of the pair in the wrong direction at once.

Retuned to `white/35`, bringing it to parity with the core token rather than giving it a bespoke value. It now measures $3.14{:}1$ dark.

`tertiary` is documented in Section 7.3 as suitable for inactive or low-emphasis UI content, which means it is expected to be readable, so this was the most important of the four to fix.

#### Current state of the two content floors

| Step | Threshold | Pairings | Failing | Lowest |
| --- | --- | --- | --- | --- |
| `*.foreground.tertiary` | $3{:}1$ | 42 | 0 | $3.04{:}1$ |
| `*.foreground.secondary` | $4.5{:}1$ | 42 | 0 | $4.69{:}1$ |

`secondary` is the lowest step expected to carry body text, so it is held to AA $4.5{:}1$ rather than the $3{:}1$ floor. It previously failed in `foreground.on-medium-background.secondary` on `background.medium.walkthrough` ($4.36{:}1$ dark) and `positive` ($4.44{:}1$ dark), with `guide` sitting exactly on the threshold at $4.50{:}1$. Retuned to `white/90` in dark, the family now measures $4.69$–$5.35{:}1$.

One observation worth carrying forward: every failure found across both floors was in `on-medium-background`. Nothing else in the system missed either threshold. A mid-lightness fill compresses contrast from both directions, so `background.medium.*` is the tightest surface family in the system and the one to re-check first whenever the medium tones move.

#### Summary

| Item | Pairings | Status |
| --- | --- | --- |
| `quaternary` steps | 42 | Intentional. Never for content. |
| `foreground.faint.*` as content | 9 | Intentional. Wrong tone for the job. |
| `foreground.medium.*` on standard surfaces | 9 | Usage guidance; the tone itself is correct. |
| `foreground.on-medium-background.tertiary` | 3 | Fixed — `black/55` light, `white/65` dark. |
| `navigation.foreground.tertiary` (dark) | 1 | Fixed — `white/35`, at parity with core. |
| `foreground.on-medium-background.secondary` | 2 | Fixed — `white/90` dark. |

### 7.6 Never Rely On Color Alone

Contrast is necessary but not sufficient. A status that is communicated only by hue is invisible to users with color vision deficiency, and it disappears entirely in forced-colors and monochrome rendering.

So whenever a semantic intent carries meaning, pair it with a redundant non-color cue:

1. positive, warning, negative, and caution states need an icon, a text label, or both, not just a colored fill or colored text,
2. required and invalid form fields need text, not only a colored border,
3. a chart series encoded by `data-category.*` needs a direct label, a legend, or a distinguishing shape or pattern,
4. links inside body copy need an underline or another non-color affordance unless the surrounding context makes the target obvious.

The token layer cannot enforce this, because a token has no knowledge of what sits next to it. Component implementations own it. This guide states the expectation so that a correct token choice is not mistaken for a complete accessibility treatment.

## 8. Implementation Examples

Treat the token path as the stable identifier and generate platform-specific names downstream if needed.

Example semantic usage by token path:

```text
panel.background = background.primary
panel.title = foreground.primary

negative-banner.background = background.strong.negative
negative-banner.content = foreground.on-strong-background.primary

button-on-strong.hover-overlay = interaction.on-strong-background.hover
```

Example data usage by token path:

```text
series-a.stroke = data-category.1
series-b.stroke = data-category.2

gridline.stroke = data-misc.3
heatmap-high.fill = data-sequence-blue.3.2
```

## 9. Anti-Patterns

Avoid these patterns:

1. choosing a token only because the hue looks visually convenient,
2. using semantic status colors as a general-purpose chart palette,
3. using data colors for ordinary UI text or surface hierarchy,
4. mixing reference tokens directly into product code,
5. pairing strong semantic backgrounds with regular foreground tokens instead of on-background tokens,
6. using `divider.*` as a generic border token instead of as an internal rule,
7. changing token meaning across screens without a strong product reason,
8. communicating a status only through color, with no icon, label, or other redundant cue,
9. using `border.primary` for ordinary chrome or container edges because it looks stronger, which spends the only neutral step that clears $3{:}1$ and leaves nothing for controls that need it,
10. relying on `border.secondary` or `border.tertiary` to identify a control that has no internal text or other affordance.

## 10. Maintenance Rule

If semantic or data usage needs a new token:

1. first confirm the need cannot be solved by an existing semantic or data token,
2. add or update the semantic or data alias rather than shipping a one-off raw color,
3. keep the alias relationship to the reference palette intact,
4. update this guide if the usage pattern becomes standard.
