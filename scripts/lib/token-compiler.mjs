import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, '../..');
const BASE_PX = 8;

export const TOKEN_SOURCE_MANIFEST = Object.freeze([
  {
    id: 'colors.reference',
    file: 'src/json/colors/reference/color.reference.tokens.json',
    category: 'colors',
    layer: 'reference',
    mode: 'light',
  },
  {
    id: 'colors.semantic.light',
    file: 'src/json/colors/semantic/color.semantic.light.tokens.json',
    category: 'colors',
    layer: 'semantic',
    mode: 'light',
  },
  {
    id: 'colors.semantic.dark',
    file: 'src/json/colors/semantic/color.semantic.dark.tokens.json',
    category: 'colors',
    layer: 'semantic',
    mode: 'dark',
  },
  {
    id: 'colors.data.light',
    file: 'src/json/colors/data/color.data.light.tokens.json',
    category: 'colors',
    layer: 'data',
    mode: 'light',
  },
  {
    id: 'colors.data.dark',
    file: 'src/json/colors/data/color.data.dark.tokens.json',
    category: 'colors',
    layer: 'data',
    mode: 'dark',
  },
  {
    id: 'dimensions',
    file: 'src/json/dimensions/dimensions.tokens.json',
    category: 'dimensions',
    mode: 'default',
    expectedGroups: [
      'space',
      'radius',
      'size',
      'size-icon',
      'width-card',
      'width-form',
      'width-menu',
      'width-modal',
      'width-panel',
      'width-stroke',
      'width-table-column',
      'width-tooltip',
      'height-card',
      'height-modal',
      'offset',
      'scale',
      'z-index',
    ],
  },
  {
    id: 'typography',
    file: 'src/json/typography/typography.tokens.json',
    category: 'typography',
    mode: 'default',
    expectedGroups: [
      'font-family',
      'weight',
      'font-size',
      'line-height',
      'letter-spacing',
      'paragraph-spacing',
    ],
  },
  {
    id: 'effects',
    file: 'src/json/effects/effects.tokens.json',
    category: 'effects',
    mode: 'default',
    expectedGroups: ['animation', 'blur', 'opacity'],
    expectedPaths: [
      ['animation', 'duration'],
      ['animation', 'delay'],
      ['animation', 'easing'],
    ],
  },
]);

const PUBLIC_TYPES = {
  colors: 'color',
  dimensions: 'dimension',
  typography: 'typography',
  effects: 'effect',
};

const DIMENSION_TYPES = {
  space: ['number'],
  radius: ['number'],
  'width-stroke': ['number'],
  size: ['number'],
  'size-icon': ['number'],
  'width-card': ['number', 'string'],
  'width-modal': ['number', 'string'],
  'width-form': ['number', 'string'],
  'width-table-column': ['number', 'string'],
  'width-menu': ['number', 'string'],
  'width-tooltip': ['number', 'string'],
  'width-panel': ['number', 'string'],
  'height-card': ['number', 'string'],
  'height-modal': ['number', 'string'],
  offset: ['number', 'string'],
  scale: ['number', 'string'],
  'z-index': ['number'],
};

const TYPOGRAPHY_TYPES = {
  'font-family': ['string'],
  weight: ['number'],
  'font-size': ['number'],
  'line-height': ['number'],
  'letter-spacing': ['number'],
  'paragraph-spacing': ['number'],
};

const EFFECT_TYPES = {
  blur: ['number'],
  opacity: ['number'],
  'animation-duration': ['duration', 'number'],
  'animation-delay': ['duration', 'number'],
  'animation-easing': ['easing', 'string'],
};

