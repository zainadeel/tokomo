/**
 * Structured authored inputs for effect tokens that Figma variables cannot express.
 *
 * Values live in node specs. The renderer receives graph values and only owns the
 * comments and whitespace contract of effects.css.
 */

const durationSuffixes = [
  'instant',
  'short-1',
  'short-2',
  'short-3',
  'medium-1',
  'medium-2',
  'medium-3',
  'long-1',
  'long-2',
  'long-3',
];

const motionTokens = durationSuffixes.map(suffix => ({
  cssName: `--effect-motion-${suffix}`,
  path: ['motion', suffix],
  provenance: 'derived',
  cssValue:
    `var(--effect-animation-duration-${suffix})` +
    `${' '.repeat(9 - suffix.length)}` +
    'var(--effect-animation-easing-ease-in-out)',
}));

const transitionKinds = [
  ['background', 'background-color'],
  ['color', 'color'],
  ['opacity', 'opacity'],
  ['border-color', 'border-color'],
  ['transform', 'transform'],
];

const transitionTokens = transitionKinds.flatMap(([kind, property]) =>
  durationSuffixes.map(suffix => ({
    cssName: `--effect-transition-interaction-${kind}-${suffix}`,
    path: ['transition', 'interaction', kind, suffix],
    provenance: 'derived',
    cssValue: `${property} var(--effect-motion-${suffix})`,
  })),
);

const elevationGroups = [
  {
    id: 'elevated-none',
    comment: '/* ── elevated-none ─────────────────────────────────────────────────────── */',
    singleLine: true,
    shadow: 'none',
    highlight: 'none',
    elevation: 'none',
  },
  {
    id: 'elevated-sm',
    comment: '/* ── elevated-sm ───────────────────────────────────────────────────────── */',
    shadow:
      '0px 2px 4px -2px var(--color-elevation-shadow),\n' +
      '    0px 0px 0px 1px  var(--color-elevation-shadow)',
    highlight:
      'inset 0px 4px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 0px 0px 0px 1px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-sm),\n' +
      '    var(--effect-highlight-elevated-sm)',
  },
  {
    id: 'elevated-md',
    comment: '/* ── elevated-md ───────────────────────────────────────────────────────── */',
    shadow:
      '0px 4px 8px -2px var(--color-elevation-shadow),\n' +
      '    0px 0px 0px 1px  var(--color-elevation-shadow)',
    highlight:
      'inset 0px 4px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 0px 0px 0px 1px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-md),\n' +
      '    var(--effect-highlight-elevated-md)',
  },
  {
    id: 'elevated-floating',
    comment: '/* ── elevated-floating ─────────────────────────────────────────────────── */',
    shadow:
      '0px 8px 16px -4px var(--color-elevation-shadow),\n' +
      '    0px 0px 0px 1px   var(--color-elevation-shadow)',
    highlight:
      'inset 0px 4px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 0px 0px 0px 1px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-floating),\n' +
      '    var(--effect-highlight-elevated-floating)',
  },
  {
    id: 'depressed-sm',
    comment: '/* ── depressed-sm ──────────────────────────────────────────────────────── */',
    note: "/* Note: outset contains the bottom highlight rim for depressed elevations */",
    shadow:
      '0px  4px 2px -4px var(--color-elevation-highlight),\n' +
      '    0px  0px 0px  1px var(--color-elevation-highlight)',
    highlight:
      'inset 0px 2px 4px -2px var(--color-elevation-shadow),\n' +
      '    inset 0px 0px 0px 1px  var(--color-elevation-shadow)',
    elevation:
      'var(--effect-shadow-depressed-sm),\n' +
      '    var(--effect-highlight-depressed-sm)',
  },
  {
    id: 'depressed-md',
    comment: '/* ── depressed-md ──────────────────────────────────────────────────────── */',
    shadow:
      '0px  4px 2px -4px var(--color-elevation-highlight),\n' +
      '    0px  0px 0px  1px var(--color-elevation-highlight)',
    highlight:
      'inset 0px 4px 8px -4px var(--color-elevation-shadow),\n' +
      '    inset 0px 0px 0px 1px  var(--color-elevation-shadow)',
    elevation:
      'var(--effect-shadow-depressed-md),\n' +
      '    var(--effect-highlight-depressed-md)',
  },
  {
    id: 'elevated-panel-top',
    comment: '/* ── elevated-panel-top (shadow casts downward, attaches to bottom of viewport) ── */',
    shadow:
      '0px 4px 8px 0px var(--color-elevation-shadow),\n' +
      '    0px 0px 0px 1px var(--color-elevation-shadow)',
    highlight:
      'inset 0px -4px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 0px -1px 0px 0px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-panel-top),\n' +
      '    var(--effect-highlight-elevated-panel-top)',
  },
  {
    id: 'elevated-panel-right',
    comment: '/* ── elevated-panel-right (shadow casts leftward, panel attached to right edge) ── */',
    shadow:
      '-4px 0px 8px -2px var(--color-elevation-shadow),\n' +
      '    0px  0px 0px  1px var(--color-elevation-shadow)',
    highlight:
      'inset 4px 0px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 1px 0px 0px 0px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-panel-right),\n' +
      '    var(--effect-highlight-elevated-panel-right)',
  },
  {
    id: 'elevated-panel-bottom',
    comment: '/* ── elevated-panel-bottom (shadow casts upward, attaches to top of viewport) ── */',
    shadow:
      '0px -4px 8px 0px var(--color-elevation-shadow),\n' +
      '    0px  0px 0px 1px var(--color-elevation-shadow)',
    highlight:
      'inset 0px 4px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset 0px 1px 0px 0px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-panel-bottom),\n' +
      '    var(--effect-highlight-elevated-panel-bottom)',
  },
  {
    id: 'elevated-panel-left',
    comment: '/* ── elevated-panel-left (shadow casts rightward, panel attached to left edge) ── */',
    shadow:
      '4px 0px 8px -2px var(--color-elevation-shadow),\n' +
      '    0px 0px 0px  1px var(--color-elevation-shadow)',
    highlight:
      'inset -4px 0px 2px -4px var(--color-elevation-highlight),\n' +
      '    inset -1px 0px 0px 0px  var(--color-elevation-highlight)',
    elevation:
      'var(--effect-shadow-elevated-panel-left),\n' +
      '    var(--effect-highlight-elevated-panel-left)',
  },
];

