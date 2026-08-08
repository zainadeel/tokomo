#!/usr/bin/env node

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'src/agent/token-families.agent.json');
const SCHEMA_PATH = path.join(ROOT, 'agent/schemas/token-agent.schema.json');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
const tokens = JSON.parse(readFileSync(path.join(ROOT, 'dist/tokens.json'), 'utf8'));
const tokenNames = Object.keys(tokens);

const STATUSES = new Set(['experimental', 'stable', 'deprecated', 'removed']);
const CATEGORIES = new Set(['color', 'dimension', 'typography', 'effect']);
const AUDIENCES = new Set(['general', 'specialized', 'foundation']);
const SELECTION_ROLES = new Set(['direct', 'recipe-part', 'last-resort']);
const FAMILY_FIELDS = new Set([
  'id', 'kind', 'category', 'audience', 'status', 'summary', 'tokenPatterns',
  'selectionRole', 'useWhen', 'avoidWhen', 'constraints', 'recipes',
  'accessibility', 'references',
]);
const RECIPE_FIELDS = new Set([
  'id', 'kind', 'status', 'summary', 'useWhen', 'avoidWhen', 'tokenRoles',
  'compositionRules', 'variants', 'stateOwnership', 'accessibility', 'examples',
  'references',
]);

function fail(message) {
  throw new Error(`Invalid token guidance: ${message}`);
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function patternRegex(pattern) {
  return new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
}

function matchesPattern(name, pattern) {
  return patternRegex(pattern).test(name);
}

function assertString(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string.`);
}

function assertStringList(value, label, { optional = false } = {}) {
  if (optional && value == null) return;
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array.`);
  for (const [index, item] of value.entries()) assertString(item, `${label}[${index}]`);
  if (new Set(value).size !== value.length) fail(`${label} contains duplicate values.`);
}

