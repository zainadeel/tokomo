# Typography Usage Guidelines

## 1. Objective

This document explains how typography styles should be used in product UI.

These guidelines apply to both mobile and web. The exact size values differ by platform, but the usage pattern is the same.

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

## 4. Emphasis Styles

The emphasis variants are there for cases where you want more emphasis without changing the size tier.

They are primarily useful when:

1. emphasizing a term inside a paragraph,
2. giving one label more emphasis than another label that uses the same body size,
3. increasing emphasis through weight rather than through a size jump.

Visually, the emphasis styles work by using a heavier font weight, which gives the text more ink and helps it draw more attention.

They should be used deliberately as emphasis companions to the base body styles, not as the default version of the style.

Emphasis variants should not replace hierarchy.

If a piece of text needs to function as a heading, section label, or clearly higher-level piece of content, move to the appropriate title or display role instead of trying to create hierarchy through emphasis alone.

## 5. Title Styles

Use `title-*` styles for actual titles.

Typical examples are:

1. card titles,
2. section headers,
3. page section labels,
4. other short text that needs to read clearly as a title rather than as body copy.

If the text is functioning as a title, use a title style rather than trying to force hierarchy by only increasing body size.

## 6. Underline Styles

Underline treatments are available for body, title, and caption styles when the text needs to communicate a specific interactive meaning.

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
2. defaulting to emphasis variants instead of using them only where extra emphasis is needed,
3. using underline treatments as decoration instead of as an interaction cue,
4. using title styles for ordinary paragraph text,
5. using display styles for common headers or labels,
6. escalating text size too quickly when a smaller hierarchy shift would do the job.

## 9. Practical Summary

Start with `body-medium`.

Move down to `body-small` for subdued supporting copy.

Move up to `body-large` for slight hierarchy.

Use emphasis variants when you need more emphasis at the same size.

Use underline treatments only when you need to communicate link or disclosure behavior.

Use `title-*` for actual titles.

Use `display-*` only for rare, oversized emphasis, especially large numeric values.