const DIMENSION_SECTIONS = [
  {
    id: 'space',
    sourceGroup: 'space',
    prefix: 'space',
    comment: 'Spacing — calc() relative to --dimension-space-base',
    format: token => toCalcExpr(assertFiniteNumber(token.$value), '--dimension-space-base'),
  },
  {
    id: 'radius',
    sourceGroup: 'radius',
    prefix: 'radius',
    comment: 'Radius — calc() relative to --dimension-radius-base',
    format: token => toCalcExpr(assertFiniteNumber(token.$value), '--dimension-radius-base'),
  },
  {
    id: 'stroke-width',
    sourceGroup: 'width-stroke',
    prefix: 'stroke-width',
    comment: 'Stroke widths — calc() relative to --dimension-stroke-width-base',
    format: token => toCalcExpr(assertFiniteNumber(token.$value), '--dimension-stroke-width-base'),
  },
  {
    id: 'size',
    sourceGroup: 'size',
    prefix: 'size',
    comment: 'Size — element width/height, calc() relative to --dimension-size-base',
    format: token => toCalcExpr(assertFiniteNumber(token.$value), '--dimension-size-base'),
  },
  {
    id: 'iconography',
    sourceGroup: 'size-icon',
    prefix: 'iconography',
    comment: 'Iconography — semantic icon size aliases, calc() relative to --dimension-size-base',
    format: token => toCalcExpr(assertFiniteNumber(token.$value), '--dimension-size-base'),
  },
  {
    id: 'card-width',
    sourceGroup: 'width-card',
    prefix: 'card-width',
    comment: 'Card widths',
    format: formatFixedDimension,
  },
  {
    id: 'modal-width',
    sourceGroup: 'width-modal',
    prefix: 'modal-width',
    comment: 'Modal widths',
    format: formatFixedDimension,
  },
  {
    id: 'form-width',
    sourceGroup: 'width-form',
    prefix: 'form-width',
    comment: 'Form widths',
    format: formatFixedDimension,
  },
  {
    id: 'table-column-width',
    sourceGroup: 'width-table-column',
    prefix: 'table-column-width',
    comment: 'Table column widths',
    format: formatFixedDimension,
  },
  {
    id: 'menu-width',
    sourceGroup: 'width-menu',
    prefix: 'menu-width',
    comment: 'Menu widths',
    format: formatFixedDimension,
  },
  {
    id: 'tooltip-width',
    sourceGroup: 'width-tooltip',
    prefix: 'tooltip-width',
    comment: 'Tooltip widths',
    format: formatFixedDimension,
  },
  {
    id: 'panel-width',
    sourceGroup: 'width-panel',
    prefix: 'panel-width',
    comment: 'Panel widths',
    format: formatFixedDimension,
  },
  {
    id: 'card-height',
    sourceGroup: 'height-card',
    prefix: 'card-height',
    comment: 'Card heights',
    format: formatFixedDimension,
  },
  {
    id: 'modal-height',
    sourceGroup: 'height-modal',
    prefix: 'modal-height',
    comment: 'Modal heights',
    format: formatFixedDimension,
  },
  {
    id: 'offset',
    sourceGroup: 'offset',
    prefix: 'offset',
    comment: 'Offset — for transforms and background-position, calc() relative to --dimension-space-base',
    format: token => {
      const value = typeof token.$value === 'string'
        ? parseNumericString(token.$value, 'offset')
        : token.$value;
      return toCalcExpr(assertFiniteNumber(value), '--dimension-space-base');
    },
  },
  {
    id: 'scale',
    sourceGroup: 'scale',
    prefix: 'scale',
    comment: 'Scale — unitless multipliers for transform: scale()',
    format: token => {
      if (typeof token.$value === 'number') {
        return String(Math.round(assertFiniteNumber(token.$value) * 1_000_000) / 1_000_000);
      }
      if (typeof token.$value !== 'string' || !token.$value.trim()) {
        throw new Error('scale values must be finite numbers or non-empty strings');
      }
      parseNumericString(token.$value, 'scale');
      return token.$value;
    },
  },
  {
    id: 'z-index',
    sourceGroup: 'z-index',
    prefix: 'z-index',
    comment: 'Z-index layers',
    format: token => String(assertFiniteNumber(token.$value)),
  },
];

const TYPOGRAPHY_SECTIONS = [
  {
    id: 'font-family',
    sourceGroup: 'font-family',
    comment: 'Font families',
    name: key => {
      const names = {
        ui: '--typography-font-family-ui',
        code: '--typography-font-family-code',
      };
      return names[key] ?? null;
    },
    format: (token, key) => {
      assertNonEmptyString(token.$value, 'font family');
      const fallback = key === 'ui' ? 'sans-serif' : 'monospace';
      return `'${titleCase(token.$value)}', ${fallback}`;
    },
  },
  {
    id: 'weight',
    sourceGroup: 'weight',
    comment: 'Font weights',
    name: key => `--typography-weight-${key}`,
    format: token => String(assertFiniteNumber(token.$value)),
  },
  {
    id: 'font-size',
    sourceGroup: 'font-size',
    comment: 'Font sizes',
    name: key => `--typography-fontsize-${key}`,
    format: token => `${roundTo2dp(assertFiniteNumber(token.$value))}px`,
  },
  {
    id: 'line-height',
    sourceGroup: 'line-height',
    comment: 'Line heights',
    name: key => `--typography-lineheight-${key}`,
    format: token => `${roundTo2dp(assertFiniteNumber(token.$value))}px`,
  },
  {
    id: 'letter-spacing',
    sourceGroup: 'letter-spacing',
    comment: 'Letter spacing',
    name: key => `--typography-letterspacing-${key}`,
    format: token => `${roundTo2dp(assertFiniteNumber(token.$value))}px`,
  },
  {
    id: 'paragraph-spacing',
    sourceGroup: 'paragraph-spacing',
    comment: 'Paragraph spacing',
    name: key => `--typography-paragraphspacing-${key}`,
    format: token => `${roundTo2dp(assertFiniteNumber(token.$value))}px`,
  },
];

const EFFECT_SECTIONS = [
  {
    id: 'blur',
    pathPrefix: ['blur'],
    comment: 'Blur',
    name: pathSegments => `--effect-blur-${pathSegments[1]}`,
    format: token => `${assertFiniteNumber(token.$value)}px`,
  },
  {
    id: 'opacity',
    pathPrefix: ['opacity'],
    comment: 'Opacity',
    name: pathSegments => `--effect-opacity-${pathSegments[1]}`,
    format: token => {
      const value = assertFiniteNumber(token.$value);
      if (value < 0 || value > 100) throw new Error('opacity must be between 0 and 100');
      return String(value / 100);
    },
  },
  {
    id: 'animation-duration',
    pathPrefix: ['animation', 'duration'],
    comment: 'Animation durations',
    name: pathSegments => `--effect-animation-duration-${pathSegments[2]}`,
    format: resolveDuration,
  },
  {
    id: 'animation-delay',
    pathPrefix: ['animation', 'delay'],
    comment: 'Animation delays',
    name: pathSegments => `--effect-animation-delay-${pathSegments[2]}`,
    format: resolveDuration,
  },
  {
    id: 'animation-easing',
    pathPrefix: ['animation', 'easing'],
    comment: 'Animation easing curves',
    name: pathSegments => `--effect-animation-easing-${pathSegments[2]}`,
    format: token => {
      assertNonEmptyString(token.$value, 'easing');
      return token.$value;
    },
  },
];

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeSegment = value =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const tokenPathToVarName = (prefix, pathSegments) => {
  const tail = pathSegments.map(sanitizeSegment).filter(Boolean).join('-');
  if (!tail) throw new Error('token path resolved to an empty CSS variable name');
  return `--${prefix}-${tail}`;
};