function assertKnownFields(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} has unknown field ${key}.`);
  }
}

function assertReferences(references, label) {
  if (references == null) return;
  if (!Array.isArray(references)) fail(`${label} must be an array.`);
  for (const [index, reference] of references.entries()) {
    const prefix = `${label}[${index}]`;
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) fail(`${prefix} must be an object.`);
    assertKnownFields(reference, new Set(['label', 'path']), prefix);
    assertString(reference.label, `${prefix}.label`);
    assertString(reference.path, `${prefix}.path`);
  }
}

function assertPatterns(patterns, label) {
  assertStringList(patterns, label);
  for (const pattern of patterns) {
    if (!pattern.startsWith('--')) fail(`${label} contains a non-token pattern: ${pattern}.`);
    if (!tokenNames.some(name => matchesPattern(name, pattern))) {
      fail(`${label} pattern matches no published token: ${pattern}.`);
    }
  }
}

function assertUniqueId(value, prefix, ids, label) {
  assertString(value, label);
  if (!value.startsWith(prefix)) fail(`${label} must start with ${prefix}.`);
  if (ids.has(value)) fail(`duplicate id ${value}.`);
  ids.add(value);
}

function validateEnvelope() {
  const allowed = new Set(['$schema', 'schemaVersion', 'kind', 'principles', 'intents', 'families', 'recipes']);
  assertKnownFields(source, allowed, 'manifest');
  if (source.schemaVersion !== '2.0.0') fail('schemaVersion must be 2.0.0.');
  if (source.kind !== 'tokens') fail('kind must be tokens.');
  for (const field of ['principles', 'intents', 'families', 'recipes']) {
    if (!Array.isArray(source[field]) || source[field].length === 0) fail(`${field} must be a non-empty array.`);
  }
}

function validatePrinciples(ids) {
  for (const principle of source.principles) {
    assertKnownFields(principle, new Set(['id', 'summary']), principle.id ?? 'principle');
    assertUniqueId(principle.id, 'principle:', ids, 'principle.id');
    assertString(principle.summary, `${principle.id}.summary`);
  }
}

function validateIntents(ids) {
  const expected = new Set(['neutral', 'brand', 'ai', 'negative', 'warning', 'caution', 'positive', 'guide', 'walkthrough']);
  for (const intent of source.intents) {
    assertKnownFields(intent, new Set(['id', 'status', 'optional', 'summary', 'useWhen', 'avoidWhen', 'precedence']), intent.id ?? 'intent');
    assertUniqueId(intent.id, 'intent:', ids, 'intent.id');
    if (!STATUSES.has(intent.status)) fail(`${intent.id}.status is invalid.`);
    if (typeof intent.optional !== 'boolean') fail(`${intent.id}.optional must be boolean.`);
    assertString(intent.summary, `${intent.id}.summary`);
    assertStringList(intent.useWhen, `${intent.id}.useWhen`);
    assertStringList(intent.avoidWhen, `${intent.id}.avoidWhen`);
    assertStringList(intent.precedence, `${intent.id}.precedence`, { optional: true });
    expected.delete(intent.id.slice('intent:'.length));
  }
  if (expected.size) fail(`missing core intents: ${[...expected].join(', ')}.`);
  if (source.intents.length !== 9) fail('the core intent set must contain exactly nine entries.');
}

function validateFamilies(ids, recipeIds) {
  for (const family of source.families) {
    assertKnownFields(family, FAMILY_FIELDS, family.id ?? 'token family');
    assertUniqueId(family.id, 'token-family:', ids, 'family.id');
    if (family.kind !== 'token-family') fail(`${family.id}.kind must be token-family.`);
    if (!CATEGORIES.has(family.category)) fail(`${family.id}.category is invalid.`);
    if (!AUDIENCES.has(family.audience)) fail(`${family.id}.audience is invalid.`);
    if (!STATUSES.has(family.status)) fail(`${family.id}.status is invalid.`);
    if (!SELECTION_ROLES.has(family.selectionRole)) fail(`${family.id}.selectionRole is invalid.`);
    assertString(family.summary, `${family.id}.summary`);
    assertPatterns(family.tokenPatterns, `${family.id}.tokenPatterns`);
    assertStringList(family.useWhen, `${family.id}.useWhen`);
    assertStringList(family.avoidWhen, `${family.id}.avoidWhen`);
    assertStringList(family.constraints, `${family.id}.constraints`);
    assertStringList(family.accessibility, `${family.id}.accessibility`, { optional: true });
    assertReferences(family.references, `${family.id}.references`);
    if (family.recipes != null) {
      assertStringList(family.recipes, `${family.id}.recipes`);
      for (const recipeId of family.recipes) {
        if (!recipeIds.has(recipeId)) fail(`${family.id} references unknown recipe ${recipeId}.`);
      }
    }
  }

  const uncovered = tokenNames.filter(name => !source.families.some(family =>
    family.tokenPatterns.some(pattern => matchesPattern(name, pattern))
  ));
  if (uncovered.length) fail(`published tokens have no family guidance:\n  ${uncovered.join('\n  ')}`);
}

function validateRecipe(recipe, ids) {
  assertKnownFields(recipe, RECIPE_FIELDS, recipe.id ?? 'token recipe');
  assertUniqueId(recipe.id, 'token-recipe:', ids, 'recipe.id');
  if (recipe.kind !== 'token-recipe') fail(`${recipe.id}.kind must be token-recipe.`);
  if (!STATUSES.has(recipe.status)) fail(`${recipe.id}.status is invalid.`);
  assertString(recipe.summary, `${recipe.id}.summary`);
  assertStringList(recipe.useWhen, `${recipe.id}.useWhen`);
  assertStringList(recipe.avoidWhen, `${recipe.id}.avoidWhen`);
  assertStringList(recipe.compositionRules, `${recipe.id}.compositionRules`);
  assertStringList(recipe.stateOwnership, `${recipe.id}.stateOwnership`, { optional: true });
  assertStringList(recipe.accessibility, `${recipe.id}.accessibility`, { optional: true });
  assertReferences(recipe.references, `${recipe.id}.references`);

  if (!Array.isArray(recipe.tokenRoles) || recipe.tokenRoles.length === 0) fail(`${recipe.id}.tokenRoles must be non-empty.`);
  const roleIds = new Set();
  for (const role of recipe.tokenRoles) {
    assertKnownFields(role, new Set(['id', 'summary', 'tokenPatterns', 'literal', 'required']), `${recipe.id}.tokenRole`);
    assertString(role.id, `${recipe.id}.tokenRole.id`);
    if (roleIds.has(role.id)) fail(`${recipe.id} has duplicate token role ${role.id}.`);
    roleIds.add(role.id);
    assertString(role.summary, `${recipe.id}.${role.id}.summary`);
    if (role.literal != null && typeof role.literal !== 'boolean') fail(`${recipe.id}.${role.id}.literal must be boolean.`);
    if (role.literal === true) {
      if (role.tokenPatterns != null) fail(`${recipe.id}.${role.id} is literal and must not declare tokenPatterns.`);
    } else {
      assertPatterns(role.tokenPatterns, `${recipe.id}.${role.id}.tokenPatterns`);
    }
    if (typeof role.required !== 'boolean') fail(`${recipe.id}.${role.id}.required must be boolean.`);
  }

  if (!Array.isArray(recipe.variants) || recipe.variants.length === 0) fail(`${recipe.id}.variants must be non-empty.`);
  const variantIds = new Set();
  for (const variant of recipe.variants) {
    assertKnownFields(variant, new Set(['id', 'label', 'modifier', 'when', 'assignments', 'notes']), `${recipe.id}.variant`);
    assertString(variant.id, `${recipe.id}.variant.id`);
    if (variantIds.has(variant.id)) fail(`${recipe.id} has duplicate variant ${variant.id}.`);
    variantIds.add(variant.id);
    assertString(variant.label, `${recipe.id}.${variant.id}.label`);
    if (variant.modifier != null) assertString(variant.modifier, `${recipe.id}.${variant.id}.modifier`);
    if (variant.when != null) assertString(variant.when, `${recipe.id}.${variant.id}.when`);
    assertStringList(variant.notes, `${recipe.id}.${variant.id}.notes`, { optional: true });
    if (!Array.isArray(variant.assignments) || variant.assignments.length === 0) fail(`${recipe.id}.${variant.id}.assignments must be non-empty.`);
    for (const [index, assignment] of variant.assignments.entries()) {
      const label = `${recipe.id}.${variant.id}.assignments[${index}]`;
      assertKnownFields(assignment, new Set(['role', 'property', 'token', 'tokenPattern', 'value']), label);
      if (!roleIds.has(assignment.role)) fail(`${label} references unknown role ${assignment.role}.`);
      assertString(assignment.property, `${label}.property`);
      const selectors = ['token', 'tokenPattern', 'value'].filter(field => assignment[field] != null);
      if (selectors.length !== 1) fail(`${label} must define exactly one of token, tokenPattern, or value.`);
      if (assignment.token != null && !tokens[assignment.token]) fail(`${label} references missing token ${assignment.token}.`);
      if (assignment.tokenPattern != null) assertPatterns([assignment.tokenPattern], `${label}.tokenPattern`);
      if (assignment.value != null) assertString(assignment.value, `${label}.value`);
    }
  }

  if (recipe.examples != null) {
    if (!Array.isArray(recipe.examples)) fail(`${recipe.id}.examples must be an array.`);
    for (const [index, example] of recipe.examples.entries()) {
      assertKnownFields(example, new Set(['language', 'content']), `${recipe.id}.examples[${index}]`);
      if (!['css', 'html', 'json'].includes(example.language)) fail(`${recipe.id}.examples[${index}].language is invalid.`);
      assertString(example.content, `${recipe.id}.examples[${index}].content`);
    }
  }
}

function validateTypographyRecipe(recipe) {
  const baseIds = [
    'text-display-medium', 'text-display-small', 'text-title-large', 'text-title-medium',
    'text-title-small', 'text-body-large', 'text-body-medium', 'text-body-small', 'text-caption',
  ];
  const variants = new Map(recipe.variants.map(variant => [variant.id, variant]));
  for (const baseId of baseIds) {
    const regular = variants.get(baseId);
    const emphasis = variants.get(`${baseId}-emphasis`);
    if (!regular || regular.modifier !== 'regular') fail(`${recipe.id} is missing regular variant ${baseId}.`);
    if (!emphasis || emphasis.modifier !== 'emphasis') fail(`${recipe.id} is missing emphasis variant ${baseId}-emphasis.`);
    for (const variant of [regular, emphasis]) {
      const properties = new Set(variant.assignments.map(assignment => assignment.property));
      for (const property of ['font-family', 'font-size', 'line-height', 'font-weight', 'letter-spacing']) {
        if (!properties.has(property)) fail(`${recipe.id}.${variant.id} is missing ${property}.`);
      }
    }
  }
  if (recipe.variants.length !== baseIds.length * 2) fail(`${recipe.id} must contain exactly the regular/emphasis matrix.`);
}

function validateElevationRecipe(recipe) {
  const assignmentsBySuffix = new Map();
  for (const variant of recipe.variants) {
    const byRole = Object.fromEntries(variant.assignments.map(assignment => [assignment.role, assignment.token]));
    for (const role of ['shadow', 'highlight', 'combined']) {
      if (!byRole[role]) fail(`${recipe.id}.${variant.id} is missing ${role}.`);
    }
    const suffixes = [
      byRole.shadow.replace('--effect-shadow-', ''),
      byRole.highlight.replace('--effect-highlight-', ''),
      byRole.combined.replace('--effect-elevation-', ''),
    ];
    if (new Set(suffixes).size !== 1 || suffixes[0] !== variant.id) {
      fail(`${recipe.id}.${variant.id} must use same-suffix shadow, highlight, and combined tokens.`);
    }
    assignmentsBySuffix.set(variant.id, byRole);
  }
  const publishedSuffixes = tokenNames
    .filter(name => name.startsWith('--effect-elevation-'))
    .map(name => name.replace('--effect-elevation-', ''));
  const missing = publishedSuffixes.filter(suffix => !assignmentsBySuffix.has(suffix));
  if (missing.length) fail(`${recipe.id} is missing published elevations: ${missing.join(', ')}.`);
}

function validate() {
  validateEnvelope();
  const ids = new Set();
  const recipeIds = new Set(source.recipes.map(recipe => recipe.id));
  if (recipeIds.size !== source.recipes.length) fail('recipe ids must be unique.');
  validatePrinciples(ids);
  validateIntents(ids);
  for (const recipe of source.recipes) validateRecipe(recipe, ids);
  validateFamilies(ids, recipeIds);
  validateTypographyRecipe(source.recipes.find(recipe => recipe.id === 'token-recipe:typography-composites'));
  validateElevationRecipe(source.recipes.find(recipe => recipe.id === 'token-recipe:elevation-composition'));
}

validate();

const manifest = {
  $schema: './agent.schema.json',
  schemaVersion: source.schemaVersion,
  package: pkg.name,
  packageVersion: pkg.version,
  kind: source.kind,
  principles: source.principles,
  intents: source.intents,
  families: source.families,
  recipes: source.recipes,
};

writeFileSync(path.join(ROOT, 'dist/agent.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  path.join(ROOT, 'dist/agent.mjs'),
  `const manifest = ${JSON.stringify(manifest, null, 2)};\nexport default manifest;\n`,
);
copyFileSync(SCHEMA_PATH, path.join(ROOT, 'dist/agent.schema.json'));
writeFileSync(path.join(ROOT, 'dist/agent.d.ts'), `export type GuidanceStatus = 'experimental' | 'stable' | 'deprecated' | 'removed';

