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
2. `background.strong.*` with `foreground.on-strong-background.secondary`: about $6.54{:}1$ in light and $5.28{:}1$ in dark,
3. `background.bold.*` with `foreground.on-bold-background.secondary`: about $5.45{:}1$ in light and $4.89{:}1$ in dark.

If you are choosing text colors for standard surfaces or strong semantic fills, start with these pairings before considering more custom tone mixing.

### 7.2 Using Tone Pairs Directly

The core semantic tones can also be used more directly when you intentionally want to compose the system from tone relationships rather than from the dedicated on-background tokens.

The strongest current rule is:

1. `background.bold.*` with `foreground.faint.*`,
2. `background.faint.*` with `foreground.bold.*`.

Across the current exported semantic intents in both light and dark themes, those reciprocal bold/faint pairings stay above the AA $4.5{:}1$ threshold. The lowest verified floor is about $4.54{:}1$.

`background.strong.*` with `foreground.medium.*`, and the reverse pairing of `background.medium.*` with `foreground.strong.*`, are also designed toward the same AA relationship and most current semantic pairings do pass. However, the exported semantic set is not uniformly above $4.5{:}1$ in every intent today. The lowest verified current case is the `guide` pairing in dark mode at about $4.46{:}1$.

That means:

1. bold/faint reciprocal tone pairings are safe to describe as AA pairings in the current exported system,
2. strong/medium reciprocal tone pairings should be treated as near-AA design pairings, not as a blanket guarantee for every semantic intent,
3. if you need guaranteed accessible text on strong or bold fills, prefer the dedicated `foreground.on-*` tokens.

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
7. changing token meaning across screens without a strong product reason.

## 10. Maintenance Rule

If semantic or data usage needs a new token:

1. first confirm the need cannot be solved by an existing semantic or data token,
2. add or update the semantic or data alias rather than shipping a one-off raw color,
3. keep the alias relationship to the reference palette intact,
4. update this guide if the usage pattern becomes standard.
