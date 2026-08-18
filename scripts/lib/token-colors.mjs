// Shared colour-resolution primitives for the token audits.
//
// Extracted from report-contrast.mjs so an audit can be unit-tested without
// importing that script, which reads dist/ and writes reports/ at module scope.

import {
  compositeOverlayRgb,
  linearToEncoded,
  oklchToXyz,
  xyzToSrgbLinear,
} from "../../tools/color-system/oklch-utils.mjs";

// Reference tokens are emitted only into the light map (they are theme-independent
// custom properties in :root), so dark-mode lookups fall back to light.
export function makeResolver(modes) {
  return function resolve(mode, name, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
    seen.add(name);

    const token = modes[mode]?.[name] ?? modes.light?.[name];
    if (!token) throw new Error(`Unknown token ${name} in mode ${mode}`);

    const value = String(token.$value).trim();
    const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (varMatch) return resolve(mode, varMatch[1], seen);
    return value;
  };
}

// The full alias chain for a token, ending in the literal colour value. The
// active-state matrix needs the intermediate reference-token NAME, not just the
// final value, so it can report which reference a semantic token maps to.
export function makeChainResolver(modes) {
  return function resolveChain(mode, name, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
    seen.add(name);

    const token = modes[mode]?.[name] ?? modes.light?.[name];
    if (!token) throw new Error(`Unknown token ${name} in mode ${mode}`);

    const value = String(token.$value).trim();
    const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (varMatch) return [name, ...resolveChain(mode, varMatch[1], seen)];
    return [name, value];
  };
}

// The last `--color-reference-*` link in a chain, which is the value a token
// author would edit. Falls back to the chain's own head for tokens that are
// themselves literal (no reference indirection).
export function referenceOf(chain) {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (chain[i].startsWith("--color-reference-")) return chain[i];
  }
  return chain[0];
}

// Returns { r, g, b, a } with channels as 0..1 encoded sRGB.
export function parseCssColor(value) {
  const rgbMatch = value.match(
    /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/
  );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]) / 255,
      g: Number(rgbMatch[2]) / 255,
      b: Number(rgbMatch[3]) / 255,
      a: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
    };
  }

  // Reference chromatic tokens ship as oklch(L% C H) — L is a percentage.
  const oklchMatch = value.match(
    /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/
  );
  if (oklchMatch) {
    const l = Number(oklchMatch[1]) / 100;
    const c = Number(oklchMatch[2]);
    const h = Number(oklchMatch[3]);
    const { x, y, z } = oklchToXyz(l, c, h);
    const lin = xyzToSrgbLinear(x, y, z);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    return {
      r: clamp01(linearToEncoded(lin.r)),
      g: clamp01(linearToEncoded(lin.g)),
      b: clamp01(linearToEncoded(lin.b)),
      a: oklchMatch[4] === undefined ? 1 : Number(oklchMatch[4]),
    };
  }

  throw new Error(`Unsupported colour value: ${value}`);
}

// Foreground tokens are frequently black/white at partial alpha, so the
// foreground must be composited over its background before measuring — this is
// the sRGB alpha-compositing rule in color-generation.md §4.3, and it is why the
// figures in color-usage.md §7 are described as post-compositing.
export function flatten(foreground, background) {
  if (foreground.a >= 1) return foreground;
  const isBlackish = foreground.r + foreground.g + foreground.b < 1.5;
  const composited = compositeOverlayRgb(
    background,
    isBlackish ? "black" : "white",
    foreground.a
  );
  return { ...composited, a: 1 };
}

// General source-over composite of an arbitrary overlay onto an OPAQUE base.
//
// compositeOverlayRgb in oklch-utils only handles pure black/white washes. The
// selected-state overlays include chromatic, fully opaque fills
// (interaction.active-brand), which replace the base rather than tint it, so
// the audit needs the general rule.
export function compositeRgb(overlay, base) {
  const a = overlay.a;
  return {
    r: a * overlay.r + (1 - a) * base.r,
    g: a * overlay.g + (1 - a) * base.g,
    b: a * overlay.b + (1 - a) * base.b,
    a: 1,
  };
}
