/**
 * hydrate 모듈 선택 — industry별 Core + 모듈 조합
 * 실행: npm run test:hydrate-modules
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveHydrateModules } from './hydrateModules';

const cases: Array<{
  industry: string | null;
  expect: { piano: boolean; education: boolean; daycare: boolean };
}> = [
  { industry: 'piano', expect: { piano: true, education: true, daycare: false } },
  { industry: 'daycare', expect: { piano: false, education: false, daycare: true } },
  { industry: 'preschool', expect: { piano: false, education: false, daycare: true } },
  { industry: 'retail', expect: { piano: false, education: false, daycare: false } },
  { industry: 'pilates', expect: { piano: false, education: false, daycare: false } },
  { industry: 'gym', expect: { piano: false, education: false, daycare: false } },
  { industry: 'skin_clinic', expect: { piano: false, education: false, daycare: false } },
  { industry: null, expect: { piano: true, education: true, daycare: false } },
  { industry: 'english_academy', expect: { piano: false, education: false, daycare: false } },
];

for (const { industry, expect } of cases) {
  const actual = resolveHydrateModules(industry);
  assert.deepEqual(actual, expect, `${industry}`);
}

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pianoPlugin = readFileSync(join(srcRoot, 'industries/piano/plugin.ts'), 'utf8');
const daycarePlugin = readFileSync(join(srcRoot, 'industries/daycare/plugin.ts'), 'utf8');
assert.match(pianoPlugin, /syncCapabilities:\s*\[\s*'piano',\s*'education'\s*\]/);
assert.match(daycarePlugin, /syncCapabilities:\s*\[\s*'daycare'\s*\]/);

console.log('hydrateModules.test.ts: ok');