const toCamelCase = cssVarName =>
  cssVarName
    .replace(/^--/, '')
    .replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

const formatPath = pathSegments => pathSegments.map(segment => String(segment)).join('.');

function sourceError(source, pathSegments, code, message) {
  const location = pathSegments.length ? `${source.file}:${formatPath(pathSegments)}` : source.file;
  const error = new Error(`${location}: [${code}] ${message}`);
  error.code = code;
  error.sourceFile = source.file;
  error.tokenPath = pathSegments;
  return error;
}

function assertFiniteNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('value must be a finite number');
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertTokenType(token, expectedTypes) {
  if (!expectedTypes.includes(token.$type)) {
    throw new Error(`expected $type ${expectedTypes.join(' or ')}, received ${token.$type}`);
  }
}

const roundTo2dp = value => Math.round(value * 100) / 100;
const titleCase = value => value.replace(/\b\w/g, char => char.toUpperCase());

function formatFixedDimension(token) {
  if (token.$type === 'string') {
    assertNonEmptyString(token.$value, 'fixed dimension');
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%$/.test(token.$value)) {
      throw new Error('fixed dimension strings must be percentages');
    }
    return token.$value;
  }
  return `${assertFiniteNumber(token.$value)}px`;
}

function parseNumericString(value, label) {
  assertNonEmptyString(value, label);
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new Error(`${label} string must contain only a finite number`);
  }
  return assertFiniteNumber(Number(value));
}

function toCalcExpr(value, baseVar) {
  if (value === 0) return '0';
  if (value === 9999) return '9999px';

  const isNegative = value < 0;
  const absoluteMultiplier = Math.abs(value) / BASE_PX;
  const denominators = [1, 2, 4, 8, 16, 32];

  for (const denominator of denominators) {
    const absoluteNumerator = Math.round(absoluteMultiplier * denominator);
    if (Math.abs(absoluteNumerator / denominator - absoluteMultiplier) >= 1e-9) continue;

    const numerator = isNegative ? -absoluteNumerator : absoluteNumerator;
    if (absoluteNumerator === denominator) {
      return isNegative ? `calc(var(${baseVar}) * -1)` : `var(${baseVar})`;
    }
    if (denominator === 1) return `calc(var(${baseVar}) * ${numerator})`;
    if (absoluteNumerator === 1) {
      return isNegative
        ? `calc(var(${baseVar}) * -1 / ${denominator})`
        : `calc(var(${baseVar}) / ${denominator})`;
    }
    return `calc(var(${baseVar}) * ${numerator} / ${denominator})`;
  }

  const decimal = Math.round((value / BASE_PX) * 1_000_000) / 1_000_000;
  return `calc(var(${baseVar}) * ${decimal})`;
}

function resolveDuration(token) {
  const value = token.$value;
  if (isObject(value) && hasOwn(value, 'value')) {
    const amount = assertFiniteNumber(value.value);
    if (amount < 0) throw new Error('duration must not be negative');
    const unit = value.unit ?? 'ms';
    if (!['ms', 's'].includes(unit)) throw new Error(`unsupported duration unit ${unit}`);
    return `${amount}${unit}`;
  }

  const amount = assertFiniteNumber(value);
  if (amount < 0) throw new Error('duration must not be negative');
  return `${amount}ms`;
}

function formatAlpha(alpha) {
  return String(Math.round(alpha * 100) / 100);
}

function tokenToCssColor(tokenValue) {
  if (!isObject(tokenValue)) throw new Error('color value must be an object');
  if (tokenValue.colorSpace != null && tokenValue.colorSpace !== 'srgb') {
    throw new Error(`unsupported color space ${tokenValue.colorSpace}`);
  }

  const alpha = tokenValue.alpha == null ? 1 : assertFiniteNumber(tokenValue.alpha);
  if (alpha < 0 || alpha > 1) throw new Error('color alpha must be between 0 and 1');

  if (Array.isArray(tokenValue.components)) {
    if (tokenValue.components.length < 3) throw new Error('color requires three components');
    const [red, green, blue] = tokenValue.components.map(assertFiniteNumber);
    if ([red, green, blue].some(component => component < 0 || component > 1)) {
      throw new Error('color components must be between 0 and 1');
    }
    const rgb = [red, green, blue].map(component => Math.round(component * 255));
    return alpha < 0.9999
      ? `rgb(${rgb.join(' ')} / ${formatAlpha(alpha)})`
      : `rgb(${rgb.join(' ')})`;
  }

  if (typeof tokenValue.hex === 'string' && /^#[\da-f]{6}$/i.test(tokenValue.hex)) {
    return tokenValue.hex.toUpperCase();
  }

  throw new Error('color requires components or a six-digit hex value');
}

function formatOklchNumber(value) {
  return String(Number(value.toFixed(4)));
}

function parseReferenceOklchFromName(referenceVarName) {
  if (!referenceVarName.startsWith('--color-reference-')) return null;
  const segments = referenceVarName.slice('--color-reference-'.length).split('-').filter(Boolean);
  if (!segments.length || ['black', 'white'].includes(segments[0])) return null;

  const lightnessIndex = segments.findIndex(segment => /^l\d+$/.test(segment));
  if (lightnessIndex < 0) return null;

  const lightness = Number.parseInt(segments[lightnessIndex].slice(1), 10);
  const chromaSegment = segments.find(segment => /^c\d+$/.test(segment));
  const chroma = chromaSegment ? Number.parseInt(chromaSegment.slice(1), 10) / 100 : 0;
  let hue = 0;
  for (let index = lightnessIndex - 1; index >= 0; index -= 1) {
    if (/^\d+$/.test(segments[index])) {
      hue = Number.parseInt(segments[index], 10);
      break;
    }
  }

  return `oklch(${lightness}% ${formatOklchNumber(chroma)} ${formatOklchNumber(hue)})`;
}