export interface GuidanceReference {
  label: string;
  path: string;
}

export interface TokenGuidancePrinciple {
  id: \`principle:\${string}\`;
  summary: string;
}

export interface ColorIntentGuidance {
  id: \`intent:\${string}\`;
  status: GuidanceStatus;
  optional: boolean;
  summary: string;
  useWhen: string[];
  avoidWhen: string[];
  precedence?: string[];
}

export interface TokenFamilyAgentEntry {
  id: \`token-family:\${string}\`;
  kind: 'token-family';
  category: 'color' | 'dimension' | 'typography' | 'effect';
  audience: 'general' | 'specialized' | 'foundation';
  status: GuidanceStatus;
  summary: string;
  tokenPatterns: string[];
  selectionRole: 'direct' | 'recipe-part' | 'last-resort';
  useWhen: string[];
  avoidWhen: string[];
  constraints: string[];
  recipes?: \`token-recipe:\${string}\`[];
  accessibility?: string[];
  references?: GuidanceReference[];
}

export interface TokenRecipeRole {
  id: string;
  summary: string;
  tokenPatterns?: string[];
  literal?: boolean;
  required: boolean;
}

export interface TokenRecipeAssignment {
  role: string;
  property: string;
  token?: string;
  tokenPattern?: string;
  value?: string;
}

export interface TokenRecipeVariant {
  id: string;
  label: string;
  modifier?: string;
  when?: string;
  assignments: TokenRecipeAssignment[];
  notes?: string[];
}

export interface TokenRecipeExample {
  language: 'css' | 'html' | 'json';
  content: string;
}

export interface TokenRecipeAgentEntry {
  id: \`token-recipe:\${string}\`;
  kind: 'token-recipe';
  status: GuidanceStatus;
  summary: string;
  useWhen: string[];
  avoidWhen: string[];
  tokenRoles: TokenRecipeRole[];
  compositionRules: string[];
  variants: TokenRecipeVariant[];
  stateOwnership?: string[];
  accessibility?: string[];
  examples?: TokenRecipeExample[];
  references?: GuidanceReference[];
}

export interface TokenAgentManifest {
  $schema: './agent.schema.json';
  schemaVersion: '2.0.0';
  package: '@ds-mo/tokens';
  packageVersion: string;
  kind: 'tokens';
  principles: TokenGuidancePrinciple[];
  intents: ColorIntentGuidance[];
  families: TokenFamilyAgentEntry[];
  recipes: TokenRecipeAgentEntry[];
}

declare const manifest: TokenAgentManifest;
export default manifest;
`);
console.log(`    agent: ${manifest.families.length} families + ${manifest.recipes.length} recipes → dist/agent.json`);
