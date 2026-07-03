# Elevation Usage Guidelines

## 1. Objective

This document explains how elevation styles should be used in product UI.

**CSS variables** use the prefix `--effect-elevation-{name}` (see `src/effects.css`). TokoMo also exposes split `--effect-shadow-*` and `--effect-highlight-*` tokens when you need overflow-safe clipping.

## 2. Quick Decision Rule

Use this rule first:

1. if the surface touches most of its container edges, use a **panel** elevation,
2. if the surface has breathing room on all four sides, use `elevated-sm` or `elevated-md`,
3. if the surface has breathing room on all four sides and is meant to visually float above other content, use `elevated-floating`,
4. if the surface should feel inset or embedded, use `depressed-sm` or `depressed-md`,
5. if elevation is intentionally turned off, use `elevated-none`.

In practice, panel elevations are for surfaces that touch at least three sides of the container they live in, or otherwise read as edge-attached.

## 3. Panel Elevations

Panel elevations are for surfaces that are attached to the boundary of the area they sit inside.

These styles are directional. The panel direction should match the side of the container that the panel is attached to.

Typical use cases:

1. app headers,
2. bottom bars,
3. left and right drawers,
4. edge-attached trays or panels.

Use the panel direction that matches the aligned edge of the surface:

| Token suffix | CSS variable | Use for |
| --- | --- | --- |
| `elevated-panel-top` | `--effect-elevation-elevated-panel-top` | top header / app bar |
| `elevated-panel-bottom` | `--effect-elevation-elevated-panel-bottom` | bottom bar / footer |
| `elevated-panel-left` | `--effect-elevation-elevated-panel-left` | left drawer |
| `elevated-panel-right` | `--effect-elevation-elevated-panel-right` | right drawer |

Do not use panel elevations on floating cards or standalone containers.

## 4. Non-Panel Elevations

`elevated-sm`, `elevated-md`, and `elevated-floating` are for surfaces that do not touch surrounding boundaries on all four sides.

Typical use cases: cards, free-standing containers, inset UI with clearance on all sides.

| Token suffix | CSS variable | Lift |
| --- | --- | --- |
| `elevated-sm` | `--effect-elevation-elevated-sm` | lightest raised |
| `elevated-md` | `--effect-elevation-elevated-md` | standard raised |
| `elevated-floating` | `--effect-elevation-elevated-floating` | floats above content (FAB, menus, modals) |

Do not use `elevated-floating` just because an element needs more lift than `elevated-md`.

## 5. Depressed Elevation

`depressed-sm` and `depressed-md` are for elements that should appear embedded within a surrounding surface.

| Token suffix | CSS variable |
| --- | --- |
| `depressed-sm` | `--effect-elevation-depressed-sm` |
| `depressed-md` | `--effect-elevation-depressed-md` |

Typical use cases: text inputs, embedded fields, inset control regions.

## 6. None

`elevated-none` (`--effect-elevation-elevated-none`) is for cases where elevation is part of the component model but the visual result should be flat.

## 7. Anti-Patterns

Avoid these patterns:

1. using a panel elevation on a card that has open space on all four sides,
2. using `elevated-sm` / `elevated-md` / `elevated-floating` / `depressed-*` on a surface attached to a container edge,
3. choosing a panel direction that does not match the aligned edge,
4. using `depressed-*` for elements meant to read as raised,
5. using `elevated-floating` on a normal card that is not meant to hover above other content,
6. leaving elevation unspecified when the component API expects a named elevation style.

## 8. Practical Summary

If the surface is attached to the boundary of its container, use a panel elevation (`elevated-panel-*`).

If the surface has clearance on all four sides, use `elevated-sm` or `elevated-md` for raised surfaces, `elevated-floating` for overlays, and `depressed-sm` / `depressed-md` for inset surfaces.

If the component needs an elevation value but should render flat, use `elevated-none`.
