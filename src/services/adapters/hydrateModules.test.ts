/**
 * hydrate 모듈 선택 — plugin.syncCapabilities + 등록된 sync.
 * 실행: npx tsx src/services/adapters/hydrateModules.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDUSTRY_DEFINITIONS, type IndustryType } from '@/core/industry/catalog';
import { buildGenericPluginManifest } from '@/core/industry/genericPlugin';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import { hydrateDaycareEntities } from './sync/daycareEntitySync';
import { hydrateEducationEntities } from './sync/educationEntitySync';
import { hydratePianoEntities } from './sync/pianoEntitySync';
import { resolveIndustryHydrateCapabilities } from './industrySyncRegistry';
import { resolveHydrateModules } from './hydrateModules';
import '../../industries/piano/sync/registerPianoSync';
import '../../industries/piano/sync/registerEducationSync';
import '../../industries/daycare/sync/registerDaycareSync';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function declaredSyncCapabilities(pluginRel: string): string[] {
  const src = readFileSync(join(srcRoot, pluginRel), 'utf8');
  const block = src.match(/syncCapabilities:\s*\[([^\]]*)\]/)?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function installDeclaredPlugin(id: IndustryType, pluginRel: string) {
  const syncCapabilities = declaredSyncCapabilities(pluginRel);
  installIndustryPlugin({
    ...buildGenericPluginManifest(INDUSTRY_DEFINITIONS[id]),
    ...(syncCapabilities.length > 0 ? { syncCapabilities } : {}),
  });
}

installDeclaredPlugin('piano', 'industries/piano/plugin.ts');
installDeclaredPlugin('daycare', 'industries/daycare/plugin.ts');
installDeclaredPlugin('pilates', 'industries/pilates/plugin.ts');
installDeclaredPlugin('retail', 'industries/retail/plugin.ts');
installDeclaredPlugin('gym', 'industries/gym/plugin.ts');
installDeclaredPlugin('skin_clinic', 'industries/skin/plugin.ts');

assert.deepEqual(declaredSyncCapabilities('industries/piano/plugin.ts'), ['piano', 'education']);
assert.deepEqual(declaredSyncCapabilities('industries/daycare/plugin.ts'), ['daycare']);
assert.deepEqual(declaredSyncCapabilities('industries/pilates/plugin.ts'), []);
assert.deepEqual(declaredSyncCapabilities('industries/retail/plugin.ts'), []);

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

const pianoPath = resolveIndustryHydrateCapabilities('piano');
assert.deepEqual(
  pianoPath.map((cap) => cap.id),
  ['piano', 'education']
);
assert.equal(pianoPath[0]?.hydrate, hydratePianoEntities);
assert.equal(pianoPath[1]?.hydrate, hydrateEducationEntities);

const daycarePath = resolveIndustryHydrateCapabilities('daycare');
assert.deepEqual(
  daycarePath.map((cap) => cap.id),
  ['daycare']
);
assert.equal(daycarePath[0]?.hydrate, hydrateDaycareEntities);
assert.equal(resolveIndustryHydrateCapabilities('preschool')[0]?.hydrate, hydrateDaycareEntities);

assert.deepEqual(resolveIndustryHydrateCapabilities('pilates'), []);
assert.deepEqual(resolveIndustryHydrateCapabilities('retail'), []);

const hydrateSrc = readFileSync(join(here, 'hydrateModules.ts'), 'utf8');
assert.match(hydrateSrc, /getIndustryPlugin\([^)]*\)\.syncCapabilities/);
assert.doesNotMatch(hydrateSrc, /industry\s*===\s*['"]piano['"]/);
assert.doesNotMatch(hydrateSrc, /industry\s*===\s*['"]daycare['"]/);
assert.doesNotMatch(hydrateSrc, /normalizeIndustryType/);

const pianoPlugin = readFileSync(join(srcRoot, 'industries/piano/plugin.ts'), 'utf8');
const daycarePlugin = readFileSync(join(srcRoot, 'industries/daycare/plugin.ts'), 'utf8');
assert.match(pianoPlugin, /syncCapabilities:\s*\[\s*'piano',\s*'education'\s*\]/);
assert.match(pianoPlugin, /registerPianoSync/);
assert.match(pianoPlugin, /registerEducationSync/);
assert.match(daycarePlugin, /syncCapabilities:\s*\[\s*'daycare'\s*\]/);
assert.match(daycarePlugin, /registerDaycareSync/);

console.log('hydrateModules.test.ts: ok');
