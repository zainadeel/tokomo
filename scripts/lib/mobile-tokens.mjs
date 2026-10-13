import { createHash } from 'node:crypto';

// Native consumers read the authored Figma JSON, including units, aliases and
// metadata. Never derive this bundle from the web graph's CSS-formatted values.
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const entries = object => Object.entries(object).filter(([key]) => !key.startsWith('$'));
const SCALE_GROUPS = new Set(['space', 'radius', 'size', 'width-stroke']);
const STYLE_PROPERTIES = {
  fontSize: 'font-size',
  fontWeight: 'weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
};

function fail(source, location, message) {
  throw new Error(`${source.file}: ${location}: ${message}`);
}

function validatePrimitives(source) {
  const typography = source.category === 'typography';
  for (const [groupName, group] of entries(source.document)) {
    if (!source.expectedGroups.includes(groupName) || !isObject(group)) {
      fail(source, groupName, 'unsupported mobile token group');
    }
    const tokens = entries(group);
    if (!tokens.length) fail(source, groupName, 'mobile token group must not be empty');
    for (const [key, token] of tokens) {
      const location = `${groupName}.${key}`;
      if (!isObject(token)) fail(source, location, 'expected a token object');
      const value = token.$value;
      const isString = typography ? groupName === 'font-family' : groupName === 'height-sheet';
      if (token.$type !== (isString ? 'string' : 'number')) {
        fail(source, location, `expected $type ${isString ? 'string' : 'number'}`);
      }
      if (isString ? typeof value !== 'string' || !value.trim() : !isNumber(value)) {
        fail(source, location, 'invalid primitive value');
      }
      if (entries(token).length) fail(source, location, 'unexpected children inside a token');
      if (!typography && groupName === 'height-sheet') {
        if (!/^\d+(?:\.\d+)?%$/.test(value) || parseFloat(value) > 100) {
          fail(source, location, 'sheet height must be a percentage between 0% and 100%');
        }
      }
      if (!typography && SCALE_GROUPS.has(groupName) && key === 'base' && value <= 0) {
        fail(source, location, 'scale base must be positive');
      }
      // Match the mobile generator's grid tolerance while preserving exact
      // Figma numbers. radius.half is a sentinel, not a grid multiplier.
      if (!typography && SCALE_GROUPS.has(groupName) && /^n?\d+$/.test(key) && group.base) {
        const base = group.base.$value;
        if (!isNumber(base) || base <= 0) fail(source, groupName, 'invalid scale base');
        const multiplier = Number(key.replace(/^n/, '-')) / 100;
        if (Math.abs(value - multiplier * base) > 0.25) {
          fail(source, location, 'value disagrees with its scale key and base');
        }
      }
    }
  }
}

function validateStyles(source, primitives) {
  if (!isObject(source.document)) fail(source, 'root', 'expected a text-style object');
  const categories = new Set();
  const allowedFields = new Set(['fontFamily', 'textCase', 'textDecoration', ...Object.keys(STYLE_PROPERTIES)]);
  for (const [name, style] of entries(source.document)) {
    if (!/^mobile\/[a-z0-9-]+\/[a-z0-9-]+$/.test(name) || !isObject(style)) {
      fail(source, name, 'expected a mobile/category/variant text style');
    }
    categories.add(name.split('/')[1]);
    for (const key of Object.keys(style)) {
      if (!key.startsWith('$') && !allowedFields.has(key)) fail(source, `${name}.${key}`, 'unsupported text-style field');
    }
    const family = primitives['font-family']?.ui?.$value;
    if (typeof style.fontFamily !== 'string' || style.fontFamily.toLowerCase() !== family?.toLowerCase()) {
      fail(source, name, 'fontFamily must match the mobile UI font primitive');
    }
    for (const [property, group] of Object.entries(STYLE_PROPERTIES)) {
      const field = style[property];
      const parts = typeof field?.variable === 'string' ? field.variable.split('/') : [];
      if (!isObject(field) || !isNumber(field.value) || parts.length !== 3 ||
          parts[0] !== 'typography-mobile' || parts[1] !== group) {
        fail(source, `${name}.${property}`, `expected a numeric value and typography-mobile/${group}/key reference`);
      }
      const primitive = primitives[group]?.[parts[2]];
      if (!primitive || primitive.$type !== 'number' || !isNumber(primitive.$value)) {
        fail(source, `${name}.${property}`, `missing numeric primitive ${field.variable}`);
      }
      // Figma primitive exports retain float precision; style exports round it.
      if (Math.abs(field.value - primitive.$value) > 0.001) {
        fail(source, `${name}.${property}`, `value disagrees with ${field.variable}`);
      }
    }
    for (const property of ['textCase', 'textDecoration']) {
      if (style[property] !== 'none') {
        fail(source, `${name}.${property}`, 'the native text-style generators currently support none');
      }
    }
  }
  for (const category of ['display', 'title', 'body', 'caption']) {
    if (!categories.has(category)) fail(source, category, 'missing required mobile text-style category');
  }
}

function validateNativeSharedValues(source) {
  for (const { path, token } of source.leaves) {
    const location = path.join('.');
    const value = token.$value;
    if (source.category === 'colors') {
      if (!isObject(value) || value.colorSpace !== 'srgb' ||
          !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value.hex) ||
          !isNumber(value.alpha) || value.alpha < 0 || value.alpha > 1 ||
          !Array.isArray(value.components) || value.components.length !== 3 ||
          !value.components.every(component => isNumber(component) && component >= 0 && component <= 1)) {
        fail(source, location, 'native colors require sRGB components, hex and alpha');
      }
    } else if (source.category === 'effects') {
      if (path[0] === 'animation' && ['duration', 'delay'].includes(path[1]) &&
          (token.$type !== 'duration' || !isObject(value) || !isNumber(value.value) ||
           value.value < 0 || !['ms', 's'].includes(value.unit))) {
        fail(source, location, 'native durations require a duration object with value and ms/s unit');
      }
    } else {
      fail(source, location, 'unsupported shared mobile category');
    }
  }
}

export function compileMobileArtifacts(sources, pkg) {
  const artifacts = new Map();
  const files = [];
  const primitiveSource = sources.find(source => source.platform === 'mobile' &&
    source.category === 'typography' && source.format !== 'text-styles');
  if (!primitiveSource) throw new Error('Mobile bundle requires mobile typography primitives');

  for (const source of sources) {
    if (!['shared', 'mobile'].includes(source.platform)) {
      fail(source, 'platform', 'web sources cannot enter the mobile bundle');
    }
    if (source.platform === 'shared') validateNativeSharedValues(source);
    else if (source.format === 'text-styles') validateStyles(source, primitiveSource.document);
    else validatePrimitives(source);

    const output = source.mobileOutput;
    if (!/^tokens\/(?:[a-z0-9-]+\/)+[a-z0-9.-]+\.json$/.test(output) ||
        artifacts.has(`mobile/${output}`)) {
      fail(source, 'mobileOutput', 'invalid or duplicate bundle path');
    }
    // Preserve source bytes from the same read that was parsed and validated.
    artifacts.set(`mobile/${output}`, source.contents);
    files.push({
      path: output,
      source: source.file,
      platform: source.platform,
      category: source.category,
      mode: source.mode,
      format: source.format ?? 'figma-variables',
      sha256: createHash('sha256').update(source.contents).digest('hex'),
    });
  }

  artifacts.set('mobile/manifest.json', `${JSON.stringify({
    schemaVersion: 1,
    package: pkg.name,
    version: pkg.version,
    platform: 'mobile',
    files,
  }, null, 2)}\n`);
  return artifacts;
}
