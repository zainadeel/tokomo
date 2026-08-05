# Typography Usage Guidelines

## 1. Objective

This document explains how typography styles should be used in product UI.

These guidelines apply to both mobile and web. The exact size values differ by platform, but the usage pattern is the same.

### Where text styles live

`@ds-mo/tokens` ships typography **primitives** only — `--typography-fontsize-*`, `--typography-lineheight-*`, `--typography-weight-*`, `--typography-letterspacing-*`, `--typography-paragraphspacing-*`, and `--typography-font-family`.

The **composite text styles** described below are implemented by the `ds-text` component in `@ds-mo/ui`. TokoMo does not ship `.text-*` utility classes; the token browser documents the recipes as a reference spec so the two never drift apart.

In application code, always reach for `ds-text` rather than assembling font tokens by hand:

```html
<ds-text variant="text-body-medium">Normal product copy</ds-text>
<ds-text variant="text-title-small" emphasis as="h2">Section heading</ds-text>
```

## 2. Quick Decision Rule

Use this rule first:

1. start with `body-medium` for normal product copy,
2. use `body-small` when the text is supporting or slightly subdued,
3. use `body-large` when you need a little more hierarchy than normal body copy,
4. use `title-*` styles for actual titles and section headers,
5. use `display-*` styles only for rare, oversized emphasis such as large numeric values.

If you are unsure, start with `body-medium`.

The typography system should stay semantic and limited.

That means the style set should continue to describe durable reading and hierarchy roles rather than expanding into an open-ended list of decorative variations.

## 3. Body Styles

`body-medium` is the default text style for most product copy.

That should be the starting point for:

1. paragraph text,
2. standard labels,
3. most explanatory copy,
4. the majority of text content in the product.

`body-small` is for supporting text that should feel slightly more subdued than the main body.

Typical examples are:

1. helper text,
2. secondary metadata,
3. supporting subtext below primary copy.

`body-large` is for text that should sit a little above normal body copy in the hierarchy without becoming a true title.

Typical examples are:

1. emphasized labels,
2. short introductory lines,
3. lightweight card or section headings when a full title style would feel too strong.

Text hierarchy and color hierarchy should work together.

In practice, de-emphasis usually comes from a combination of text role and foreground role rather than from color alone. Normal reading text should continue to use text styles and foreground colors intended for readability, while intentionally weak foreground colors should be reserved for genuinely low-emphasis supporting content.

## 4. Emphasis

Emphasis is a **boolean modifier available on every size variant**, not a separate set of styles. Each of the nine variants has two recipes: a default (regular) recipe and an emphasis recipe.

```html
<ds-text variant="text-body-medium">Default</ds-text>
<ds-text variant="text-body-medium" emphasis>Emphasized</ds-text>
```

Emphasis is useful when:

1. emphasizing a term inside a paragraph,
2. giving one label more emphasis than another label that uses the same size,
3. increasing emphasis through weight rather than through a size jump.

Visually, emphasis works by stepping the font weight up one level and tightening letter-spacing, which gives the text more ink and helps it draw more attention. Size and line-height never change — only weight and tracking. That means turning emphasis on or off is always safe for layout.

### 4.1 The full matrix

| Variant | Size / line-height | Default weight / tracking | Emphasis weight / tracking |
|---|---|---|---|
| `text-display-medium` | 44 / 56 | semibold · −0.3 | bold · −0.6 |
| `text-display-small` | 32 / 48 | semibold · −0.3 | bold · −0.6 |
| `text-title-large` | 24 / 32 | medium · −0.3 | semibold · −0.6 |
| `text-title-medium` | 18 / 24 | medium · −0.15 | semibold · −0.3 |
| `text-title-small` | 14 / 20 | medium · −0.15 | semibold · −0.3 |
| `text-body-large` | 18 / 24 | regular · −0.15 | medium · −0.3 |
| `text-body-medium` | 14 / 20 | regular · −0.15 | medium · −0.3 |
| `text-body-small` | 12 / 16 | regular · 0 | medium · −0.15 |
| `text-caption` | 9 / 12 | medium · +0.3 | semibold · +0.3 |

Two consequences are worth internalising:

1. **Titles and display styles default to the lighter recipe.** A `title-*` or `display-*` variant without `emphasis` is one weight step below what you may expect. If a heading needs to read at full strength, set `emphasis` explicitly.
2. **Emphasis is not a hierarchy tool.** If a piece of text needs to function as a heading, section label, or clearly higher-level content, move to the appropriate title or display role instead of trying to create hierarchy through emphasis alone.

Emphasis should be used deliberately, not as the default rendering of a style.

## 5. Title Styles

Use `title-*` styles for actual titles.

Typical examples are:

1. card titles,
2. section headers,
3. page section labels,
4. other short text that needs to read clearly as a title rather than as body copy.

If the text is functioning as a title, use a title style rather than trying to force hierarchy by only increasing body size.

## 6. Underline Styles

> **Not a TokoMo concern.** No underline tokens exist in `@ds-mo/tokens`. Underline treatment is handled by the `ds-text` `decoration` prop in `@ds-mo/ui` (`none`, `underline`, `dotted-underline`). The guidance below describes the intended meaning of each treatment.

Underline treatments are intended for body, title, and caption styles when text needs to communicate a specific interactive meaning.

Use a solid underline to indicate that the text is a hyperlink or tappable link.

If the text is already using the brand bold foreground color, that color can already signal link behavior on its own, so a solid underline is not always required. If the text is any other color, the solid underline is the clearer signal that it links somewhere.

Use a dotted underline to indicate that the text has an associated interaction that discloses more information, such as a hover or reveal behavior.

The dotted and solid behaviors can also work together. In cases where the text can disclose more information and also take the user somewhere or open something, the text can use a dotted underline at rest and switch to a solid underline on hover.

These underline treatments should be used to communicate interaction meaning, not as a decorative default.

## 7. Display Styles

Display styles should be used very sparingly.

They are mainly reserved for unusually large numeric or headline-like values that need to dominate the layout.

Typical examples are:

1. large scores,
2. primary summary metrics,
3. rare hero-value moments such as large numbers or trends.

Display styles should not be treated as general-purpose headings. They are intentionally more dramatic and should be reserved for exceptional emphasis.

## 8. Anti-Patterns

Avoid these patterns:

1. defaulting to `body-large` when normal copy should just use `body-medium`,
2. setting `emphasis` everywhere instead of only where extra emphasis is needed,
3. using underline treatments as decoration instead of as an interaction cue,
4. using title styles for ordinary paragraph text,
5. using display styles for common headers or labels,
6. escalating text size too quickly when a smaller hierarchy shift would do the job,
7. assembling `--typography-*` primitives by hand in application code instead of using a `ds-text` variant.

## 9. Practical Summary

Start with `body-medium`.

Move down to `body-small` for subdued supporting copy.

Move up to `body-large` for slight hierarchy.

Set `emphasis` when you need more weight at the same size — and remember `title-*` and `display-*` need it to render at full strength.

Use underline treatments only when you need to communicate link or disclosure behavior.

Use `title-*` for actual titles.

Use `display-*` only for rare, oversized emphasis, especially large numeric values.

Always go through a `ds-text` variant rather than composing font primitives yourself.