function referenceName(targetVariableName) {
  if (typeof targetVariableName !== 'string') return null;
  const segments = targetVariableName.split('/').map(sanitizeSegment).filter(Boolean);
  return segments.length ? `--color-reference-${segments.join('-')}` : null;
}

function extractDependencies(cssValue) {
  const dependencies = [];
  for (const match of cssValue.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)) {
    dependencies.push(match[1]);
  }
  return [...new Set(dependencies)];
}

export function walkTokenLeaves(document, source) {
  if (!isObject(document)) throw sourceError(source, [], 'INVALID_ROOT', 'source root must be an object');
  const leaves = [];

  function visit(node, pathSegments) {
    if (!isObject(node)) return;
    const hasType = hasOwn(node, '$type');
    const hasValue = hasOwn(node, '$value');

    if (hasType || hasValue) {
      if (!hasType || !hasValue) {
        throw sourceError(source, pathSegments, 'MALFORMED_TOKEN', 'token must define both $type and $value');
      }
      if (typeof node.$type !== 'string' || !node.$type.trim()) {
        throw sourceError(source, pathSegments, 'INVALID_TYPE', '$type must be a non-empty string');
      }
      leaves.push({ path: pathSegments, token: node, order: leaves.length });
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (!key.startsWith('$')) visit(value, [...pathSegments, key]);
    }
  }

  visit(document, []);
  return leaves;
}

export function loadTokenSources(root = DEFAULT_ROOT, manifest = TOKEN_SOURCE_MANIFEST) {
  return manifest.map(source => {
    const absolutePath = path.join(root, source.file);
    let document;
    try {
      document = JSON.parse(readFileSync(absolutePath, 'utf8'));
    } catch (error) {
      throw new Error(`${source.file}: failed to load token source: ${error.message}`, { cause: error });
    }
    return { ...source, absolutePath, document };
  });
}

function createGraph() {
  return {
    nodes: [],
    byCssName: new Map(),
    byId: new Map(),
  };
}

function stableId({ category, layer, path: pathSegments, cssName }) {
  const pathId = pathSegments.map(sanitizeSegment).filter(Boolean).join('.');
  return `${category}.${layer ?? 'core'}.${pathId || cssName.replace(/^--/, '').replaceAll('-', '.')}`;
}

function addNode(graph, spec, mode, value, source) {
  const id = spec.id ?? stableId(spec);
  const existing = graph.byCssName.get(spec.cssName);

  if (existing) {
    const sameIdentity =
      existing.id === id &&
      existing.category === spec.category &&
      existing.layer === spec.layer &&
      existing.path.length === spec.path.length &&
      existing.path.every((segment, index) => segment === spec.path[index]);
    if (!sameIdentity) {
      throw sourceError(
        source,
        spec.path,
        'CSS_NAME_COLLISION',
        `${spec.cssName} also identifies ${existing.id}`,
      );
    }
    if (existing.values[mode]) {
      throw sourceError(source, spec.path, 'DUPLICATE_MODE', `${spec.cssName} already defines mode ${mode}`);
    }
    if (existing.sourceType !== spec.sourceType) {
      throw sourceError(source, spec.path, 'MODE_TYPE_MISMATCH', `${spec.cssName} changes source type across modes`);
    }
    existing.values[mode] = value;
    existing.sources[mode] = { file: source.file, path: spec.path };
    existing.extensions[mode] = spec.extensions;
    return existing;
  }

  if (graph.byId.has(id)) {
    throw sourceError(source, spec.path, 'ID_COLLISION', `${id} identifies multiple tokens`);
  }

  const node = {
    id,
    category: spec.category,
    layer: spec.layer,
    path: spec.path,
    cssName: spec.cssName,
    tsName: toCamelCase(spec.cssName),
    sourceType: spec.sourceType,
    publicType: PUBLIC_TYPES[spec.category],
    defaultMode: spec.category === 'colors' ? 'light' : 'default',
    provenance: spec.provenance ?? 'figma',
    section: spec.section,
    order: spec.order ?? 0,
    values: { [mode]: value },
    sources: { [mode]: { file: source.file, path: spec.path } },
    extensions: { [mode]: spec.extensions },
  };

  graph.nodes.push(node);
  graph.byCssName.set(node.cssName, node);
  graph.byId.set(node.id, node);
  return node;
}

function literalValue(raw, cssValue, extra = {}) {
  return {
    kind: 'literal',
    raw,
    cssValue,
    dependencies: extractDependencies(cssValue),
    ...extra,
  };
}

function aliasValue(raw, cssValue, target, extra = {}) {
  return {
    kind: 'alias',
    raw,
    cssValue,
    target,
    dependencies: [target],
    ...extra,
  };
}

function assertExpectedGroups(source) {
  for (const group of source.expectedGroups ?? []) {
    if (!isObject(source.document[group])) {
      throw sourceError(source, [group], 'MISSING_GROUP', `expected token group ${group}`);
    }
  }
  for (const expectedPath of source.expectedPaths ?? []) {
    let value = source.document;
    for (const segment of expectedPath) value = isObject(value) ? value[segment] : undefined;
    if (!isObject(value)) {
      throw sourceError(
        source,
        expectedPath,
        'MISSING_GROUP',
        `expected token group ${formatPath(expectedPath)}`,
      );
    }
  }
}

