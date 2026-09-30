/**
 * 새 업종 추가 계약. 등록 누락을 runtime Generic 추락 전에 실패시킨다.
 * 실행: npm run test:industry-contract
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_IDS, CAPABILITY_MANIFESTS, assertCapabilityDefinition } from '@/capabilities';
import {
  INDUSTRY_ALIASES,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_IDS,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  defineIndustry,
  getIndustryDefinition,
  hasIndustryModule,
  isIndustryType,
  normalizeIndustryType,
  parseIndustryType,
  shouldUseGenericShell,
} from './types';
import { CLASS_BASED_CORE_ADMIN_TABS, CLASS_BASED_CORE_STAFF_TABS } from './pluginTypes';
import { resolveIndustryAppKind } from './industryAppResolve';
import {
  assertIndustryRegistrationIntegrity,
  readIndustryRegistrationSnapshot,
} from './industryRegistrationIntegrity';
import { enabledIndustryCapabilities } from './industryCapabilities';
import {
  CAPABILITY_IMPLEMENTATION_TABS,
  NAV_TAB_REQUIRED_CAPABILITY,
} from '@/app/industry/capabilityNavigation';
import {
  INDUSTRY_CAPABILITY_COMPOSITION,
  getIndustryCapabilities,
  hasIndustryCapability,
} from '@/app/industry/industryCapabilityMap';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FINANCE_TABS = ['finance', 'income', 'expenses', 'tuition', 'unpaid', 'payroll'] as const;

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function walkTs(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function viewResolves(tab: string, sources: string[]): boolean {
  const joined = sources.join('\n');
  if (joined.includes(`'${tab}'`) || joined.includes(`"${tab}"`)) return true;
  if ((FINANCE_TABS as readonly string[]).includes(tab) && joined.includes('financeViewEntries')) {
    return true;
  }
  if (tab === 'attendance' && joined.includes('attendanceViewEntry')) return true;
  if (tab === 'account' && joined.includes('accountViewEntry')) return true;
  return false;
}

function assertNoCapabilityCycle(): void {
  const deps = new Map(
    CAPABILITY_MANIFESTS.map((m) => [m.definition.id, m.definition.dependencies])
  );
  const visiting = new Set<string>();
  const seen = new Set<string>();

  function visit(id: string): void {
    if (visiting.has(id)) {
      throw new Error(`capability dependency cycle: ${id}`);
    }
    if (seen.has(id)) return;
    visiting.add(id);
    for (const dep of deps.get(id as (typeof CAPABILITY_IDS)[number]) ?? []) {
      visit(dep);
    }
    visiting.delete(id);
    seen.add(id);
  }

  for (const id of deps.keys()) visit(id);
}

function assertNoDuplicateIndustryLists(): void {
  const definitionsSrc = readSrc('core/industry/definitions.ts');
  assert.match(
    definitionsSrc,
    /export const MODULE_INDUSTRY_IDS[\s\S]*DEFINITION_LIST\.flatMap/,
    'MODULE_INDUSTRY_IDS must be derived from DEFINITION_LIST'
  );
  assert.match(
    definitionsSrc,
    /export const PUBLIC_SELECTABLE_INDUSTRY_IDS[\s\S]*DEFINITION_LIST\.flatMap/,
    'PUBLIC_SELECTABLE_INDUSTRY_IDS must be derived from selectable'
  );
  assert.equal(
    /export const PUBLIC_SELECTABLE_INDUSTRY_IDS\s*=\s*\[/.test(definitionsSrc),
    false,
    'do not reintroduce a handwritten PUBLIC_SELECTABLE_INDUSTRY_IDS array'
  );

  const modulesSrc = existsSync(join(srcRoot, 'app/industry/industryModules.tsx'))
    ? readSrc('app/industry/industryModules.tsx')
    : readSrc('app/industry/industryModules.ts');
  assert.match(
    modulesSrc,
    /export const APP_BY_INDUSTRY[\s\S]*Object\.fromEntries/,
    'APP_BY_INDUSTRY must be derived from INDUSTRY_MODULES'
  );
  assert.equal(
    /const APP_BY_INDUSTRY[^=]*=\s*\{/.test(modulesSrc),
    false,
    'do not reintroduce a handwritten APP_BY_INDUSTRY map'
  );

  const compositionDir = join(srcRoot, 'app/industry');
  const coreIndustryDir = join(srcRoot, 'core/industry');
  for (const dir of [compositionDir, coreIndustryDir]) {
    for (const file of walkTs(dir)) {
      const src = readFileSync(file, 'utf8');
      assert.equal(
        /export const INDUSTRY_PLUGINS\s*=/.test(src),
        false,
        `do not reintroduce INDUSTRY_PLUGINS in ${file}`
      );
    }
  }
}

function run(): void {
  assertIndustryRegistrationIntegrity(srcRoot);
  const snap = readIndustryRegistrationSnapshot(srcRoot);

  // 1. Industry id unique
  assert.equal(new Set(INDUSTRY_IDS).size, INDUSTRY_IDS.length, 'industry id must be unique');

  // 2. Industry definition unique
  assert.equal(Object.keys(INDUSTRY_DEFINITIONS).length, INDUSTRY_IDS.length);
  for (const id of INDUSTRY_IDS) {
    assert.equal(INDUSTRY_DEFINITIONS[id].id, id);
  }

  // 3. aliases valid
  for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
    assert.equal(isIndustryType(alias), false, `alias collides with catalog id: ${alias}`);
    assert.equal(isIndustryType(target), true, `alias target missing: ${alias} → ${target}`);
    assert.equal(parseIndustryType(alias), target);
  }

  // 4. selectable industry has valid definition
  for (const id of PUBLIC_SELECTABLE_INDUSTRY_IDS) {
    const def = getIndustryDefinition(id);
    assert.ok(def, `selectable missing definition: ${id}`);
    assert.equal(def.selectable, true);
    assert.ok(def.moduleId, `selectable industry has no module: ${id}`);
  }
  assert.deepEqual(
    [...PUBLIC_SELECTABLE_INDUSTRY_IDS].sort(),
    [...MODULE_INDUSTRY_IDS].sort(),
    'selectable and module lists must stay derived and aligned'
  );

  // 5–7. module-backed industry has matching module + manifest id
  for (const id of MODULE_INDUSTRY_IDS) {
    const def = getIndustryDefinition(id);
    assert.ok(def, `definition missing: ${id}`);
    assert.equal(def.moduleId, id);
    assert.ok(snap.registryPluginIds.includes(id), `module registration missing: ${id}`);
    assert.ok(snap.routerKeys.includes(id), `router registration missing: ${id}`);
    const rec = snap.pluginRecords.find((r) => r.id === id);
    assert.ok(rec, `plugin missing: ${id}`);
    assert.equal(rec.optionValue, id, `manifest id mismatch: ${id}`);
    const app = snap.moduleApps.find((item) => item.id === id);
    assert.ok(app?.loadAppSpec, `AppContent registration missing: ${id}`);
    assert.ok(app.file && existsSync(app.file), `AppContent missing: ${id}`);
    assert.ok(app.appExport, `AppContent export missing: ${id}`);
  }

  // 8–9. declared capabilities exist + enabled have implementation
  const capabilitySet = new Set<string>(CAPABILITY_IDS);
  for (const manifest of CAPABILITY_MANIFESTS) {
    assertCapabilityDefinition(manifest.definition);
  }
  assertNoCapabilityCycle();

  for (const id of INDUSTRY_IDS) {
    const composition = INDUSTRY_CAPABILITY_COMPOSITION[id as keyof typeof INDUSTRY_CAPABILITY_COMPOSITION];
    const capabilities = composition?.capabilities ?? {};
    const defaults = composition?.defaults ?? {};
    for (const cap of Object.keys(capabilities)) {
      assert.ok(capabilitySet.has(cap), `${id} declares unknown capability: ${cap}`);
    }
    for (const cap of Object.keys(defaults)) {
      assert.ok(capabilitySet.has(cap), `${id} default unknown capability: ${cap}`);
      if (defaults[cap] === true) {
        assert.equal(
          capabilities[cap],
          true,
          `${id} defaults.${cap}=true but capability is not enabled`
        );
      }
    }
  }

  for (const id of MODULE_INDUSTRY_IDS) {
    const composition = INDUSTRY_CAPABILITY_COMPOSITION[id];
    assert.ok(composition, `module industry missing capability composition: ${id}`);
    const rec = snap.pluginRecords.find((r) => r.id === id);
    assert.ok(rec);
    const expectedAttendanceDefault = composition.defaults.attendance === true;
    assert.equal(
      rec.attendanceDefault,
      expectedAttendanceDefault,
      `${id} plugin.attendanceDefault must match composition.defaults.attendance`
    );

    const appFile = snap.moduleApps.find((item) => item.id === id)?.file;
    assert.ok(appFile, `AppContent file missing: ${id}`);
    const appSrc = readFileSync(appFile, 'utf8');
    const pluginSrc = readFileSync(rec.file, 'utf8');
    const pluginNavSrc = expandClassBasedTabs(pluginSrc);
    const enabled = enabledIndustryCapabilities(composition.capabilities);
    for (const cap of enabled) {
      if (cap === 'booking' && composition.capabilities.scheduling !== true) {
        assert.fail(`${id}: booking requires scheduling`);
      }
      const deps =
        CAPABILITY_MANIFESTS.find((m) => m.definition.id === cap)?.definition.dependencies ?? [];
      for (const dep of deps) {
        assert.equal(
          composition.capabilities[dep],
          true,
          `${id}: enabled ${cap} requires dependency ${dep}`
        );
      }
      const hints = CAPABILITY_IMPLEMENTATION_TABS[cap] ?? [];
      const hasHint = hints.some(
        (tab) => viewResolves(tab, [appSrc, pluginNavSrc]) || pluginNavSrc.includes(`'${tab}'`)
      );
      assert.ok(hasHint, `${id}: enabled capability ${cap} has no nav/view implementation`);
    }

    const pluginTabs = collectQuotedTabs(pluginNavSrc);
    const commonViews = readSrc('core/industry/commonViewEntries.tsx');
    for (const tab of pluginTabs) {
      const required = requiredCapForTab(tab);
      if (!required || !hasIndustryCapability(id, required)) continue;
      assert.ok(
        viewResolves(tab, [appSrc, pluginSrc, commonViews]),
        `${id}: navigation item "${tab}" does not resolve to a view`
      );
    }
  }

  // 11–12. router / loader resolve declared module
  const routerSrc = readSrc('app/industry/IndustryAppRouter.tsx');
  assert.match(routerSrc, /APP_BY_INDUSTRY/);
  assert.match(routerSrc, /resolveIndustryAppKind/);
  const loaderSrc = readSrc('app/industry/loadIndustryModules.ts');
  assert.match(loaderSrc, /installIndustryPlugins/);
  assert.match(loaderSrc, /INDUSTRY_MODULES/);
  for (const id of MODULE_INDUSTRY_IDS) {
    assert.equal(resolveIndustryAppKind(id), 'module');
    assert.equal(hasIndustryModule(id), true);
  }

  // 13. organization can resolve the industry
  for (const id of INDUSTRY_IDS) {
    assert.ok(getIndustryDefinition(id), `org cannot resolve industry: ${id}`);
    assert.equal(parseIndustryType(id), id);
  }

  // 14. unknown industry does not silently become another concrete industry
  assert.equal(parseIndustryType('english_academy'), null);
  assert.equal(normalizeIndustryType('english_academy'), null);
  assert.equal(normalizeIndustryType('not_a_real_type'), null);
  assert.notEqual(normalizeIndustryType('english_academy'), 'piano');
  assert.equal(resolveIndustryAppKind('english_academy'), 'generic');
  assert.equal(getIndustryDefinition('english_academy'), undefined);

  // 15. generic-shell policy is explicit
  assert.equal(shouldUseGenericShell('piano'), false);
  assert.equal(shouldUseGenericShell('academy'), true);
  assert.equal(shouldUseGenericShell('english_academy'), true);
  assert.equal(shouldUseGenericShell(''), false);
  assert.equal(resolveIndustryAppKind('academy'), 'generic');
  assert.equal(resolveIndustryAppKind(null), 'module');

  // 16–17. defaults valid + no capability cycle (already asserted)
  const objectPiano = defineIndustry({
    id: 'piano',
    label: '피아노학원',
    description: 'test',
    category: 'education',
    moduleId: 'piano',
    selectable: true,
  });
  assert.equal(objectPiano.id, 'piano');
  assert.equal(objectPiano.selectable, true);
  assert.equal('capabilities' in objectPiano, false);
  assert.equal(getIndustryCapabilities('piano').roster, true);

  // 18. industry cannot create Core → Industry dependency
  const coreFiles = walkTs(join(srcRoot, 'core'));
  for (const file of coreFiles) {
    const src = readFileSync(file, 'utf8');
    assert.equal(
      /from ['"]@\/industries\//.test(src),
      false,
      `Core → Industry import: ${file}`
    );
  }

  assertNoDuplicateIndustryLists();

  for (const file of walkTs(join(srcRoot, 'core/industry'))) {
    const src = readFileSync(file, 'utf8');
    assert.equal(
      /NAV_TAB_REQUIRED_CAPABILITY|CAPABILITY_IMPLEMENTATION_TABS/.test(src),
      false,
      `Core must not own capability UI tab maps: ${file}`
    );
    assert.equal(
      /from ['"]@\/app\/industry/.test(src),
      false,
      `Core must not import Composition nav: ${file}`
    );
    assert.equal(
      /from ['"]@\/capabilities/.test(src),
      false,
      `Core must not import Capability implementations: ${file}`
    );
  }

  const coreFlagSrc = readSrc('core/industry/industryCapabilities.ts');
  assert.equal(
    /Partial<Record<string,\s*boolean>>/.test(coreFlagSrc),
    false,
    'IndustryCapabilityFlagMap must not stay as Partial<Record<string, boolean>>'
  );
  assert.match(
    readSrc('app/industry/industryCapabilityMap.ts'),
    /Record<CapabilityId,\s*true>/,
    'Composition must close Industry capability IDs with CapabilityId'
  );
  assert.match(
    readSrc('app/industry/industryCapabilityMap.ts'),
    /export const INDUSTRY_CAPABILITY_COMPOSITION/,
    'Composition must own Industry capability runtime map'
  );
  assert.doesNotMatch(
    readSrc('core/industry/definitions.ts'),
    /capabilities:\s*\{/,
    'Core catalog must not own runtime capability composition'
  );

  // 19. Independent Industry Manifest Contract & Unknown Industry Fallback
  const dummyDef = defineIndustry({
    id: 'dummy_test_industry',
    label: '테스트업종',
    description: '독립 신규 업종 계약 테스트',
    category: 'education',
    moduleId: undefined,
    selectable: false,
  });
  assert.equal(dummyDef.id, 'dummy_test_industry');
  assert.equal(dummyDef.moduleId, undefined);

  // unknown/신규 미등록 업종에 대해서는 Generic Shell로 안전 호환되어 시스템 폭발 방지
  assert.equal(shouldUseGenericShell('dummy_test_industry'), true);
  assert.equal(resolveIndustryAppKind('dummy_test_industry'), 'generic');

  // 기존 Piano 및 모듈 업종의 정상 호환성 보장
  assert.equal(shouldUseGenericShell('piano'), false);
  assert.equal(resolveIndustryAppKind('piano'), 'module');
  assert.equal(parseIndustryType('piano'), 'piano');
  assert.equal(parseIndustryType('unknown_xyz_industry'), null);

  console.log(
    `industryContract.test.ts OK (${INDUSTRY_IDS.length} industries, ${MODULE_INDUSTRY_IDS.length} modules)`
  );
}

function requiredCapForTab(tab: string): string | null {
  return NAV_TAB_REQUIRED_CAPABILITY[tab] ?? null;
}

function collectQuotedTabs(src: string): string[] {
  return [...src.matchAll(/'([a-z][a-z0-9-]*)'/g)].map((m) => m[1]);
}

function expandClassBasedTabs(pluginSrc: string): string {
  const extras: string[] = [];
  if (pluginSrc.includes('CLASS_BASED_CORE_ADMIN_TABS')) {
    extras.push(...CLASS_BASED_CORE_ADMIN_TABS.map((tab) => `'${tab}'`));
  }
  if (pluginSrc.includes('CLASS_BASED_CORE_STAFF_TABS')) {
    extras.push(...CLASS_BASED_CORE_STAFF_TABS.map((tab) => `'${tab}'`));
  }
  return extras.length > 0 ? `${pluginSrc}\n${extras.join('\n')}` : pluginSrc;
}

run();
