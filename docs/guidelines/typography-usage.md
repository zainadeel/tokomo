# Typography Usage Guidelines

## 1. Objective

This document explains how typography styles should be used in product UI.

These guidelines apply to both mobile and web. The exact size values differ by platform, but the usage pattern is the same.

### Where text recipes live

`@ds-mo/tokens` ships typography **primitives** only — `--typography-fontsize-*`, `--typography-lineheight-*`, `--typography-weight-*`, `--typography-letterspacing-*`, `--typography-paragraphspacing-*`, `--typography-font-family`, and `--typography-font-family-code`.

TokoMo also defines the recommended **composite text recipes** in its single machine-readable guidance contract, exported as `@ds-mo/tokens/agent`. The Documentation tab and typography previews are generated from that same contract. TokoMo does not ship `.text-*` utility classes, so consumers can implement these recipes in any framework or component system without inheriting an implementation.

For example, the regular `text-body-medium` recipe is:

```css
font-family: var(--typography-font-family);
font-size: var(--typography-fontsize-md);
line-height: var(--typography-lineheight-md);
font-weight: var(--typography-weight-regular);
letter-spacing: var(--typography-letterspacing-negative-half);
```

Start with a named recipe. Assemble primitives independently only when defining a deliberate new system-level recipe.

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

Each of the nine variants has a regular recipe and an emphasis recipe. Treat emphasis as one modifier on the underlying style rather than as a new typography role.

```css
/* text-body-medium emphasis changes these two assignments */
font-weight: var(--typography-weight-medium);
letter-spacing: var(--typography-letterspacing-negative);
```

Emphasis is useful when:

1. emphasizing a term inside a paragraph,
2. giving one label more emphasis than another label that uses the same size,
3. increasing emphasis through weight rather than through a size jump.

Visually, emphasis works by stepping the font weight up one level and tightening letter-spacing, which gives the text more ink and helps it draw more attention. Size and line-height never change — only weight and tracking. That means turning emphasis on or off is always safe for layout.

### 4.1 The full matrix

| Variant | Size / line-height | Regular weight / tracking | Emphasis weight / tracking |
|---|---|---|---|
| `text-display-medium` | `fontsize-3xl` / `lineheight-3xl` | `weight-semibold` / `letterspacing-negative` | `weight-bold` / `letterspacing-negative-double` |
| `text-display-small` | `fontsize-2xl` / `lineheight-2xl` | `weight-semibold` / `letterspacing-negative` | `weight-bold` / `letterspacing-negative-double` |
| `text-title-large` | `fontsize-xl` / `lineheight-xl` | `weight-medium` / `letterspacing-negative` | `weight-semibold` / `letterspacing-negative-double` |
| `text-title-medium` | `fontsize-lg` / `lineheight-lg` | `weight-medium` / `letterspacing-negative-half` | `weight-semibold` / `letterspacing-negative` |
| `text-title-small` | `fontsize-md` / `lineheight-md` | `weight-medium` / `letterspacing-negative-half` | `weight-semibold` / `letterspacing-negative` |
| `text-body-large` | `fontsize-lg` / `lineheight-lg` | `weight-regular` / `letterspacing-negative-half` | `weight-medium` / `letterspacing-negative` |
| `text-body-medium` | `fontsize-md` / `lineheight-md` | `weight-regular` / `letterspacing-negative-half` | `weight-medium` / `letterspacing-negative` |
| `text-body-small` | `fontsize-sm` / `lineheight-sm` | `weight-regular` / `letterspacing-none` | `weight-medium` / `letterspacing-negative-half` |
| `text-caption` | `fontsize-xs` / `lineheight-xs` | `weight-medium` / `letterspacing-positive` | `weight-semibold` / `letterspacing-positive` |

Two consequences are worth internalising:

1. **Titles and display styles use a deliberate regular weight.** If one of these styles needs stronger emphasis at the same size, select its emphasis recipe rather than choosing a weight in isolation.
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

## 6. Display Styles

Display styles should be used very sparingly.

They are mainly reserved for unusually large numeric or headline-like values that need to dominate the layout.

Typical examples are:

1. large scores,
2. primary summary metrics,
3. rare hero-value moments such as large numbers or trends.

Display styles should not be treated as general-purpose headings. They are intentionally more dramatic and should be reserved for exceptional emphasis.

## 7. Anti-Patterns

Avoid these patterns:

1. defaulting to `body-large` when normal copy should just use `body-medium`,
2. setting `emphasis` everywhere instead of only where extra emphasis is needed,
3. using title styles for ordinary paragraph text,
4. using display styles for common headers or labels,
5. escalating text size too quickly when a smaller hierarchy shift would do the job,
6. changing weight without the recipe's corresponding letter-spacing change,
7. assembling `--typography-*` primitives independently instead of starting from a documented composite.

## 8. Practical Summary

Start with `body-medium`.

Move down to `body-small` for subdued supporting copy.

Move up to `body-large` for slight hierarchy.

Use the emphasis recipe when you need more weight at the same size; it also changes letter spacing, and its target weight depends on whether the style is display, title, body, or caption.

Use `title-*` for actual titles.

Use `display-*` only for rare, oversized emphasis, especially large numeric values.

Implement the documented composite in the framework or component system of your choice rather than inventing a new primitive combination by default.