function normalizeColorSource(graph, source) {
  const leaves = walkTokenLeaves(source.document, source);
  for (const leaf of leaves) {
    if (leaf.token.$type !== 'color') {
      throw sourceError(source, leaf.path, 'UNSUPPORTED_TYPE', `expected color, received ${leaf.token.$type}`);
    }
    if (!leaf.path.length) throw sourceError(source, leaf.path, 'EMPTY_PATH', 'color token path is empty');

    const prefix = source.layer === 'reference' ? 'color-reference' : 'color';
    const cssName = tokenPathToVarName(prefix, leaf.path);
    const aliasData = leaf.token.$extensions?.['com.figma.aliasData'];
    let value;

    try {
      const literalCssValue = tokenToCssColor(leaf.token.$value);
      if (aliasData) {
        if (source.layer === 'reference') {
          throw new Error('reference colors must be literals');
        }
        if (aliasData.targetVariableSetName !== 'colors-reference') {
          throw new Error(`alias target collection must be colors-reference, received ${aliasData.targetVariableSetName}`);
        }
        const target = referenceName(aliasData.targetVariableName);
        if (!target) throw new Error('alias target name is missing or invalid');
        value = aliasValue(leaf.token.$value, `var(${target})`, target, {
          targetCollection: aliasData.targetVariableSetName,
        });
      } else {
        let cssValue = literalCssValue;
        if (source.layer === 'reference') {
          const family = cssName.slice('--color-reference-'.length).split('-')[0];
          const nameValue = parseReferenceOklchFromName(cssName);
          if (!['black', 'white'].includes(family) && !nameValue) {
            throw new Error('chromatic reference name must encode an L lightness segment');
          }
          cssValue = nameValue ?? cssValue;
        }
        value = literalValue(leaf.token.$value, cssValue);
      }
    } catch (error) {
      throw sourceError(source, leaf.path, 'INVALID_COLOR', error.message);
    }

    addNode(
      graph,
      {
        category: 'colors',
        layer: source.layer,
        path: leaf.path,
        cssName,
        sourceType: leaf.token.$type,
        extensions: leaf.token.$extensions,
        order: leaf.order,
      },
      source.mode,
      value,
      source,
    );
  }
}

function normalizeDimensions(graph, source) {
  assertExpectedGroups(source);
  const leaves = walkTokenLeaves(source.document, source);
  const sections = new Map(DIMENSION_SECTIONS.map(section => [section.sourceGroup, section]));
  const bases = new Map();

  for (const leaf of leaves) {
    if (leaf.path.length !== 2) {
      throw sourceError(source, leaf.path, 'UNEXPECTED_TOKEN_BRANCH', 'dimension tokens must be group/token leaves');
    }
    const [group, key] = leaf.path;
    const section = sections.get(group);
    if (!section) {
      throw sourceError(source, leaf.path, 'UNEXPECTED_TOKEN_GROUP', `unsupported dimension group ${group}`);
    }
    if (['space', 'radius', 'size', 'width-stroke'].includes(group) && key === 'base') {
      let value;
      try {
        assertTokenType(leaf.token, DIMENSION_TYPES[group]);
        value = assertFiniteNumber(leaf.token.$value);
        if (value !== BASE_PX) throw new Error(`category base must equal ${BASE_PX}`);
      } catch (error) {
        throw sourceError(source, leaf.path, 'INVALID_DIMENSION', error.message);
      }
      bases.set(group, leaf);
      continue;
    }

    let cssValue;
    try {
      assertTokenType(leaf.token, DIMENSION_TYPES[group]);
      cssValue = section.format(leaf.token, key);
    } catch (error) {
      throw sourceError(source, leaf.path, 'INVALID_DIMENSION', error.message);
    }

    addNode(
      graph,
      {
        category: 'dimensions',
        path: leaf.path,
        cssName: `--dimension-${section.prefix}-${sanitizeSegment(key)}`,
        sourceType: leaf.token.$type,
        extensions: leaf.token.$extensions,
        section: section.id,
        order: leaf.order,
      },
      'default',
      literalValue(leaf.token.$value, cssValue),
      source,
    );
  }

  const firstBase = bases.get('space');
  if (!firstBase || bases.size !== 4) {
    throw sourceError(source, [], 'MISSING_BASE', 'space, radius, size, and width-stroke must define base tokens');
  }

  addNode(
    graph,
    {
      category: 'dimensions',
      path: ['base'],
      cssName: '--dimension-base',
      sourceType: 'number',
      provenance: 'derived',
      section: 'base',
      order: -1,
    },
    'default',
    literalValue(BASE_PX, `${BASE_PX}px`),
    source,
  );

  const baseNames = {
    space: '--dimension-space-base',
    radius: '--dimension-radius-base',
    size: '--dimension-size-base',
    'width-stroke': '--dimension-stroke-width-base',
  };
  Object.entries(baseNames).forEach(([group, cssName], order) => {
    const leaf = bases.get(group);
    addNode(
      graph,
      {
        category: 'dimensions',
        path: leaf.path,
        cssName,
        sourceType: leaf.token.$type,
        extensions: leaf.token.$extensions,
        section: 'base',
        order,
      },
      'default',
      aliasValue(leaf.token.$value, 'var(--dimension-base)', '--dimension-base'),
      source,
    );
  });
}

