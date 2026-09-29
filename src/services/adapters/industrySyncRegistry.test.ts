/**
 * 업종 sync capability — Adapter가 업종 이름을 직접 분기하지 않는지.
 * 실행: npm run test:industry-sync-registry
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import {
  collectIndustryRegistrationGaps,
  readIndustryRegistrationSnapshot,
} from '@/core/industry/industryRegistrationIntegrity';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import {
  installVirtualBathSyncFixture,
  uninstallVirtualBathSyncFixture,
  VIRTUAL_BATH_INDUSTRY_TYPE,
  VIRTUAL_BATH_PERSIST_KEY,
  VIRTUAL_BATH_SYNC_ID,
} from './industrySyncRegistry.bath.fixture';
import {
  getIndustrySyncCapability,
  persistRegisteredCapabilities,
  registerIndustrySyncCapability,
  resolveIndustryHydrateCapabilities,
  unregisterIndustrySyncCapability,
} from './industrySyncRegistry';
import { DAYCARE_SYNC_KEYS, PIANO_SYNC_KEYS, STORAGE_KEYS, type StorageKey } from './storageKeys';
import type { SyncCache } from './sync/syncTypes';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(...parts: string[]) {
  return readFileSync(join(srcRoot, ...parts), 'utf8');
}

const emptyCache: SyncCache = {
  get: () => undefined,
  set: () => undefined,
  delete: () => undefined,
  has: () => false,
};

const probePlugin: IndustryPluginManifest = {
  id: 'piano',
  option: { value: 'piano', label: 'probe', description: 'probe' },
  theme: 'indigo',
  accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
  attendanceDefault: false,
  usesClassBasedSchedule: true,
  customerListTab: 'students',
  showSchoolFields: true,
  showPickupFields: false,
  levelLabel: '레벨',
  adminTabs: [],
  staffTabs: [],
  syncCapabilities: ['piano', 'education'],
};

async function run() {
  const adapter = readFileSync(join(here, 'supabaseAdapter.ts'), 'utf8');
  assert.match(adapter, /resolveIndustryHydrateCapabilities/);
  assert.match(adapter, /persistRegisteredCapabilities/);
  assert.doesNotMatch(adapter, /hydratePianoEntities|hydrateEducationEntities|hydrateDaycareEntities/);
  assert.doesNotMatch(adapter, /persistPianoEntity|persistDaycareEntity/);
  assert.doesNotMatch(adapter, /modules\.piano|PIANO_SYNC_KEYS|DAYCARE_SYNC_KEYS/);
  assert.doesNotMatch(adapter, /industry === ['"]piano['"]/);
  assert.doesNotMatch(adapter, /case ['"](?:piano|daycare|bath)['"]/);
  assert.doesNotMatch(adapter, /bath/i);

  const registry = readFileSync(join(here, 'industrySyncRegistry.ts'), 'utf8');
  assert.match(registry, /registerIndustrySyncCapability|unregisterIndustrySyncCapability/);
  assert.match(registry, /getIndustrySyncCapability|listIndustrySyncCapabilities/);
  assert.match(registry, /resolveIndustryHydrateCapabilities|persistRegisteredCapabilities/);
  assert.match(registry, /getIndustryPlugin\(industryType\)\.syncCapabilities/);
  assert.match(registry, /persistKeys\.has\(key\)/);
  assert.doesNotMatch(registry, /pianoEntitySync|educationEntitySync|daycareEntitySync/);
  assert.doesNotMatch(registry, /PIANO_SYNC_KEYS|DAYCARE_SYNC_KEYS/);
  assert.doesNotMatch(registry, /@\/industries|@\/modules|@\/capabilities\//);
  assert.doesNotMatch(registry, /pianoClient|daycareClient|bathClient/);
  assert.doesNotMatch(registry, /registerIndustrySyncCapability\(\{[\s\S]*?id:\s*'piano'/);
  assert.doesNotMatch(registry, /registerIndustrySyncCapability\(\{[\s\S]*?id:\s*'education'/);
  assert.doesNotMatch(registry, /registerIndustrySyncCapability\(\{[\s\S]*?id:\s*'daycare'/);
  assert.doesNotMatch(registry, /registerIndustrySyncCapability\(\{[\s\S]*?id:\s*'bath'/);

  assert.doesNotMatch(readSrc('services/adapters/sync/pianoEntitySync.ts'), /registerIndustrySyncCapability/);
  assert.doesNotMatch(readSrc('services/adapters/sync/educationEntitySync.ts'), /registerIndustrySyncCapability/);
  assert.doesNotMatch(readSrc('services/adapters/sync/daycareEntitySync.ts'), /registerIndustrySyncCapability/);

  const pianoPlugin = readSrc('industries/piano/plugin.ts');
  assert.match(pianoPlugin, /syncCapabilities:\s*\[\s*'piano',\s*'education'\s*\]/);
  assert.match(pianoPlugin, /import\s+['"]\.\/sync\/registerPianoSync['"]/);
  assert.match(pianoPlugin, /import\s+['"]\.\/sync\/registerEducationSync['"]/);

  const daycarePlugin = readSrc('industries/daycare/plugin.ts');
  assert.match(daycarePlugin, /syncCapabilities:\s*\[\s*'daycare'\s*\]/);
  assert.match(daycarePlugin, /import\s+['"]\.\/sync\/registerDaycareSync['"]/);

  assert.doesNotMatch(readSrc('industries/pilates/plugin.ts'), /syncCapabilities/);
  assert.doesNotMatch(readSrc('industries/bath/plugin.ts'), /syncCapabilities|registerBathSync/);
  assert.equal(existsSync(join(srcRoot, 'industries/bath/sync/registerBathSync.ts')), false);

  assert.match(readSrc('core/industry/pluginTypes.ts'), /syncCapabilities\?:/);

  const pianoReg = readSrc('industries/piano/sync/registerPianoSync.ts');
  assert.match(pianoReg, /registerIndustrySyncCapability|id:\s*'piano'|hydratePianoEntities|persistPianoEntity|PIANO_SYNC_KEYS/);
  const educationReg = readSrc('industries/piano/sync/registerEducationSync.ts');
  assert.match(educationReg, /registerIndustrySyncCapability|id:\s*'education'|hydrateEducationEntities|persistEducationEntity|PIANO_SYNC_KEYS/);
  const daycareReg = readSrc('industries/daycare/sync/registerDaycareSync.ts');
  assert.match(daycareReg, /registerIndustrySyncCapability|id:\s*'daycare'|hydrateDaycareEntities|persistDaycareEntity|DAYCARE_SYNC_KEYS/);

  const modulesSrc = readSrc('app/industry/industryModules.tsx');
  assert.match(modulesSrc, /import \{ pianoPluginManifest \}/);
  assert.match(modulesSrc, /import \{ daycarePluginManifest \}/);
  assert.match(modulesSrc, /import \{ bathPluginManifest \}/);
  assert.match(modulesSrc, /loadApp:\s*\(\)\s*=>\s*import\(/);
  assert.doesNotMatch(modulesSrc, /registerPianoSync|registerDaycareSync|registerBathSync/);
  assert.doesNotMatch(readSrc('industries/piano/PianoAppContent.tsx'), /registerIndustrySyncCapability/);
  assert.doesNotMatch(readSrc('industries/daycare/DaycareAppContent.tsx'), /registerIndustrySyncCapability/);
  assert.doesNotMatch(readSrc('industries/bath/BathAppContent.tsx'), /registerIndustrySyncCapability/);

  const expectedPianoKeys = [
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.ATTENDANCE,
    STORAGE_KEYS.PRACTICE_RECORDS,
    STORAGE_KEYS.LESSON_RECORDS,
    STORAGE_KEYS.TEXTBOOKS,
    STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
    STORAGE_KEYS.SONGS,
    STORAGE_KEYS.EVENTS,
    STORAGE_KEYS.PERFORMANCE_VIDEOS,
    STORAGE_KEYS.CURRICULUM_LEVELS,
    STORAGE_KEYS.CURRICULUM_ITEMS,
    STORAGE_KEYS.CURRICULUM_PROGRESS,
    STORAGE_KEYS.WEEKLY_ASSIGNMENTS,
    STORAGE_KEYS.ACHIEVEMENTS,
    STORAGE_KEYS.LEARNING_REPORTS,
  ];
  const expectedDaycareKeys = [
    STORAGE_KEYS.CARE_JOURNALS,
    STORAGE_KEYS.MEDICATION_REQUESTS,
    STORAGE_KEYS.CARE_CHILD_RECORDS,
    STORAGE_KEYS.CARE_INCIDENTS,
    STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
    STORAGE_KEYS.CARE_SAFETY_LOGS,
    STORAGE_KEYS.CARE_MEAL_SAMPLES,
    STORAGE_KEYS.CARE_CCTV_REQUESTS,
    STORAGE_KEYS.CARE_PICKUP_LOGS,
  ];
  assert.deepEqual([...PIANO_SYNC_KEYS].sort(), [...expectedPianoKeys].sort());
  assert.deepEqual([...DAYCARE_SYNC_KEYS].sort(), [...expectedDaycareKeys].sort());
  assert.equal(PIANO_SYNC_KEYS.size, 15);
  assert.equal(DAYCARE_SYNC_KEYS.size, 9);

  const snap = readIndustryRegistrationSnapshot(srcRoot);
  assert.deepEqual(snap.registeredCapabilities, ['daycare', 'education', 'piano']);
  const declared = [...new Set(snap.pluginRecords.flatMap((rec) => rec.syncCapabilities))].sort();
  assert.deepEqual(declared, ['daycare', 'education', 'piano']);
  assert.equal(collectIndustryRegistrationGaps(snap).length, 0);
  assert.match(
    collectIndustryRegistrationGaps({
      ...snap,
      pluginRecords: snap.pluginRecords.map((rec) =>
        rec.id === 'piano' ? { ...rec, syncCapabilities: [...rec.syncCapabilities, 'bath'] } : rec
      ),
    }).join('\n'),
    /capability 선언 누락: plugin piano syncCapabilities "bath"/
  );
  assert.match(
    collectIndustryRegistrationGaps({
      ...snap,
      registeredCapabilities: [...snap.registeredCapabilities, 'bath'],
    }).join('\n'),
    /capability 등록 미사용: registerIndustrySyncCapability "bath"/
  );

  /**
   * 신규 capability 추가에 필요한 것: register 모듈 + plugin.syncCapabilities.
   * 필요하지 않은 것: industrySyncRegistry.ts / supabaseAdapter 업종 분기 / registry 업종 import.
   */
  assert.equal(adapter.includes('hydrateBath') || adapter.includes('modules.bath'), false);
  assert.doesNotMatch(registry, /registerBathSync|id:\s*'bath'/);

  installIndustryPlugin(probePlugin);
  installIndustryPlugin({
    ...probePlugin,
    id: 'daycare',
    option: { value: 'daycare', label: 'probe', description: 'probe' },
    syncCapabilities: ['daycare'],
  });
  installIndustryPlugin({
    ...probePlugin,
    id: 'pilates',
    option: { value: 'pilates', label: 'probe', description: 'probe' },
    syncCapabilities: undefined,
  });

  const stub = {
    hydrate: async () => undefined,
    persist: async () => true,
    persistKeys: new Set<StorageKey>(),
  };
  registerIndustrySyncCapability({ id: 'piano', ...stub });
  registerIndustrySyncCapability({ id: 'education', ...stub });
  registerIndustrySyncCapability({ id: 'daycare', ...stub });
  assert.deepEqual(resolveIndustryHydrateCapabilities('piano').map((cap) => cap.id), ['piano', 'education']);
  assert.deepEqual(resolveIndustryHydrateCapabilities('daycare').map((cap) => cap.id), ['daycare']);
  assert.deepEqual(resolveIndustryHydrateCapabilities('pilates').map((cap) => cap.id), []);

  const bath = installVirtualBathSyncFixture();
  assert.equal(getIndustrySyncCapability(VIRTUAL_BATH_SYNC_ID)?.id, VIRTUAL_BATH_SYNC_ID);
  assert.deepEqual(
    resolveIndustryHydrateCapabilities(VIRTUAL_BATH_INDUSTRY_TYPE).map((cap) => cap.id),
    [VIRTUAL_BATH_SYNC_ID]
  );
  assert.deepEqual(resolveIndustryHydrateCapabilities('sauna_jjimjbang').map((cap) => cap.id), [
    VIRTUAL_BATH_SYNC_ID,
  ]);
  const bathPersistOk = await persistRegisteredCapabilities(
    VIRTUAL_BATH_PERSIST_KEY,
    'org',
    emptyCache,
    () => false
  );
  assert.equal(bathPersistOk, true);
  assert.equal(bath.persistCalls, 1);
  uninstallVirtualBathSyncFixture();
  assert.equal(getIndustrySyncCapability(VIRTUAL_BATH_SYNC_ID), undefined);
  assert.deepEqual(resolveIndustryHydrateCapabilities(VIRTUAL_BATH_INDUSTRY_TYPE).map((cap) => cap.id), []);

  const probeId = '__industry_sync_probe__';
  const probeKey = '__probe_key__' as StorageKey;
  let persistCalls = 0;
  registerIndustrySyncCapability({
    id: probeId,
    hydrate: async () => undefined,
    persist: async () => {
      persistCalls += 1;
      return true;
    },
    persistKeys: new Set([probeKey]),
  });
  assert.equal(getIndustrySyncCapability(probeId)?.id, probeId);
  registerIndustrySyncCapability({
    id: probeId,
    hydrate: async () => undefined,
    persist: async () => {
      persistCalls += 10;
      return true;
    },
    persistKeys: new Set([probeKey]),
  });
  const persistOk = await persistRegisteredCapabilities(probeKey, 'org', emptyCache, () => false);
  assert.equal(persistOk, true);
  assert.equal(persistCalls, 10);
  unregisterIndustrySyncCapability(probeId);
  assert.equal(getIndustrySyncCapability(probeId), undefined);

  console.log('industrySyncRegistry.test.ts: ok');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
