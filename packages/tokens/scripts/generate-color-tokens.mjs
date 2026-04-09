import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SOURCES = {
  semanticLight: path.join(ROOT_DIR, 'src/json/colors/semantic/light.tokens.json'),
  semanticDark: path.join(ROOT_DIR, 'src/json/colors/semantic/dark.tokens.json'),
  referenceHex: path.join(ROOT_DIR, 'src/json/colors/reference/hex.tokens.json'),
  dataLight: path.join(ROOT_DIR, 'src/json/colors/data/light.tokens.json'),
  dataDark: path.join(ROOT_DIR, 'src/json/colors/data/dark.tokens.json'),
};

const OUTPUT_FILE = path.join(ROOT_DIR, 'src/colors.css');

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeSegment = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const tokenToCssColor = (tokenValue) => {
  const alpha = typeof tokenValue.alpha === 'number' ? tokenValue.alpha : 1;
  const components = Array.isArray(tokenValue.components) ? tokenValue.components : null;
  const hex = typeof tokenValue.hex === 'string' ? tokenValue.hex : null;

  if (components && components.length >= 3) {
    const [r, g, b] = components;
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);

    if (alpha < 0.9999) {
      return `rgb(${red} ${green} ${blue} / ${alpha.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')})`;
    }

    return `rgb(${red} ${green} ${blue})`;
  }

  if (hex) {
    return hex.toUpperCase();
  }

  throw new Error('Token does not contain color components or hex.');
};

const asReferenceVariableName = (targetVariableName) => {
  if (!targetVariableName || typeof targetVariableName !== 'string') {
    return null;
  }

  const segments = targetVariableName
    .split('/')
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return `--color-reference-${segments.join('-')}`;
};

const collectTokens = (node, pathSegments = [], accumulator = []) => {
  if (!isObject(node)) {
    return accumulator;
  }

  if (node.$type === 'color' && isObject(node.$value)) {
    accumulator.push({
      path: pathSegments,
      token: node,
    });

    return accumulator;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue;
    }

    collectTokens(value, [...pathSegments, key], accumulator);
  }

  return accumulator;
};

const tokenPathToVarName = (prefix, pathSegments) => {
  const tail = pathSegments.map((segment) => sanitizeSegment(segment)).filter(Boolean).join('-');

  if (!tail) {
    throw new Error('Token path resolved to an empty CSS variable name.');
  }

  return `--${prefix}-${tail}`;
};

const formatOklchNumber = (value) => {
  const normalized = Number(value.toFixed(4));
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }

  return String(normalized);
};

const parseReferenceOklchFromName = (referenceVarName) => {
  if (!referenceVarName.startsWith('--color-reference-')) {
    return null;
  }

  const shortName = referenceVarName.slice('--color-reference-'.length);
  const segments = shortName.split('-').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const family = segments[0];
  if (family === 'black' || family === 'white') {
    return null;
  }

  const lightnessIndex = segments.findIndex((segment) => /^l\d+$/.test(segment));
  if (lightnessIndex < 0) {
    return null;
  }

  const lightness = Number.parseInt(segments[lightnessIndex].slice(1), 10);
  if (!Number.isFinite(lightness)) {
    return null;
  }

  const chromaSegment = segments.find((segment) => /^c\d+$/.test(segment));
  const chroma = chromaSegment
    ? Number.parseInt(chromaSegment.slice(1), 10) / 100
    : 0;

  let hue = 0;
  for (let i = lightnessIndex - 1; i >= 0; i -= 1) {
    if (/^\d+$/.test(segments[i])) {
      hue = Number.parseInt(segments[i], 10);
      break;
    }
  }

  return `oklch(${lightness}% ${formatOklchNumber(chroma)} ${formatOklchNumber(hue)})`;
};

const buildReferenceDeclarations = (json) => {
  const declarations = [];
  const collisions = new Set();

  for (const entry of collectTokens(json)) {
    const name = tokenPathToVarName('color-reference', entry.path);
    if (collisions.has(name)) {
      throw new Error(`Reference token collision for ${name}`);
    }

    collisions.add(name);

    const parsedOklch = parseReferenceOklchFromName(name);
    declarations.push(`${name}: ${parsedOklch ?? tokenToCssColor(entry.token.$value)};`);
  }

  return declarations.sort();
};

const buildSemanticDeclarations = (json, prefix = 'color') => {
  const declarations = [];
  const collisions = new Set();

  for (const entry of collectTokens(json)) {
    const name = tokenPathToVarName(prefix, entry.path);
    if (collisions.has(name)) {
      throw new Error(`Semantic token collision for ${name}`);
    }

    collisions.add(name);

    const aliasName = asReferenceVariableName(
      entry.token.$extensions?.['com.figma.aliasData']?.targetVariableName
    );

    if (aliasName) {
      declarations.push(`${name}: var(${aliasName});`);
      continue;
    }

    declarations.push(`${name}: ${tokenToCssColor(entry.token.$value)};`);
  }

  return declarations.sort();
};

const buildDataDeclarations = (json) => {
  const declarations = [];
  const collisions = new Set();

  for (const entry of collectTokens(json)) {
    const name = tokenPathToVarName('color', entry.path);
    if (collisions.has(name)) {
      throw new Error(`Data token collision for ${name}`);
    }

    collisions.add(name);

    const aliasName = asReferenceVariableName(
      entry.token.$extensions?.['com.figma.aliasData']?.targetVariableName
    );

    if (aliasName) {
      declarations.push(`${name}: var(${aliasName});`);
      continue;
    }

    declarations.push(`${name}: ${tokenToCssColor(entry.token.$value)};`);
  }

  return declarations.sort();
};

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

const generate = () => {
  const semanticLight = readJson(SOURCES.semanticLight);
  const semanticDark = readJson(SOURCES.semanticDark);
  const referenceHex = readJson(SOURCES.referenceHex);
  const dataLight = readJson(SOURCES.dataLight);
  const dataDark = readJson(SOURCES.dataDark);

  const referenceDeclarations = buildReferenceDeclarations(referenceHex);
  const semanticLightDeclarations = buildSemanticDeclarations(semanticLight);
  const semanticDarkDeclarations = buildSemanticDeclarations(semanticDark);
  const dataLightDeclarations = buildDataDeclarations(dataLight);
  const dataDarkDeclarations = buildDataDeclarations(dataDark);

  const output = [
    '/* AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. */',
    '/* Generated by scripts/generate-color-tokens.mjs from token JSON sources in tokens/colors. */',
    '',
    ':root {',
    ...referenceDeclarations.map((line) => `  ${line}`),
    ...semanticLightDeclarations.map((line) => `  ${line}`),
    ...dataLightDeclarations.map((line) => `  ${line}`),
    '}',
    '',
    ':root[data-theme="dark"] {',
    ...semanticDarkDeclarations.map((line) => `  ${line}`),
    ...dataDarkDeclarations.map((line) => `  ${line}`),
    '}',
    '',
  ].join('\n');

  writeFileSync(OUTPUT_FILE, output, 'utf8');

  const summary = [
    `reference=${referenceDeclarations.length}`,
    `semanticLight=${semanticLightDeclarations.length}`,
    `semanticDark=${semanticDarkDeclarations.length}`,
    `dataLight=${dataLightDeclarations.length}`,
    `dataDark=${dataDarkDeclarations.length}`,
  ].join(' ');

  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)} (${summary})`);
};

generate();