const elevationTokens = elevationGroups.flatMap(group => [
  {
    cssName: `--effect-shadow-${group.id}`,
    path: ['shadow', group.id],
    provenance: 'hand-authored',
    cssValue: group.shadow,
  },
  {
    cssName: `--effect-highlight-${group.id}`,
    path: ['highlight', group.id],
    provenance: 'hand-authored',
    cssValue: group.highlight,
  },
  {
    cssName: `--effect-elevation-${group.id}`,
    path: ['elevation', group.id],
    provenance: 'derived',
    cssValue: group.elevation,
  },
]);

const focusRing = {
  cssName: '--effect-focus-ring',
  path: ['focus-ring'],
  provenance: 'hand-authored',
  cssValue:
    '0 0 0 var(--dimension-space-025) transparent,\n' +
    '    0 0 0 calc(var(--dimension-space-025) + var(--dimension-stroke-width-025)) var(--color-foreground-medium-brand)',
};

export const MANUAL_EFFECT_TOKENS = Object.freeze([
  ...motionTokens,
  ...transitionTokens,
  ...elevationTokens,
  focusRing,
]);

function renderAlignedToken(token, suffix) {
  return `  ${token.cssName}:${' '.repeat(9 - suffix.length)}${token.cssValue};`;
}

function renderMultilineToken(token) {
  return `  ${token.cssName}:\n    ${token.cssValue};`;
}

export function renderManualEffectsCss(valueForName) {
  const tokenByName = new Map(
    MANUAL_EFFECT_TOKENS.map(token => [
      token.cssName,
      { ...token, cssValue: valueForName(token.cssName) },
    ]),
  );
  const lines = [
    '',
    '',
    '  /* ─────────────────────────────────────────────────────────────────────────',
    '     HAND-AUTHORED — Motion presets and transition shorthands.',
    '     These compose duration + easing into reusable motion values.',
    '     Not representable as Figma variables (they combine multiple primitives).',
    '     ───────────────────────────────────────────────────────────────────────── */',
    '',
    '  /* Motion presets — use like: transition: color var(--effect-motion-short-2);',
    '     Duration names match Figma: short-1/2/3, medium-1/2/3, long-1/2/3        */',
    ...durationSuffixes.map(suffix =>
      renderAlignedToken(tokenByName.get(`--effect-motion-${suffix}`), suffix)),
    '',
    '  /* Interaction transition shorthands — names match Figma duration scale */',
  ];

  transitionKinds.forEach(([kind], kindIndex) => {
    lines.push(...durationSuffixes.map(suffix =>
      renderAlignedToken(
        tokenByName.get(`--effect-transition-interaction-${kind}-${suffix}`),
        suffix,
      )));
    if (kindIndex < transitionKinds.length - 1) lines.push('');
  });

  lines.push(
    '',
    '  /* ─────────────────────────────────────────────────────────────────────────',
    '     HAND-AUTHORED — Elevation tokens. Source: Figma App Styles — Variables.',
    '     Multi-layer box-shadows cannot be expressed as Figma number variables.',
    '',
    '     Three tokens per elevation level:',
    '       --effect-shadow-{name}    outer layers only',
    '       --effect-highlight-{name} inset layers only',
    '       --effect-elevation-{name} combined default for the normal one-element case',
    '',
    '     The public split supports paint hierarchies where an unclipped outer frame',
    '     carries depth around an inner content region that clips descendants. An',
    "     element's own overflow does not automatically require separate layers.",
    '     ───────────────────────────────────────────────────────────────────────── */',
    '',
  );

  elevationGroups.forEach((group, groupIndex) => {
    lines.push(`  ${group.comment}`);
    if (group.note) lines.push(`  ${group.note}`);
    const groupTokens = ['shadow', 'highlight', 'elevation']
      .map(kind => tokenByName.get(`--effect-${kind}-${group.id}`));

    if (group.singleLine) {
      const longestName = Math.max(...groupTokens.map(token => token.cssName.length));
      lines.push(...groupTokens.map(token =>
        `  ${token.cssName}:${' '.repeat(longestName - token.cssName.length + 1)}${token.cssValue};`
      ));
    } else {
      lines.push(...groupTokens.map(renderMultilineToken));
    }
    lines.push('');
  });

  lines.push(
    '  /* ── focus ring ────────────────────────────────────────────────────────── */',
    renderMultilineToken(tokenByName.get('--effect-focus-ring')),
  );

  return lines.join('\n');
}
