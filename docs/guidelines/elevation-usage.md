# Elevation Usage Guidelines

## 1. Objective

This document explains how elevation styles should be used in product UI.

## 2. Quick Decision Rule

Use this rule first:

1. if the surface touches most of its container edges, use a panel elevation,
2. if the surface has breathing room on all four sides, use `flat` or `elevated`,
3. if the surface has breathing room on all four sides and is meant to visually float above other content, use `floating`,
4. if the surface should feel inset or embedded, use `depressed`,
5. if elevation is intentionally turned off, use `none`.

In practice, panel elevations are for surfaces that touch at least three sides of the container they live in, or otherwise read as edge-attached.

## 3. Panel Elevations

Panel elevations are for surfaces that are attached to the boundary of the area they sit inside.

These styles are directional. The panel direction should match the side of the container that the panel is attached to.

This makes them the right choice for anchored surfaces such as:

1. app headers,
2. bottom bars,
3. left and right drawers,
4. edge-attached trays or panels.

Use the panel direction that matches the aligned edge of the surface:

1. `elevation-panel-top` for a top header or top app bar,
2. `elevation-panel-bottom` for a bottom bar or footer surface,
3. `elevation-panel-left` for a left-side drawer,
4. `elevation-panel-right` for a right-side drawer.

Do not use panel elevations on floating cards or standalone containers. They are intentionally asymmetric and will look wrong when the surface is expected to have clearance on every side.

## 4. Non-Panel Elevations

`elevation-flat`, `elevation-elevated`, and `elevation-floating` are for surfaces that do not touch surrounding boundaries on any of their four sides.

These styles should be used for elements that sit with visible space around them, such as:

1. cards,
2. free-standing containers,
3. inset UI elements that sit inside a surface with visible clearance all around.

The difference between them is amount of lift:

1. `elevation-flat` is the lightest raised treatment,
2. `elevation-elevated` is the standard raised treatment,
3. `elevation-floating` is for elements that are visually floating above other elements and may have content pass underneath them.

`elevation-floating` is primarily for genuinely floating UI such as:

1. FAB buttons,
2. popups,
3. dropdown menus,
4. modals,
5. other overlay-like elements that sit above surrounding content.

Do not use `floating` just because an element needs more lift than `elevated`. If the surface is not actually meant to read as floating above other content, `flat` or `elevated` is usually the better choice.

All three assume the element has separation from nearby boundaries. If the element is attached to an edge, a panel elevation is usually the better fit.

## 5. Depressed Elevation

`elevation-depressed` is for elements that should appear embedded within a surrounding surface rather than raised above it.

The most common example is an input field, but the style can be used anywhere the intent is to show that something is inset into the surface.

Typical use cases are:

1. text inputs,
2. embedded fields,
3. inset control regions,
4. other surfaces that are meant to read as carved into their parent surface.

Like the non-panel raised elevations, `depressed` should generally only be used when the element has visible clearance on all four sides. It is not intended for edge-attached surfaces.

## 6. None

`elevation-none` is for cases where elevation is still part of the component model, but the visual result should be no elevation treatment.

Use it when:

1. a component supports elevation variants but should currently render flat,
2. you want to explicitly choose no elevation instead of leaving the elevation state undefined,
3. you need a zero-elevation option that still fits into the same naming system as the other elevation styles.

## 7. Anti-Patterns

Avoid these patterns:

1. using a panel elevation on a card that has open space on all four sides,
2. using `flat`, `elevated`, `floating`, or `depressed` on a surface that is attached to a container edge,
3. choosing a panel direction that does not match the side the panel is aligned to,
4. using `depressed` for elements that are meant to read as raised above the surface,
5. using `floating` on a normal card or container that is not meant to visually hover above other content,
6. leaving elevation unspecified when the component API is expected to choose between named elevation styles.

## 8. Practical Summary

If the surface is attached to the boundary of its container, use a panel elevation.

If the surface has clearance on all four sides, use `flat` or `elevated` for standard raised surfaces, `floating` for elements that visually hover above other content, and `depressed` for surfaces that should read as inset.

If the component still needs an elevation value but should render with no visual lift, use `none`.
