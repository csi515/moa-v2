/**
 * STORAGE_KEYS 가 DECLARED 또는 LEGACY persistence policy에 있는지 검사.
 * 신규 키를 정책 없이 추가하면 실패한다.
 * 실행: npm run check:persistence-policy
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function sliceConstObject(source, constName) {
  const start = source.indexOf(`export const ${constName}`);
  if (start < 0) {
    throw new Error(`${constName} not found`);
  }
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(brace, i + 1);
    }
  }
  throw new Error(`${constName} object not closed`);
}

function storageKeyValues(block) {
  return [...block.matchAll(/:\s*'([a-z0-9_]+)'/g)].map((match) => match[1]);
}

function objectKeys(block) {
  return [...block.matchAll(/^\s*([a-z0-9_]+):/gm)].map((match) => match[1]);
}

const storageKeysSource = readFileSync(join(root, 'src/services/adapters/storageKeys.ts'), 'utf8');
const policySource = readFileSync(join(root, 'src/core/storage/persistencePolicy.ts'), 'utf8');

const storageKeys = [...new Set(storageKeyValues(sliceConstObject(storageKeysSource, 'STORAGE_KEYS')))];
const declared = new Set(objectKeys(sliceConstObject(policySource, 'DECLARED_STORAGE_KEY_POLICIES')));
const legacy = new Set(objectKeys(sliceConstObject(policySource, 'LEGACY_STORAGE_KEY_POLICIES')));

const uncovered = storageKeys.filter((key) => !declared.has(key) && !legacy.has(key));
const overlap = [...declared].filter((key) => legacy.has(key));
const covered = new Set([...declared, ...legacy]);
const orphans = [...covered].filter((key) => !storageKeys.includes(key));

if (uncovered.length || overlap.length || orphans.length) {
  if (uncovered.length) {
    console.error('STORAGE_KEYS without DECLARED or LEGACY persistence policy:');
    for (const key of uncovered) console.error(`  - ${key}`);
  }
  if (overlap.length) {
    console.error('Keys listed in both DECLARED and LEGACY:');
    for (const key of overlap) console.error(`  - ${key}`);
  }
  if (orphans.length) {
    console.error('Policy keys not present in STORAGE_KEYS:');
    for (const key of orphans) console.error(`  - ${key}`);
  }
  process.exit(1);
}

console.log(
  `persistence policy coverage ok (${storageKeys.length} keys, ${declared.size} declared, ${legacy.size} legacy)`
);
