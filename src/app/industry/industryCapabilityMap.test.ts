/**
 * Industry → Capability runtime 계약. 실행: npm run test:industry-capability-map
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_IDS } from '@/capabilities';
import { INDUSTRY_DEFINITIONS, MODULE_INDUSTRY_IDS } from '@/core/industry/catalog';
import {
  INDUSTRY_CAPABILITY_COMPOSITION,
  getIndustryCapabilities,
  hasIndustryCapability,
  hasIndustryCapabilityDefault,
  type IndustryCatalogMetadata,
  type IndustryRuntimeCapabilityComposition,
} from './industryCapabilityMap';

const allowed: IndustryRuntimeCapabilityComposition['capabilities'] = {
  attendance: true,
  billing: false,
  commerce: true,
  scheduling: true,
  booking: true,
  parent: true,
  resources: true,
  transport: true,
  roster: true,
  enrollment: true,
  consultation: true,
};

// @ts-expect-error 허용되지 않은 capability id
const unknownKey: IndustryRuntimeCapabilityComposition['capabilities'] = { attendnce: true };

/** Industry가 켜는 capability. 구현 세부사항이 아니라 runtime 계약. */
const EXPECTED: Record<string, { on: string[]; attendanceDefault: boolean }> = {
  piano: {
    on: [
      'attendance',
      'billing',
      'booking',
      'consultation',
      'enrollment',
      'parent',
      'resources',
      'roster',
      'scheduling',
    ],
    attendanceDefault: false,
  },
  pilates: {
    on: ['attendance', 'billing', 'booking', 'roster', 'scheduling'],
    attendanceDefault: false,
  },
  gym: {
    on: ['attendance', 'billing', 'enrollment', 'parent', 'roster', 'scheduling', 'transport'],
    attendanceDefault: true,
  },
  daycare: {
    on: ['attendance', 'billing', 'consultation', 'enrollment', 'parent', 'roster', 'scheduling'],
    attendanceDefault: true,
  },
  skin_clinic: {
    on: ['attendance', 'billing', 'booking', 'commerce', 'roster', 'scheduling'],
    attendanceDefault: false,
  },
  retail: {
    on: ['commerce', 'roster'],
    attendanceDefault: false,
  },
  sauna_jjimjilbang: {
    on: ['booking', 'roster', 'scheduling'],
    attendanceDefault: false,
  },
};

function enabledIds(industry: string): string[] {
  return Object.entries(getIndustryCapabilities(industry))
    .filter(([, on]) => on === true)
    .map(([id]) => id)
    .sort();
}

function run(): void {
  assert.equal(allowed.attendance, true);
  assert.equal(unknownKey.attendance, undefined);

  const here = dirname(fileURLToPath(import.meta.url));
  const mapSrc = readFileSync(join(here, 'industryCapabilityMap.ts'), 'utf8');
  const definitionsSrc = readFileSync(join(here, '../../core/industry/definitions.ts'), 'utf8');
  assert.equal((mapSrc.match(/export const INDUSTRY_CAPABILITY_COMPOSITION/g) ?? []).length, 1);
  assert.match(mapSrc, /import type \{ CapabilityId \}/);
  assert.doesNotMatch(mapSrc, /from ['"]@\/capabilities\/[a-z]/);
  assert.doesNotMatch(mapSrc, /defineCapability|create\w+Capability/);
  assert.doesNotMatch(definitionsSrc, /capabilities:\s*\{/);
  assert.doesNotMatch(definitionsSrc, /defaults:\s*\{/);
  assert.doesNotMatch(definitionsSrc, /from ['"]@\/capabilities/);
  assert.doesNotMatch(definitionsSrc, /from ['"]@\/app\/industry/);
  assert.doesNotMatch(definitionsSrc, /from ['"]@\/industries/);

  const catalog: IndustryCatalogMetadata = {
    id: INDUSTRY_DEFINITIONS.piano.id,
    label: INDUSTRY_DEFINITIONS.piano.label,
    description: INDUSTRY_DEFINITIONS.piano.description,
    category: INDUSTRY_DEFINITIONS.piano.category,
    moduleId: INDUSTRY_DEFINITIONS.piano.moduleId,
    selectable: INDUSTRY_DEFINITIONS.piano.selectable,
  };
  assert.equal(catalog.id, 'piano');
  assert.equal('capabilities' in INDUSTRY_DEFINITIONS.piano, false);

  const allowedIds = new Set<string>(CAPABILITY_IDS);
  assert.deepEqual(Object.keys(INDUSTRY_CAPABILITY_COMPOSITION).sort(), [...MODULE_INDUSTRY_IDS].sort());
  assert.deepEqual([...MODULE_INDUSTRY_IDS].sort(), Object.keys(EXPECTED).sort());

  for (const id of MODULE_INDUSTRY_IDS) {
    const composition = INDUSTRY_CAPABILITY_COMPOSITION[id];
    assert.ok(composition, `missing composition: ${id}`);
    const expected = EXPECTED[id];
    assert.ok(expected, `missing expected snapshot: ${id}`);
    assert.deepEqual(enabledIds(id), expected.on);
    assert.equal(hasIndustryCapabilityDefault(id, 'attendance'), expected.attendanceDefault);
    for (const cap of [...Object.keys(composition.capabilities), ...Object.keys(composition.defaults)]) {
      assert.ok(allowedIds.has(cap), `${id} capability "${cap}" is not in CAPABILITY_IDS`);
    }
  }

  assert.deepEqual(enabledIds('skin_clinic'), EXPECTED.skin_clinic.on);
  assert.deepEqual(enabledIds('skin'), []);
  assert.deepEqual(enabledIds('sauna_jjimjilbang'), EXPECTED.sauna_jjimjilbang.on);
  assert.deepEqual(enabledIds('sauna_jjimjbang'), EXPECTED.sauna_jjimjilbang.on);
  assert.deepEqual(enabledIds('bath'), []);
  assert.deepEqual(enabledIds('taekwondo'), EXPECTED.gym.on);
  assert.equal(hasIndustryCapability('piano', 'billing'), true);
  assert.equal(hasIndustryCapability('retail', 'billing'), false);
  assert.deepEqual(enabledIds('academy'), []);

  console.log('industryCapabilityMap.test.ts: ok');
}

run();
