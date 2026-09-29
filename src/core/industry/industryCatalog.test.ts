/**
 * Industry 카탈로그 불변조건.
 * 실행: npx tsx src/core/industry/industryCatalog.test.ts
 */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INDUSTRY_IDS,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_ALIASES,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  isIndustryType,
  listIndustryDefinitions,
  listIndustriesByCategory,
  hasIndustryModule,
  getIndustryDefinition,
  shouldUseGenericShell,
} from './catalog';
import { INDUSTRY_CATEGORY_OPTIONS } from './categories';
import {
  normalizeIndustryType,
  getIndustryLabel,
  getIndustryCategoryForType,
  resolveIndustryCategoryForCreate,
  assertCatalogIntegrity,
} from './types';
import {
  assertIndustryRegistrationIntegrity,
  collectIndustryRegistrationGaps,
  type IndustryRegistrationSnapshot,
} from './industryRegistrationIntegrity';

const SUBJECT_ACADEMY_FORBIDDEN = [
  'english_academy',
  'math_academy',
  'korean_academy',
  'science_academy',
  'coding_academy',
  'coding_bootcamp',
] as const;

function run(): void {
  assertCatalogIntegrity();

  for (const id of INDUSTRY_IDS) {
    const def = INDUSTRY_DEFINITIONS[id];
    assert.equal(def.id, id);
    assert.ok(def.label.length > 0);
    assert.ok(INDUSTRY_CATEGORY_OPTIONS.some((c) => c.id === def.category));
  }

  // INDUSTRY_IDS ↔ DEFINITIONS 단일 출처
  assert.equal(INDUSTRY_IDS.length, Object.keys(INDUSTRY_DEFINITIONS).length);

  for (const id of MODULE_INDUSTRY_IDS) {
    assert.ok(isIndustryType(id), `missing module industry: ${id}`);
    assert.equal(INDUSTRY_DEFINITIONS[id].moduleId, id);
    assert.equal(hasIndustryModule(id), true);
    assert.equal(shouldUseGenericShell(id), false);
  }

  assert.ok(isIndustryType('academy'));
  assert.equal(hasIndustryModule('academy'), false);
  assert.equal(shouldUseGenericShell('academy'), true);
  for (const forbidden of SUBJECT_ACADEMY_FORBIDDEN) {
    assert.equal(isIndustryType(forbidden), false, `must not exist: ${forbidden}`);
  }

  assert.equal(normalizeIndustryType('taekwondo'), 'gym');
  assert.equal(normalizeIndustryType('preschool'), 'daycare');
  assert.equal(normalizeIndustryType('kindergarten'), 'daycare');
  assert.equal(normalizeIndustryType('sauna_jjimjbang'), 'sauna_jjimjilbang');
  assert.equal(INDUSTRY_ALIASES.taekwondo, 'gym');
  assert.equal(INDUSTRY_ALIASES.sauna_jjimjbang, 'sauna_jjimjilbang');

  assert.equal(normalizeIndustryType('not_a_real_type'), null);
  assert.equal(normalizeIndustryType(null), 'piano');
  assert.equal(shouldUseGenericShell('not_a_real_type'), true);

  assert.equal(normalizeIndustryType('hair_salon'), 'hair_salon');
  assert.equal(normalizeIndustryType('academy'), 'academy');
  assert.ok(getIndustryLabel('hair_salon').length > 0);
  assert.ok(getIndustryLabel('piano').includes('피아노'));

  const education = listIndustriesByCategory('education');
  assert.ok(education.some((d) => d.id === 'piano'));
  assert.ok(!education.some((d) => d.id === 'academy'), 'academy not public yet');
  assert.ok(!education.some((d) => d.id === 'pilates'));

  const selectable = listIndustryDefinitions({ selectableOnly: true });
  assert.equal(selectable.length, PUBLIC_SELECTABLE_INDUSTRY_IDS.length);
  assert.ok(selectable.some((d) => d.id === 'piano'));
  assert.ok(selectable.some((d) => d.id === 'pilates'));
  assert.ok(selectable.some((d) => d.id === 'gym'));
  assert.ok(selectable.some((d) => d.id === 'daycare'));
  assert.ok(selectable.some((d) => d.id === 'skin_clinic'));
  assert.ok(selectable.some((d) => d.id === 'retail'));
  assert.ok(selectable.some((d) => d.id === 'sauna_jjimjilbang'));
  assert.equal(INDUSTRY_DEFINITIONS.piano.selectable, true);
  assert.equal(INDUSTRY_DEFINITIONS.pilates.selectable, true);
  assert.equal(INDUSTRY_DEFINITIONS.gym.selectable, true);
  assert.equal(INDUSTRY_DEFINITIONS.daycare.selectable, true);
  assert.equal(INDUSTRY_DEFINITIONS.skin_clinic.selectable, true);
  assert.equal(INDUSTRY_DEFINITIONS.retail.selectable, true);
  assert.equal(hasIndustryModule('skin_clinic'), true);
  assert.equal(INDUSTRY_DEFINITIONS.skin_clinic.moduleId, 'skin_clinic');
  assert.equal(hasIndustryModule('retail'), true);
  assert.equal(INDUSTRY_DEFINITIONS.retail.moduleId, 'retail');
  assert.equal(hasIndustryModule('sauna_jjimjilbang'), true);
  assert.equal(INDUSTRY_DEFINITIONS.sauna_jjimjilbang.moduleId, 'sauna_jjimjilbang');
  assert.equal(INDUSTRY_DEFINITIONS.sauna_jjimjilbang.selectable, true);
  assert.equal(shouldUseGenericShell('sauna_jjimjilbang'), false);
  assert.equal(getIndustryDefinition('sauna_jjimjbang')?.id, 'sauna_jjimjilbang');

  // 모듈 업종은 공개·모듈 정의 유지
  assert.equal(hasIndustryModule('pilates'), true);
  assert.equal(hasIndustryModule('gym'), true);
  assert.equal(hasIndustryModule('daycare'), true);

  assert.equal(getIndustryDefinition('taekwondo')?.id, 'gym');
  assert.equal(getIndustryDefinition('piano')?.moduleId, 'piano');
  assert.equal(getIndustryDefinition('academy')?.moduleId, undefined);

  for (const cat of INDUSTRY_CATEGORY_OPTIONS) {
    const items = listIndustriesByCategory(cat.id);
    if (PUBLIC_SELECTABLE_INDUSTRY_IDS.some((id) => INDUSTRY_DEFINITIONS[id].category === cat.id)) {
      assert.ok(items.length > 0, `expected selectable items in: ${cat.id}`);
    }
  }

  assert.equal(getIndustryCategoryForType('piano'), 'education');
  assert.equal(getIndustryCategoryForType('pilates'), 'fitness');
  assert.equal(resolveIndustryCategoryForCreate('piano'), 'education');
  assert.equal(resolveIndustryCategoryForCreate('pilates', 'piano'), 'education');
  assert.equal(resolveIndustryCategoryForCreate('piano', 'fitness'), 'fitness');
  assert.equal(resolveIndustryCategoryForCreate('piano', '학원'), '학원');
  assert.equal(normalizeIndustryType('piano'), 'piano');

  assertIndustryRegistrationIntegrity(join(dirname(fileURLToPath(import.meta.url)), '../..'));

  const baseline: IndustryRegistrationSnapshot = {
    catalogIds: ['piano', 'academy'],
    moduleIds: ['piano'],
    pluginIds: ['piano'],
    registryPluginIds: ['piano'],
    routerKeys: ['piano'],
    routerComponents: ['piano'],
    loaderExports: ['piano'],
    moduleApps: [
      {
        id: 'piano',
        appExport: 'PianoAppContent',
        loadAppSpec: '@/industries/piano/PianoAppContent',
        file: 'industries/piano/PianoAppContent.tsx',
      },
    ],
    pluginRecords: [
      {
        file: 'industries/piano/plugin.ts',
        id: 'piano',
        optionValue: 'piano',
        attendanceDefault: false,
        syncCapabilities: ['piano'],
        aliases: [],
      },
    ],
    registeredCapabilities: ['piano'],
    aliases: {},
    missingLoaderImports: [],
    extraGaps: [],
  };
  assert.deepEqual(collectIndustryRegistrationGaps(baseline), []);

  assert.match(
    collectIndustryRegistrationGaps({ ...baseline, pluginIds: [] }).join('\n'),
    /catalog에는 있는데 plugin이 없음: piano/
  );
  assert.match(
    collectIndustryRegistrationGaps({ ...baseline, registryPluginIds: [] }).join('\n'),
    /plugin은 있는데 registry에 없음: piano/
  );
  assert.match(
    collectIndustryRegistrationGaps({ ...baseline, routerKeys: [] }).join('\n'),
    /plugin은 있는데 router에 없음: piano/
  );
  assert.match(
    collectIndustryRegistrationGaps({ ...baseline, loaderExports: [] }).join('\n'),
    /router에는 있는데 module loader가 없음: piano/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      pluginRecords: [{ ...baseline.pluginRecords[0], id: 'piano', optionValue: 'gym' }],
    }).join('\n'),
    /plugin id ↔ industry type 불일치/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      pluginRecords: [{ ...baseline.pluginRecords[0], syncCapabilities: ['bath'] }],
    }).join('\n'),
    /capability 선언 누락: plugin piano syncCapabilities "bath"/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      registeredCapabilities: ['piano', 'bath'],
    }).join('\n'),
    /capability 등록 미사용: registerIndustrySyncCapability "bath"/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      pluginRecords: [{ ...baseline.pluginRecords[0], eagerRegisterImport: false }],
    }).join('\n'),
    /capability 등록 경로 누락: plugin piano syncCapabilities 는 있는데 register\*Sync 정적 import가 없음/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      pluginRecords: [{ ...baseline.pluginRecords[0], attendanceDefault: null }],
    }).join('\n'),
    /업종 기본값 누락/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      moduleIds: ['piano'],
      pluginIds: ['piano', 'academy'],
    }).join('\n'),
    /plugin은 있는데 catalog.moduleId가 없음: academy/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      aliases: { taekwondo: 'not_a_real_type' },
    }).join('\n'),
    /alias 대상이 catalog에 없음: "taekwondo" → "not_a_real_type"/
  );
  assert.match(
    collectIndustryRegistrationGaps({ ...baseline, moduleApps: [] }).join('\n'),
    /catalog에는 있는데 AppContent 등록이 없음: piano/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...baseline,
      moduleApps: [{ ...baseline.moduleApps[0], file: null }],
    }).join('\n'),
    /AppContent 파일 없음: piano/
  );

  console.log(`industryCatalog.test.ts OK (${INDUSTRY_IDS.length} industries)`);
}

run();