function normalizeTypography(graph, source) {
  assertExpectedGroups(source);
  const leaves = walkTokenLeaves(source.document, source);
  const sections = new Map(TYPOGRAPHY_SECTIONS.map(section => [section.sourceGroup, section]));

  for (const leaf of leaves) {
    if (leaf.path.length !== 2) {
      throw sourceError(source, leaf.path, 'UNEXPECTED_TOKEN_BRANCH', 'typography tokens must be group/token leaves');
    }
    const [group, key] = leaf.path;
    const section = sections.get(group);
    if (!section) {
      throw sourceError(source, leaf.path, 'UNEXPECTED_TOKEN_GROUP', `unsupported typography group ${group}`);
    }
    const cssName = section.name(key);
    if (!cssName) {
      throw sourceError(source, leaf.path, 'MISSING_MAPPING', `no CSS mapping for ${group}.${key}`);
    }

    let cssValue;
    try {
      assertTokenType(leaf.token, TYPOGRAPHY_TYPES[group]);
      cssValue = section.format(leaf.token, key);
    } catch (error) {
      throw sourceError(source, leaf.path, 'INVALID_TYPOGRAPHY', error.message);
    }

    addNode(
      graph,
      {
        category: 'typography',
        path: leaf.path,
        cssName,
        sourceType: leaf.token.$type,
        extensions: leaf.token.$extensions,
        section: section.id,
        order: leaf.order,
      },
      'default',
      literalValue(leaf.token.$value, cssValue),
      source,
    );
  }
}

function pathStartsWith(pathSegments, prefix) {
  return prefix.every((segment, index) => pathSegments[index] === segment);
}

function normalizeEffects(graph, source, manualEffectTokens) {
  assertExpectedGroups(source);
  const leaves = walkTokenLeaves(source.document, source);

  for (const leaf of leaves) {
    const section = EFFECT_SECTIONS.find(candidate => pathStartsWith(leaf.path, candidate.pathPrefix));
    const expectedLength = section?.pathPrefix.length === 2 ? 3 : 2;
    if (!section || leaf.path.length !== expectedLength) {
      throw sourceError(source, leaf.path, 'UNEXPECTED_TOKEN_GROUP', 'unsupported effects token branch');
    }

    let cssValue;
    try {
      assertTokenType(leaf.token, EFFECT_TYPES[section.id]);
      cssValue = section.format(leaf.token);
    } catch (error) {
      throw sourceError(source, leaf.path, 'INVALID_EFFECT', error.message);
    }

    addNode(
      graph,
      {
        category: 'effects',
        path: leaf.path,
        cssName: section.name(leaf.path),
        sourceType: leaf.token.$type,
        extensions: leaf.token.$extensions,
        section: section.id,
        order: leaf.order,
      },
      'default',
      literalValue(leaf.token.$value, cssValue),
      source,
    );
  }

  if (!manualEffectTokens) return;
  const manualSource = {
    file: 'scripts/lib/manual-effects.mjs',
  };
  for (const [order, token] of manualEffectTokens.entries()) {
    const { cssName, cssValue, path: tokenPath, provenance } = token;
    const dependencies = extractDependencies(cssValue);
    addNode(
      graph,
      {
        category: 'effects',
        path: tokenPath,
        cssName,
        sourceType: 'composite',
        provenance,
        section: 'manual',
        order,
      },
      'default',
      {
        kind: dependencies.length ? 'composite' : 'literal',
        raw: cssValue,
        cssValue,
        dependencies,
      },
      manualSource,
    );
  }
}

export function normalizeTokenSources(
  sources,
  { manualEffectTokens = null, renderManualEffects = null } = {},
) {
  const graph = createGraph();
  graph.renderManualEffects = renderManualEffects;
  for (const source of sources) {
    if (source.category === 'colors') normalizeColorSource(graph, source);
    else if (source.category === 'dimensions') normalizeDimensions(graph, source);
    else if (source.category === 'typography') normalizeTypography(graph, source);
    else if (source.category === 'effects') normalizeEffects(graph, source, manualEffectTokens);
    else throw sourceError(source, [], 'UNKNOWN_CATEGORY', `unsupported category ${source.category}`);
  }
  return graph;
}

function modeSource(node, mode) {
  const source = node.sources[mode] ?? Object.values(node.sources)[0];
  return { file: source.file };
}

export function validateTokenGraph(graph) {
  const tsNames = new Map();
  for (const node of graph.nodes) {
    const existingTsName = tsNames.get(node.tsName);
    if (existingTsName && existingTsName !== node.cssName) {
      throw sourceError(
        modeSource(node, Object.keys(node.values)[0]),
        node.path,
        'TS_NAME_COLLISION',
        `${node.cssName} and ${existingTsName} both map to ${node.tsName}`,
      );
    }
    tsNames.set(node.tsName, node.cssName);

    const requiredModes = node.category === 'colors' && node.layer !== 'reference'
      ? ['light', 'dark']
      : [node.category === 'colors' ? 'light' : 'default'];
    for (const mode of requiredModes) {
      if (!node.values[mode]) {
        throw sourceError(
          modeSource(node, Object.keys(node.values)[0]),
          node.path,
          'MISSING_MODE',
          `${node.cssName} is missing ${mode} mode`,
        );
      }
    }

    if (node.layer === 'reference' && node.values.dark) {
      throw sourceError(
        modeSource(node, 'dark'),
        node.path,
        'REFERENCE_MODE',
        'reference colors must remain mode-independent',
      );
    }

    for (const [mode, value] of Object.entries(node.values)) {
      for (const dependency of value.dependencies) {
        const target = graph.byCssName.get(dependency);
        if (!target) {
          throw sourceError(
            modeSource(node, mode),
            node.path,
            'MISSING_DEPENDENCY',
            `${node.cssName} references missing token ${dependency}`,
          );
        }
        if (value.kind === 'alias' && value.targetCollection === 'colors-reference' && target.layer !== 'reference') {
          throw sourceError(
            modeSource(node, mode),
            node.path,
            'INVALID_ALIAS_LAYER',
            `${node.cssName} must alias a reference color`,
          );
        }
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (node, chain) => {
    if (visiting.has(node.cssName)) {
      throw sourceError(
        modeSource(node, Object.keys(node.values)[0]),
        node.path,
        'DEPENDENCY_CYCLE',
        `token dependency cycle: ${[...chain, node.cssName].join(' -> ')}`,
      );
    }
    if (visited.has(node.cssName)) return;
    visiting.add(node.cssName);
    for (const value of Object.values(node.values)) {
      for (const dependency of value.dependencies) {
        visit(graph.byCssName.get(dependency), [...chain, node.cssName]);
      }
    }
    visiting.delete(node.cssName);
    visited.add(node.cssName);
  };
  for (const node of graph.nodes) visit(node, []);

  return graph;
}

const byOrder = (left, right) => left.order - right.order;
const compareText = (left, right) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

function nodesForSection(graph, category, section) {
  return graph.nodes
    .filter(node => node.category === category && node.section === section)
    .sort(byOrder);
}

function orderedCategoryNodes(graph, category, mode = 'default') {
  if (category === 'colors') {
    const layers = mode === 'dark' ? ['semantic', 'data'] : ['reference', 'semantic', 'data'];
    return layers.flatMap(layer =>
      graph.nodes
        .filter(node => node.category === 'colors' && node.layer === layer && node.values[mode === 'default' ? 'light' : mode])
        .sort((left, right) => compareText(
          `${left.cssName}: ${left.values[mode === 'default' ? 'light' : mode].cssValue};`,
          `${right.cssName}: ${right.values[mode === 'default' ? 'light' : mode].cssValue};`,
        )),
    );
  }
  if (category === 'dimensions') {
    return [
      ...nodesForSection(graph, category, 'base'),
      ...DIMENSION_SECTIONS.flatMap(section => nodesForSection(graph, category, section.id)),
    ];
  }
  if (category === 'typography') {
    return TYPOGRAPHY_SECTIONS.flatMap(section => nodesForSection(graph, category, section.id));
  }
  if (category === 'effects') {
    return [
      ...EFFECT_SECTIONS.flatMap(section => nodesForSection(graph, category, section.id)),
      ...nodesForSection(graph, category, 'manual'),
    ];
  }
  return [];
}

function renderColorsCss(graph) {
  const lightLines = orderedCategoryNodes(graph, 'colors', 'light')
    .map(node => `  ${node.cssName}: ${node.values.light.cssValue};`);
  const darkLines = orderedCategoryNodes(graph, 'colors', 'dark')
    .map(node => `  ${node.cssName}: ${node.values.dark.cssValue};`);
  return [
    '/* AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. */',
    '/* Generated by scripts/generate-color-tokens.mjs from token JSON sources in tokens/colors. */',
    '',
    ':root {',
    ...lightLines,
    '}',
    '',
    ':root[data-theme="dark"] {',
    ...darkLines,
    '}',
    '',
  ].join('\n');
}

function renderDimensionsCss(graph) {
  const byNameMap = graph.byCssName;
  const lines = [
    '  /* Base — shared 8px default; override a category base independently when needed */',
    `  --dimension-base:              ${byNameMap.get('--dimension-base').values.default.cssValue};`,
    `  --dimension-space-base:        ${byNameMap.get('--dimension-space-base').values.default.cssValue};`,
    `  --dimension-radius-base:       ${byNameMap.get('--dimension-radius-base').values.default.cssValue};`,
    `  --dimension-size-base:         ${byNameMap.get('--dimension-size-base').values.default.cssValue};`,
    `  --dimension-stroke-width-base: ${byNameMap.get('--dimension-stroke-width-base').values.default.cssValue};`,
    '',
  ];

  for (const section of DIMENSION_SECTIONS) {
    lines.push(`  /* ${section.comment} */`);
    for (const node of nodesForSection(graph, 'dimensions', section.id)) {
      lines.push(`  ${node.cssName}: ${node.values.default.cssValue};`);
    }
    lines.push('');
  }

  return [
    '/* AUTO-GENERATED. See scripts/generate-dimension-tokens.mjs */',
    '/* Source: src/json/dimensions/dimensions.tokens.json        */',
    '',
    ':root {',
    ...lines,
    '}',
    '',
  ].join('\n');
}

function renderTypographyCss(graph) {
  const lines = [];
  for (const [index, section] of TYPOGRAPHY_SECTIONS.entries()) {
    lines.push(`  /* ${section.comment} */`);
    for (const node of nodesForSection(graph, 'typography', section.id)) {
      lines.push(`  ${node.cssName}: ${node.values.default.cssValue};`);
    }
    if (index < TYPOGRAPHY_SECTIONS.length - 1) lines.push('');
  }
  return [
    '/* AUTO-GENERATED. See scripts/generate-typography-tokens.mjs */',
    '/* Source: src/json/typography/typography.tokens.json          */',
    '',
    ':root {',
    ...lines,
    '}',
    '',
  ].join('\n');
}

function renderEffectsCss(graph) {
  const lines = [];
  for (const [index, section] of EFFECT_SECTIONS.entries()) {
    lines.push(`  /* ${section.comment} */`);
    for (const node of nodesForSection(graph, 'effects', section.id)) {
      lines.push(`  ${node.cssName}: ${node.values.default.cssValue};`);
    }
    if (index < EFFECT_SECTIONS.length - 1) lines.push('');
  }
  const manualCss = graph.renderManualEffects
    ? graph.renderManualEffects(cssName => graph.byCssName.get(cssName).values.default.cssValue)
    : '';
  return [
    '/* AUTO-GENERATED + HAND-AUTHORED. See scripts/generate-effects-tokens.mjs */',
    '/* Generated section: from src/json/effects/effects.tokens.json            */',
    '',
    ':root {',
    ...lines,
    manualCss,
    '}',
    '',
  ].join('\n');
}

function publicToken(node, mode) {
  return {
    $type: node.publicType,
    $value: node.values[mode].cssValue,
  };
}

function emitJsonArtifacts(graph) {
  const artifacts = new Map();
  const categoryTokens = {};

  for (const category of ['colors', 'dimensions', 'typography', 'effects']) {
    if (category === 'colors') {
      const light = {};
      const dark = {};
      for (const node of orderedCategoryNodes(graph, category, 'light')) {
        const token = publicToken(node, 'light');
        if (node.values.dark) {
          const darkToken = publicToken(node, 'dark');
          token.$extensions = {
            'ds-mo': {
              modes: {
                light: token.$value,
                dark: darkToken.$value,
              },
            },
          };
          dark[node.cssName] = darkToken;
        }
        light[node.cssName] = token;
      }
      categoryTokens.colors = light;
      artifacts.set('json/colors.json', JSON.stringify(light, null, 2));
      artifacts.set('json/colors.modes.json', JSON.stringify({ light, dark }, null, 2));
      continue;
    }

    const tokens = {};
    for (const node of orderedCategoryNodes(graph, category)) {
      tokens[node.cssName] = publicToken(node, 'default');
    }
    categoryTokens[category] = tokens;
    artifacts.set(`json/${category}.json`, JSON.stringify(tokens, null, 2));
  }

  const allTokens = {};
  for (const category of ['colors', 'dimensions', 'typography', 'effects']) {
    Object.assign(allTokens, categoryTokens[category]);
  }
  artifacts.set('tokens.json', JSON.stringify(allTokens, null, 2));

  const indexGroups = {};
  for (const category of ['colors', 'dimensions', 'typography', 'effects']) {
    for (const node of orderedCategoryNodes(graph, category, category === 'colors' ? 'light' : 'default')) {
      const keyPath = category === 'colors' ? ['colors', node.layer] : [category];
      let target = indexGroups;
      for (const key of keyPath.slice(0, -1)) {
        target[key] ??= {};
        target = target[key];
      }
      const leaf = keyPath.at(-1);
      target[leaf] ??= {};
      target[leaf][node.cssName] = categoryTokens[category][node.cssName];
    }
  }

  const tokensIndex = {
    _meta: {
      description: 'Tokens grouped by category and subcategory. Single Read, no grep needed.',
      categories: Object.keys(indexGroups).sort(),
    },
    ...indexGroups,
  };
  artifacts.set('tokens-index.json', JSON.stringify(tokensIndex, null, 2));
  return artifacts;
}

function emitTypeScriptArtifacts(graph) {
  const names = [...graph.nodes].map(node => node.cssName).sort();
  const artifacts = new Map();
  artifacts.set(
    'index.mjs',
    `${names.map(name => `export const ${toCamelCase(name)} = '${name}';`).join('\n')}\n`,
  );
  artifacts.set(
    'index.cjs',
    `${names.map(name => `exports.${toCamelCase(name)} = '${name}';`).join('\n')}\n`,
  );
  artifacts.set(
    'index.d.ts',
    `${names.map(name => `export declare const ${toCamelCase(name)}: '${name}';`).join('\n')}\n`,
  );
  return artifacts;
}

export function compileTokenArtifacts(graph) {
  const css = {
    colors: renderColorsCss(graph),
    dimensions: renderDimensionsCss(graph),
    typography: renderTypographyCss(graph),
    effects: renderEffectsCss(graph),
  };
  const artifacts = new Map([
    ...emitJsonArtifacts(graph),
    ...emitTypeScriptArtifacts(graph),
  ]);
  return { css, artifacts };
}

export async function compileTokenProject({
  root = DEFAULT_ROOT,
  manifest = TOKEN_SOURCE_MANIFEST,
  includeManualEffects = true,
} = {}) {
  const sources = loadTokenSources(root, manifest);
  let manualEffectTokens = null;
  let renderManualEffects = null;
  if (includeManualEffects) {
    const manualModuleUrl = new URL('./manual-effects.mjs', import.meta.url);
    manualModuleUrl.searchParams.set(
      'version',
      String(statSync(fileURLToPath(manualModuleUrl)).mtimeMs),
    );
    const manualEffects = await import(manualModuleUrl);
    manualEffectTokens = manualEffects.MANUAL_EFFECT_TOKENS;
    renderManualEffects = manualEffects.renderManualEffectsCss;
  }
  const graph = normalizeTokenSources(sources, { manualEffectTokens, renderManualEffects });
  validateTokenGraph(graph);
  return {
    root,
    sources,
    graph,
    ...compileTokenArtifacts(graph),
  };
}

export function writeCategoryCss(compilation, category, outputPath) {
  writeFileSync(outputPath, compilation.css[category], 'utf8');
}

export function writeDistArtifacts(compilation, distDir, filter = () => true) {
  for (const [relativePath, contents] of compilation.artifacts) {
    if (!filter(relativePath)) continue;
    const outputPath = path.join(distDir, relativePath);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, contents, 'utf8');
  }
}
