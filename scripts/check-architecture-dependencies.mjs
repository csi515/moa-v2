/**
 * 계층 의존 방향 검사.
 *
 * 허용: core→core, capability→core, industry→capability|core,
 *       composition→industry|capability|core
 * 금지: core→industry|modules|composition|capability,
 *       capability→industry|modules,
 *       capability→같은 capability의 Core compatibility shim
 *
 * 기존 위반은 LEGACY allowlist. 신규 위반은 즉시 실패.
 * src/core/academy 는 영구 금지 — 디렉터리 또는 하위 파일 존재 시 즉시 실패.
 * 실행: npm run check:architecture
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  domainFacadesUnknownSlices,
  FROZEN_DOMAIN_FACADES_REL,
  FROZEN_STORAGE_TS_REL,
  storageTsDefinesDomainApi,
} from './storage-facade-freeze.mjs';
import {
  STORAGE_SERVICE_INDUSTRY_LEGACY_FILES,
  STORAGE_SERVICE_INDUSTRY_LEGACY_REASON,
} from './storage-service-industry-legacy.mjs';
import {
  FROZEN_TYPES_INDEX_REL,
  isTypesBarrelIndustrySpec,
  isTypesBarrelLayer,
  isTypesBarrelRelative,
  isTypesBarrelSpecifier,
  typesBarrelCapabilityImplSpecs,
  typesBarrelHasStudentLevelUnion,
  typesBarrelUnknownLocalDefs,
} from './types-barrel-freeze.mjs';
import { TYPES_BARREL_LEGACY_IMPORT_FILES } from './types-barrel-legacy-imports.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcRoot = join(root, 'src');

const INDUSTRY_SCHEMAS = [
  'piano',
  'pilates',
  'gym',
  'daycare',
  'skin',
  'skin_clinic',
  'retail',
  'bath',
  'sauna_jjimjbang',
];

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const SCHEMA_RE = new RegExp(
  `['"\`](?:${INDUSTRY_SCHEMAS.join('|')})\\.[A-Za-z_][A-Za-z0-9_]*['"\`]`,
  'g'
);

/**
 * 현재 코드 위치의 LEGACY 위반. 새로 넣지 않는다. 고치면 이 목록에서 뺀다.
 * kind: modules_import | industry_schema | layer_import
 */
export const LEGACY_ALLOWLIST = {
  'src/services/storage/textbookStorage.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY textbook factory → piano sale service',
  },
  'src/services/storage/textbookSalesStorage.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY textbook sales persist → piano db/legacy',
  },
  'src/services/storage/textbookCatalogStorage.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY textbook catalog → piano stock/persist',
  },
  'src/services/adapters/sync/daycareEntitySync.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY daycare sync mapper types',
  },
  'src/services/adapters/sync/daycareEntityMappers.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY daycare sync mapper types',
  },
  'src/services/adapters/sync/daycareOpsMappers.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY daycare ops mapper types',
  },
  'src/services/adapters/sync/pianoEntitySync.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY piano textbook sale merge in sync',
  },
  'src/services/storage/eventsStorage.ts': {
    kinds: ['layer_import'],
    reason: 'LEGACY events labels → piano eventLabels',
  },
  'src/capabilities/billing/ui/PassManagementView.tsx': {
    kinds: ['context_import', 'storage_service_import'],
    reason: 'LEGACY academy pass management UI',
  },
  'src/capabilities/booking/ui/BookingCalendarView.tsx': {
    kinds: ['context_import', 'storage_service_import'],
    reason: 'LEGACY shared booking calendar UI',
  },
  'src/capabilities/booking/ui/BookingCustomerHubView.tsx': {
    kinds: ['context_import'],
    reason: 'LEGACY academy booking customer hub UI',
  },
  'src/capabilities/booking/ui/BookingScheduleHubView.tsx': {
    kinds: ['context_import'],
    reason: 'LEGACY academy booking schedule hub UI',
  },
  'src/capabilities/booking/ui/PilatesSlotList.tsx': {
    kinds: ['context_import'],
    reason: 'LEGACY shared booking slot list UI',
  },
  'src/capabilities/booking/ui/ServiceManagementView.tsx': {
    kinds: ['context_import'],
    reason: 'LEGACY shared service management UI',
  },
  'src/capabilities/consultation/components/ConsultationRecordsView.tsx': {
    kinds: ['storage_service_import'],
    reason: 'LEGACY academy consultation records UI',
  },
  'src/capabilities/scheduling/components/classes/ClassManagementView.tsx': {
    kinds: ['storage_service_import'],
    reason: 'LEGACY academy class management UI',
  },
  'src/capabilities/scheduling/components/timetable/WeeklyTimetableView.tsx': {
    kinds: ['storage_service_import'],
    reason: 'LEGACY academy weekly timetable UI',
  },
};

export const CORE_ACADEMY_FORBIDDEN_MESSAGE =
  'src/core/academy is permanently forbidden. Move the code to Core, Capability, Industry, Shared, or Infrastructure.';

function isAcademyRel(rel) {
  return rel === 'src/core/academy' || rel.startsWith('src/core/academy/');
}

const FORBIDDEN_FROM = {
  core: new Set(['industry', 'capability', 'composition']),
  capability: new Set(['industry', 'composition']),
  infrastructure: new Set(['industry']),
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(filePath) {
  return relative(root, filePath).replace(/\\/g, '/');
}

export function findCoreAcademyViolations(dir = join(srcRoot, 'core', 'academy')) {
  if (!existsSync(dir)) return null;
  const files = walk(dir).map((f) => toPosix(f));
  return { dir: toPosix(dir), files };
}

export function assertCoreAcademyForbidden(dir = join(srcRoot, 'core', 'academy')) {
  const violation = findCoreAcademyViolations(dir);
  if (violation) {
    console.error(CORE_ACADEMY_FORBIDDEN_MESSAGE);
    if (violation.files.length > 0) {
      for (const file of violation.files) {
        console.error(`  - ${file}`);
      }
    } else {
      console.error(`  - ${violation.dir} (directory)`);
    }
    process.exit(1);
  }
}

function layerOfRel(rel) {
  if (rel.startsWith('src/core/')) return 'core';
  if (rel.startsWith('src/capabilities/')) return 'capability';
  if (rel.startsWith('src/industries/') || rel.startsWith('src/modules/')) return 'industry';
  if (rel.startsWith('src/app/')) return 'composition';
  if (rel.startsWith('src/services/')) return 'infrastructure';
  return null;
}

function isContextSpecifier(spec) {
  return spec === '@/context' || (typeof spec === 'string' && spec.startsWith('@/context/'));
}

function resolveImportRel(fromRel, spec) {
  return toPosix(join(dirname(join(root, fromRel)), spec)).replace(/\.(tsx?|jsx?)$/, '');
}

function isContextRelative(fromRel, spec) {
  if (!spec || !spec.startsWith('.')) return false;
  const resolved = resolveImportRel(fromRel, spec);
  return resolved === 'src/context' || resolved.startsWith('src/context/');
}

function fileImportsTypesBarrel(rel, specs) {
  for (const spec of specs) {
    if (isTypesBarrelSpecifier(spec) || isTypesBarrelRelative(rel, spec, resolveImportRel)) {
      return true;
    }
  }
  return false;
}

function isAppUiSpecifier(spec) {
  return spec === '@/shared/app/appUi' || (typeof spec === 'string' && spec.startsWith('@/shared/app/appUi/'));
}

function isIndustrySyncRegistryRel(rel) {
  return rel === 'src/services/adapters/industrySyncRegistry.ts';
}

function isIndustryDefinitionsRel(rel) {
  return rel === 'src/core/industry/definitions.ts';
}

function hasCatalogRuntimeComposition(source) {
  return /(?:capabilities|defaults):\s*\{/.test(stripComments(source));
}

function collectTypeOnlyImportSpecs(source) {
  const specs = new Set();
  for (const match of source.matchAll(/import\s+type\s+(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]/g)) {
    specs.add(match[1]);
  }
  return specs;
}

function isDefinitionsForbiddenRuntimeSpec(spec) {
  if (!spec) return false;
  if (spec === '@/capabilities' || spec.startsWith('@/capabilities/')) return true;
  if (spec === '@/app' || spec.startsWith('@/app/')) return true;
  if (spec === '@/industries' || spec.startsWith('@/industries/')) return true;
  if (isModulesSpecifier(spec)) return true;
  return false;
}

function isRegistryConcreteSpec(fromRel, spec) {
  if (!spec) return false;
  if (spec === '@/industries' || spec.startsWith('@/industries/')) return true;
  if (isModulesSpecifier(spec)) return true;
  if (spec === '@/capabilities' || spec.startsWith('@/capabilities/')) return true;
  if (/EntitySync/.test(spec)) return true;
  if (/(?:piano|daycare|education|bath|pilates|gym|skin|retail)(?:EntitySync|Client)/i.test(spec)) {
    return true;
  }
  if (spec.startsWith('.')) {
    const resolved = toPosix(join(dirname(join(root, fromRel)), spec));
    if (resolved === 'src/industries' || resolved.startsWith('src/industries/')) return true;
    if (resolved === 'src/modules' || resolved.startsWith('src/modules/')) return true;
    if (resolved === 'src/capabilities' || resolved.startsWith('src/capabilities/')) return true;
  }
  return false;
}

function isAppUiRelative(fromRel, spec) {
  if (!spec || !spec.startsWith('.')) return false;
  const resolved = toPosix(join(dirname(join(root, fromRel)), spec));
  return (
    resolved === 'src/shared/app/appUi' ||
    resolved.startsWith('src/shared/app/appUi.') ||
    resolved.startsWith('src/shared/app/appUi/')
  );
}

function isModulesSpecifier(spec) {
  if (!spec) return false;
  if (spec === '@/modules' || spec.startsWith('@/modules/')) return true;
  const normalized = spec.replace(/\\/g, '/');
  return /(^|\/)modules\//.test(normalized) && !normalized.includes('/src/core/');
}

function specifierLayer(spec) {
  if (!spec || spec.startsWith('.') ) {
    return null;
  }
  if (spec === '@/core' || spec.startsWith('@/core/')) return 'core';
  if (spec === '@/capabilities' || spec.startsWith('@/capabilities/')) return 'capability';
  if (spec === '@/industries' || spec.startsWith('@/industries/')) return 'industry';
  if (spec === '@/app' || spec.startsWith('@/app/')) return 'composition';
  if (isModulesSpecifier(spec)) return 'industry';
  return null;
}

function relativeSpecifierLayer(fromRel, spec) {
  if (!spec || !spec.startsWith('.')) return null;
  const fromDir = dirname(join(root, fromRel));
  const resolved = toPosix(join(fromDir, spec));
  return layerOfRel(resolved);
}

function isCapabilityCompatShim(source) {
  return source.includes('@deprecated 신규 코드는') && /from ['"]@\/capabilities\//.test(source);
}

function capabilityIdFromRel(rel) {
  const match = rel.match(/^src\/capabilities\/([^/]+)/);
  return match?.[1] ?? null;
}

function resolveAliasFile(spec) {
  if (!spec || !spec.startsWith('@/')) return null;
  const rest = spec.slice(2);
  const base = join(srcRoot, ...rest.split('/'));
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  return candidates.find((file) => existsSync(file)) ?? null;
}

function shimCapabilityTarget(filePath) {
  const source = readFileSync(filePath, 'utf8');
  if (!isCapabilityCompatShim(source)) return null;
  const match = source.match(/from ['"]@\/capabilities\/([^/'"]+)/);
  return match?.[1] ?? null;
}

function isLegacyAttendanceSpec(spec) {
  return spec === '@/core/attendance' || (typeof spec === 'string' && spec.startsWith('@/core/attendance/'));
}

/** mega-facade `src/services/storage.ts` only. `@/services/storage/helpers` 등은 허용. */
function isStorageServiceFacadeSpec(fromRel, spec) {
  if (spec === '@/services/storage' || spec === '@/services/storage.ts') return true;
  if (!spec || !spec.startsWith('.')) return false;
  const resolved = toPosix(join(dirname(join(root, fromRel)), spec)).replace(/\.tsx?$/, '');
  return resolved === 'src/services/storage';
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function isTestFile(filePath) {
  return /\.test\.(ts|tsx)$/.test(filePath);
}

function collectImportSpecs(source) {
  const specs = new Set();
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (spec) specs.add(spec);
  }
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
    specs.add(match[1]);
  }
  return specs;
}

function scanFile(filePath) {
  const kinds = new Set();
  const details = [];
  const rel = toPosix(filePath);

  if (isAcademyRel(rel)) {
    kinds.add('core_academy_forbidden');
    details.push(CORE_ACADEMY_FORBIDDEN_MESSAGE);
  }

  if (isTestFile(filePath)) {
    return { kinds, details };
  }

  const fromLayer = layerOfRel(rel);
  const source = readFileSync(filePath, 'utf8');
  const specs = collectImportSpecs(source);

  for (const spec of specs) {
    if (isModulesSpecifier(spec) && (fromLayer === 'core' || fromLayer === 'capability')) {
      kinds.add('modules_import');
      details.push(`import ${spec}`);
      continue;
    }
    if (
      (fromLayer === 'industry' || fromLayer === 'composition') &&
      isLegacyAttendanceSpec(spec)
    ) {
      kinds.add('legacy_core_attendance');
      details.push(`legacy ${spec}`);
    }
    if (
      (fromLayer === 'capability' || fromLayer === 'industry') &&
      isStorageServiceFacadeSpec(rel, spec)
    ) {
      kinds.add('storage_service_import');
      details.push(`legacy StorageService (${spec})`);
    }
    if (
      (fromLayer === 'core' || fromLayer === 'capability') &&
      (isContextSpecifier(spec) || isContextRelative(rel, spec))
    ) {
      kinds.add('context_import');
      details.push(`context ${spec}`);
    }
    if (
      (fromLayer === 'core' || fromLayer === 'capability') &&
      (isAppUiSpecifier(spec) || isAppUiRelative(rel, spec))
    ) {
      kinds.add('app_ui_import');
      details.push(`appUi ${spec}`);
    }
    if (isIndustrySyncRegistryRel(rel) && isRegistryConcreteSpec(rel, spec)) {
      kinds.add('registry_impl_import');
      details.push(`registry impl ${spec}`);
    }
    if (fromLayer === 'capability' && spec.startsWith('@/core/')) {
      const fromCap = capabilityIdFromRel(rel);
      const shimFile = resolveAliasFile(spec);
      const toCap = shimFile ? shimCapabilityTarget(shimFile) : null;
      if (fromCap && toCap && fromCap === toCap) {
        kinds.add('capability_shim_cycle');
        details.push(`shim cycle ${spec} → ${toCap}`);
      }
    }
    const toLayer = specifierLayer(spec) ?? relativeSpecifierLayer(rel, spec);
    if (fromLayer && toLayer && FORBIDDEN_FROM[fromLayer]?.has(toLayer)) {
      if (fromLayer === 'core' && toLayer === 'capability' && isCapabilityCompatShim(source)) {
        continue;
      }
      kinds.add('layer_import');
      details.push(`layer ${fromLayer} → ${toLayer} (${spec})`);
    }
  }

  if (fromLayer === 'core') {
    const code = stripComments(source);
    for (const match of code.matchAll(SCHEMA_RE)) {
      kinds.add('industry_schema');
      details.push(`schema ${match[0]}`);
    }
  }
  if (rel === FROZEN_STORAGE_TS_REL) {
    const freezeError = storageTsDefinesDomainApi(source, stripComments);
    if (freezeError) {
      kinds.add('storage_facade_method');
      details.push(freezeError);
    }
  }
  if (rel === FROZEN_DOMAIN_FACADES_REL) {
    const unknown = domainFacadesUnknownSlices(source);
    if (unknown.length > 0) {
      kinds.add('storage_facade_slice');
      details.push(`unfrozen storage slice: ${unknown.join(', ')}`);
    }
  }
  if (rel === FROZEN_TYPES_INDEX_REL) {
    for (const spec of specs) {
      if (isTypesBarrelIndustrySpec(spec)) {
        kinds.add('types_industry_import');
        details.push(`types barrel → industry (${spec})`);
      }
    }
    const implSpecs = typesBarrelCapabilityImplSpecs(source, collectImportSpecs);
    for (const spec of implSpecs) {
      kinds.add('types_capability_impl_import');
      details.push(`types barrel → capability impl (${spec})`);
    }
    const unknownDefs = typesBarrelUnknownLocalDefs(source);
    if (unknownDefs.length > 0) {
      kinds.add('types_barrel_new_def');
      details.push(`new types/index.ts definition: ${unknownDefs.join(', ')}`);
    }
    if (typesBarrelHasStudentLevelUnion(source)) {
      kinds.add('types_student_level_union');
      details.push('StudentLevel cross-industry union');
    }
  }

  if (isIndustryDefinitionsRel(rel) && hasCatalogRuntimeComposition(source)) {
    kinds.add('catalog_runtime_composition');
    details.push('definitions.ts must not own Industry capability composition');
  }
  if (isIndustryDefinitionsRel(rel)) {
    const typeOnly = collectTypeOnlyImportSpecs(source);
    for (const spec of specs) {
      if (typeOnly.has(spec)) continue;
      if (isDefinitionsForbiddenRuntimeSpec(spec)) {
        kinds.add('definitions_runtime_import');
        details.push(`definitions runtime import ${spec}`);
      }
    }
  }

  return { kinds, details };
}

function isAllowed(rel, kind) {
  if (kind === 'storage_service_import' && STORAGE_SERVICE_INDUSTRY_LEGACY_FILES.has(rel)) {
    return true;
  }
  return (LEGACY_ALLOWLIST[rel]?.kinds ?? []).includes(kind);
}

function collectRoots() {
  const files = [];
  walk(join(srcRoot, 'core'), files);
  walk(join(srcRoot, 'capabilities'), files);
  walk(join(srcRoot, 'industries'), files);
  walk(join(srcRoot, 'app'), files);
  walk(join(srcRoot, 'services'), files);
  walk(join(srcRoot, 'types'), files);
  return files;
}

function collectTypesBarrelLayerFiles() {
  const files = [];
  walk(join(srcRoot, 'core'), files);
  walk(join(srcRoot, 'capabilities'), files);
  walk(join(srcRoot, 'industries'), files);
  walk(join(srcRoot, 'app'), files);
  walk(join(srcRoot, 'modules'), files);
  return files;
}

function collectTypesBarrelImportHits() {
  const current = new Set();
  const next = [];
  for (const file of collectTypesBarrelLayerFiles()) {
    if (isTestFile(file)) continue;
    const rel = toPosix(file);
    if (rel === FROZEN_TYPES_INDEX_REL) continue;
    const fromLayer = layerOfRel(rel);
    if (!isTypesBarrelLayer(fromLayer)) continue;
    const specs = collectImportSpecs(readFileSync(file, 'utf8'));
    if (!fileImportsTypesBarrel(rel, specs)) continue;
    current.add(rel);
    if (!TYPES_BARREL_LEGACY_IMPORT_FILES.has(rel)) {
      next.push({
        file: rel,
        kind: 'types_barrel_new_import',
        details: ["new source file must not import '@/types' barrel — use owner types"],
        legacy: false,
      });
    }
  }
  const stale = [...TYPES_BARREL_LEGACY_IMPORT_FILES].filter((rel) => !current.has(rel)).sort();
  return { next, stale, current };
}

function collectViolations(files = collectRoots()) {
  const next = [];
  const known = [];
  for (const file of files) {
    const rel = toPosix(file);
    const { kinds, details } = scanFile(file);
    for (const kind of kinds) {
      const row = { file: rel, kind, details, legacy: isAllowed(rel, kind) };
      if (row.legacy) known.push(row);
      else next.push(row);
    }
  }
  const typesImports = collectTypesBarrelImportHits();
  next.push(...typesImports.next);
  return { next, known, typesImportStale: typesImports.stale };
}

function legacyKey(file, kind) {
  return `${file}::${kind}`;
}

function expectedLegacyKeys() {
  const keys = [];
  for (const [file, meta] of Object.entries(LEGACY_ALLOWLIST)) {
    for (const kind of meta.kinds) keys.push(legacyKey(file, kind));
  }
  for (const file of STORAGE_SERVICE_INDUSTRY_LEGACY_FILES) {
    keys.push(legacyKey(file, 'storage_service_import'));
  }
  return keys.sort();
}

function assertStorageServiceIndustrySnapshot() {
  const missing = [...STORAGE_SERVICE_INDUSTRY_LEGACY_FILES]
    .filter((rel) => !existsSync(join(root, rel)))
    .sort();
  if (missing.length > 0) {
    console.error('StorageService Industry allowlist에 있으나 파일이 없습니다. 이전한 항목만 목록에서 제거하세요:');
    for (const rel of missing) console.error(`  - ${rel}`);
    process.exit(1);
  }
}

function assertLegacyFrozen(known) {
  const actual = [...new Set(known.map((row) => legacyKey(row.file, row.kind)))].sort();
  const expected = expectedLegacyKeys();
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0) {
    console.error('LEGACY allowlist에 있으나 실제 위반이 없습니다. 항목을 제거하세요:');
    for (const key of missing) console.error(`  - ${key}`);
    process.exit(1);
  }
  if (extra.length > 0) {
    console.error('LEGACY 스냅샷에 없는 기존 위반이 있습니다. allowlist를 갱신하지 말고 신규로 처리하세요:');
    for (const key of extra) console.error(`  - ${key}`);
    process.exit(1);
  }
}

function printInventory(known) {
  if (known.length === 0) return;
  console.log('LEGACY Core/계층 위반 (신규 추가 금지, 수정 시 allowlist에서 제거):');
  for (const row of known) {
    const reason =
      LEGACY_ALLOWLIST[row.file]?.reason ??
      (row.kind === 'storage_service_import' ? STORAGE_SERVICE_INDUSTRY_LEGACY_REASON : '');
    console.log(`  - ${row.file} [${row.kind}] ${reason}`);
  }
}

function writeProbe(dir, name, source) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const probe = join(dir, name);
  writeFileSync(probe, source, 'utf8');
  return probe;
}

function removeIfExists(filePath) {
  if (existsSync(filePath)) unlinkSync(filePath);
}

function selfTest() {
  const probes = [];
  const registryRel = 'src/services/adapters/industrySyncRegistry.ts';
  const registryFile = join(root, registryRel);
  const registryOriginal = readFileSync(registryFile, 'utf8');
  const definitionsRel = 'src/core/industry/definitions.ts';
  const definitionsFile = join(root, definitionsRel);
  const definitionsOriginal = readFileSync(definitionsFile, 'utf8');
  const storageFile = join(root, FROZEN_STORAGE_TS_REL);
  const storageOriginal = readFileSync(storageFile, 'utf8');
  const domainFacadesFile = join(root, FROZEN_DOMAIN_FACADES_REL);
  const domainFacadesOriginal = readFileSync(domainFacadesFile, 'utf8');
  const typesIndexFile = join(root, FROZEN_TYPES_INDEX_REL);
  const typesIndexOriginal = readFileSync(typesIndexFile, 'utf8');
  const academyDir = join(srcRoot, 'core', 'academy');
  const academyProbeRel = 'src/core/academy/_architecture_probe.tmp.ts';

  try {
    probes.push(
      writeProbe(
        academyDir,
        '_architecture_probe.tmp.ts',
        'export const academyProbe = true;\n'
      )
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'core'),
        '_architecture_probe.tmp.ts',
        "import { x } from '@/industries/piano/plugin';\n"
      )
    );
    const capDir = join(srcRoot, 'capabilities', '_shared');
    probes.push(
      writeProbe(capDir, '_architecture_probe.tmp.ts', "import { x } from '@/industries/piano/plugin';\n")
    );
    probes.push(
      writeProbe(capDir, '_architecture_probe_ind.tmp.ts', "import { x } from '@/industries/piano/plugin';\n")
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'industries', 'piano'),
        '_architecture_probe.tmp.ts',
        "import { x } from '@/core/attendance';\n"
      )
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'services'),
        '_architecture_probe.tmp.ts',
        "import { x } from '@/industries/daycare/care/careStorage';\n"
      )
    );
    probes.push(
      writeProbe(capDir, '_architecture_probe_storage.tmp.ts', "import { StorageService } from '@/services/storage';\n")
    );
    probes.push(
      writeProbe(
        capDir,
        '_architecture_probe_storage_ts.tmp.ts',
        "import { StorageService } from '@/services/storage.ts';\n"
      )
    );
    probes.push(
      writeProbe(
        capDir,
        '_architecture_probe_storage_rel.tmp.ts',
        "import { StorageService } from '../../services/storage';\n"
      )
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'industries', 'piano'),
        '_architecture_probe_storage.tmp.ts',
        "import { StorageService } from '@/services/storage';\n"
      )
    );
    writeFileSync(
      storageFile,
      `${storageOriginal}\nexport function getProbeLegacyDomain() { return []; }\n`,
      'utf8'
    );
    writeFileSync(
      domainFacadesFile,
      domainFacadesOriginal.replace(
        /dashboardStatsStorage\r?\n\);/,
        'dashboardStatsStorage,\n  probeStorage\n);'
      ),
      'utf8'
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'capabilities', 'billing'),
        '_architecture_probe_shim.tmp.ts',
        "import { x } from '@/core/finance';\n"
      )
    );
    probes.push(
      writeProbe(join(srcRoot, 'core'), '_architecture_probe_ctx.tmp.ts', "import { useApp } from '@/context/AppContext';\n")
    );
    probes.push(
      writeProbe(capDir, '_architecture_probe_ctx.tmp.ts', "import { useApp } from '@/context/AppContext';\n")
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'core', 'auth'),
        '_architecture_probe_ctx_rel.tmp.ts',
        "import { useApp } from '../../context/AppContext';\n"
      )
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'core'),
        '_architecture_probe_appui.tmp.ts',
        "import { useApp } from '@/shared/app/appUi';\n"
      )
    );
    probes.push(
      writeProbe(
        capDir,
        '_architecture_probe_appui.tmp.ts',
        "import { useApp } from '@/shared/app/appUi';\n"
      )
    );
    probes.push(
      writeProbe(
        capDir,
        '_architecture_probe_ctx_rel.tmp.ts',
        "import { useApp } from '../../context/AppContext';\n"
      )
    );

    writeFileSync(
      registryFile,
      `${registryOriginal}\nimport { x } from './sync/pianoEntitySync';\nimport { y } from '@/industries/bath/plugin';\nimport { z } from '../../industries/daycare/plugin';\nimport { w } from '@/modules/piano/AppContent';\n`,
      'utf8'
    );
    writeFileSync(
      definitionsFile,
      `${definitionsOriginal}\nimport { x } from '@/capabilities/attendance';\nimport { y } from '@/app/industry/industryCapabilityMap';\nimport { z } from '@/industries/piano/plugin';\nexport const probe = { capabilities: { roster: true }, defaults: { attendance: false } };\n`,
      'utf8'
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'core'),
        '_architecture_probe_comp.tmp.ts',
        "import { x } from '@/app/industry/industryCapabilityMap';\n"
      )
    );
    probes.push(
      writeProbe(
        capDir,
        '_architecture_probe_comp.tmp.ts',
        "import { x } from '@/app/industry/industryCapabilityMap';\n"
      )
    );
    probes.push(
      writeProbe(
        join(srcRoot, 'core'),
        '_architecture_probe_types_import.tmp.ts',
        "import type { Student } from '@/types';\n"
      )
    );
    writeFileSync(
      typesIndexFile,
      `${typesIndexOriginal}\nimport { x } from '@/industries/piano/plugin';\nimport { y } from '@/capabilities/billing/finance/services/tuitionService';\nexport interface ProbeDomainType { x: string }\nexport type StudentLevel = '바이엘 상' | '0세반';\n`,
      'utf8'
    );



    const { next } = collectViolations();
    const coreHit = next.some(
      (row) =>
        row.kind === 'layer_import' &&
        row.details.some((line) => line.includes('@/industries/piano'))
    );
    const capHit = next.some(
      (row) =>
        row.file.includes('capabilities') &&
        (row.kind === 'modules_import' || row.kind === 'layer_import')
    );
    const legacyAttHit = next.some((row) => row.kind === 'legacy_core_attendance');
    const servicesHit = next.some(
      (row) =>
        row.kind === 'layer_import' &&
        row.details.some((line) => line.includes('@/industries/daycare'))
    );
    const storageHit = next.some(
      (row) =>
        row.kind === 'storage_service_import' &&
        row.file.includes('_architecture_probe_storage.tmp.ts')
    );
    const storageTsHit = next.some(
      (row) =>
        row.kind === 'storage_service_import' &&
        row.file.includes('_architecture_probe_storage_ts.tmp.ts')
    );
    const storageRelHit = next.some(
      (row) =>
        row.kind === 'storage_service_import' &&
        row.file.includes('_architecture_probe_storage_rel.tmp.ts')
    );
    const industryStorageHit = next.some(
      (row) =>
        row.kind === 'storage_service_import' &&
        row.file.includes('industries/piano/_architecture_probe_storage.tmp.ts')
    );
    const storageMethodHit = next.some(
      (row) => row.kind === 'storage_facade_method' && row.file === FROZEN_STORAGE_TS_REL
    );
    const storageSliceHit = next.some(
      (row) => row.kind === 'storage_facade_slice' && row.file === FROZEN_DOMAIN_FACADES_REL
    );
    const shimCycleHit = next.some((row) => row.kind === 'capability_shim_cycle');
    const academyDirViolation = findCoreAcademyViolations(academyDir);
    const academyFileHit = next.some(
      (row) => row.kind === 'core_academy_forbidden' && row.file === academyProbeRel
    );
    if (!academyDirViolation) {
      throw new Error('architecture self-test: src/core/academy 디렉터리 존재를 잡지 못했습니다.');
    }
    if (!academyFileHit) {
      throw new Error('architecture self-test: src/core/academy 파일 위반을 잡지 못했습니다.');
    }
    const coreContextHit = next.some(
      (row) =>
        row.kind === 'context_import' &&
        row.file.startsWith('src/core/') &&
        row.file.includes('_architecture_probe_ctx.tmp.ts') &&
        row.details.some((line) => line.includes('@/context/AppContext'))
    );
    const coreRelativeContextHit = next.some(
      (row) =>
        row.kind === 'context_import' &&
        row.file.includes('_architecture_probe_ctx_rel.tmp.ts') &&
        row.details.some((line) => line.includes('context/AppContext'))
    );
    const coreAppUiHit = next.some(
      (row) =>
        row.kind === 'app_ui_import' &&
        row.file.startsWith('src/core/') &&
        row.details.some((line) => line.includes('shared/app/appUi'))
    );
    const capContextHit = next.some(
      (row) =>
        row.kind === 'context_import' &&
        row.file.includes('capabilities') &&
        row.file.includes('_architecture_probe_ctx.tmp.ts') &&
        row.details.some((line) => line.includes('@/context/AppContext'))
    );
    const capAppUiHit = next.some(
      (row) =>
        row.kind === 'app_ui_import' &&
        row.file.includes('capabilities') &&
        row.details.some((line) => line.includes('shared/app/appUi'))
    );
    const capRelativeContextHit = next.some(
      (row) =>
        row.kind === 'context_import' &&
        row.file.includes('capabilities') &&
        row.file.includes('_architecture_probe_ctx_rel.tmp.ts') &&
        row.details.some((line) => line.includes('context/AppContext'))
    );
    if (!coreContextHit) {
      throw new Error('architecture self-test: Core → AppContext 를 잡지 못했습니다.');
    }
    if (!coreAppUiHit) {
      throw new Error('architecture self-test: Core → shared/app/appUi 를 잡지 못했습니다.');
    }
    if (!coreRelativeContextHit) {
      throw new Error('architecture self-test: Core → relative context 를 잡지 못했습니다.');
    }
    if (!capContextHit) {
      throw new Error('architecture self-test: Capability → AppContext 를 잡지 못했습니다.');
    }
    if (!capAppUiHit) {
      throw new Error('architecture self-test: Capability → shared/app/appUi 를 잡지 못했습니다.');
    }
    if (!capRelativeContextHit) {
      throw new Error('architecture self-test: Capability → relative context 를 잡지 못했습니다.');
    }
    const registryImplHit = next.some(
      (row) => row.kind === 'registry_impl_import' && row.file === registryRel
    );
    if (!registryImplHit) {
      throw new Error('architecture self-test: industrySyncRegistry → concrete sync 를 잡지 못했습니다.');
    }
    const catalogCompositionHit = next.some(
      (row) => row.kind === 'catalog_runtime_composition' && row.file === definitionsRel
    );
    if (!catalogCompositionHit) {
      throw new Error('architecture self-test: definitions.ts runtime composition 을 잡지 못했습니다.');
    }
    const definitionsCapabilityImportHit = next.some(
      (row) =>
        row.file === definitionsRel &&
        (row.kind === 'layer_import' || row.kind === 'definitions_runtime_import') &&
        row.details.some((line) => line.includes('@/capabilities/attendance'))
    );
    if (!definitionsCapabilityImportHit) {
      throw new Error('architecture self-test: definitions.ts → @/capabilities 를 잡지 못했습니다.');
    }
    const coreCompositionHit = next.some(
      (row) =>
        row.kind === 'layer_import' &&
        row.file.startsWith('src/core/') &&
        row.details.some((line) => line.includes('@/app/industry/industryCapabilityMap'))
    );
    if (!coreCompositionHit) {
      throw new Error('architecture self-test: Core → Composition 을 잡지 못했습니다.');
    }
    const capabilityCompositionHit = next.some(
      (row) =>
        row.kind === 'layer_import' &&
        row.file.includes('capabilities') &&
        row.details.some((line) => line.includes('@/app/industry/industryCapabilityMap'))
    );
    if (!capabilityCompositionHit) {
      throw new Error('architecture self-test: Capability → Composition 을 잡지 못했습니다.');
    }
    const typesIndustryHit = next.some(
      (row) => row.kind === 'types_industry_import' && row.file === FROZEN_TYPES_INDEX_REL
    );
    const typesCapImplHit = next.some(
      (row) => row.kind === 'types_capability_impl_import' && row.file === FROZEN_TYPES_INDEX_REL
    );
    const typesNewDefHit = next.some(
      (row) => row.kind === 'types_barrel_new_def' && row.file === FROZEN_TYPES_INDEX_REL
    );
    const typesLevelUnionHit = next.some(
      (row) => row.kind === 'types_student_level_union' && row.file === FROZEN_TYPES_INDEX_REL
    );
    if (!typesIndustryHit) {
      throw new Error('architecture self-test: types/index.ts → Industry 를 잡지 못했습니다.');
    }
    if (!typesCapImplHit) {
      throw new Error('architecture self-test: types/index.ts → Capability 구현 을 잡지 못했습니다.');
    }
    if (!typesNewDefHit) {
      throw new Error('architecture self-test: types/index.ts 신규 정의 를 잡지 못했습니다.');
    }
    if (!typesLevelUnionHit) {
      throw new Error('architecture self-test: StudentLevel global union 을 잡지 못했습니다.');
    }
    const typesNewImportHit = next.some(
      (row) =>
        row.kind === 'types_barrel_new_import' &&
        row.file.includes('_architecture_probe_types_import.tmp.ts')
    );
    if (!typesNewImportHit) {
      throw new Error("architecture self-test: 신규 파일 → '@/types' 를 잡지 못했습니다.");
    }
    if (!industryStorageHit) {
      throw new Error('architecture self-test: Industry → StorageService 를 잡지 못했습니다.');
    }
    if (!storageMethodHit) {
      throw new Error('architecture self-test: storage.ts 신규 method 를 잡지 못했습니다.');
    }
    if (!storageSliceHit) {
      throw new Error('architecture self-test: domainFacades 신규 slice 를 잡지 못했습니다.');
    }
    if (
      !coreHit ||
      !capHit ||
      !legacyAttHit ||
      !servicesHit ||
      !storageHit ||
      !storageTsHit ||
      !storageRelHit ||
      !industryStorageHit ||
      !storageMethodHit ||
      !storageSliceHit ||
      !shimCycleHit ||
      !academyFileHit ||
      !coreContextHit ||
      !coreRelativeContextHit ||
      !coreAppUiHit ||
      !capContextHit ||
      !capAppUiHit ||
      !capRelativeContextHit ||
      !registryImplHit ||
      !catalogCompositionHit ||
      !definitionsCapabilityImportHit ||
      !coreCompositionHit ||
      !capabilityCompositionHit ||
      !typesIndustryHit ||
      !typesCapImplHit ||
      !typesNewDefHit ||
      !typesLevelUnionHit ||
      !typesNewImportHit
    ) {
      throw new Error('architecture self-test: 계층 위반을 잡지 못했습니다.');
    }
    console.log(
      'architecture self-test: core→industry / capability→industry / services→industry / StorageService (@/ + .ts + relative + industry + freeze) / legacy attendance / capability→shim cycle / permanently forbid core academy / Core·Capability→AppContext / appUi / relative context / registry→impl / catalog composition / Core·Capability→Composition / types barrel freeze / new @/types import 탐지 ok'
    );
  } finally {
    writeFileSync(registryFile, registryOriginal, 'utf8');
    writeFileSync(definitionsFile, definitionsOriginal, 'utf8');
    writeFileSync(storageFile, storageOriginal, 'utf8');
    writeFileSync(domainFacadesFile, domainFacadesOriginal, 'utf8');
    writeFileSync(typesIndexFile, typesIndexOriginal, 'utf8');
    for (const probe of probes) removeIfExists(probe);
    if (existsSync(academyDir)) {
      try {
        rmdirSync(academyDir);
      } catch {
        // ignore
      }
    }
  }

  const { next: cleaned } = collectViolations();
  const leftoverAcademyDir = existsSync(academyDir);
  if (leftoverAcademyDir) {
    throw new Error('architecture self-test: probe 정리 후에도 core academy 디렉터리가 남았습니다.');
  }
  const leftoverAcademy = cleaned.some((row) => row.kind === 'core_academy_forbidden');
  if (leftoverAcademy) {
    throw new Error('architecture self-test: probe 정리 후에도 core academy 위반이 남았습니다.');
  }
  const leftoverRegistry = cleaned.some((row) => row.kind === 'registry_impl_import');
  if (leftoverRegistry) {
    throw new Error('architecture self-test: probe 정리 후에도 registry 구현 import 위반이 남았습니다.');
  }
  const leftoverCatalogComposition = cleaned.some((row) => row.kind === 'catalog_runtime_composition');
  if (leftoverCatalogComposition) {
    throw new Error('architecture self-test: probe 정리 후에도 catalog composition 위반이 남았습니다.');
  }
  const leftoverDefinitionsImport = cleaned.some((row) => row.kind === 'definitions_runtime_import');
  if (leftoverDefinitionsImport) {
    throw new Error('architecture self-test: probe 정리 후에도 definitions runtime import 위반이 남았습니다.');
  }
  const leftoverStorageFreeze = cleaned.some(
    (row) => row.kind === 'storage_facade_method' || row.kind === 'storage_facade_slice'
  );
  if (leftoverStorageFreeze) {
    throw new Error('architecture self-test: probe 정리 후에도 storage freeze 위반이 남았습니다.');
  }
  const leftoverTypesFreeze = cleaned.some(
    (row) =>
      row.kind === 'types_industry_import' ||
      row.kind === 'types_capability_impl_import' ||
      row.kind === 'types_barrel_new_def' ||
      row.kind === 'types_student_level_union' ||
      row.kind === 'types_barrel_new_import'
  );
  if (leftoverTypesFreeze) {
    throw new Error('architecture self-test: probe 정리 후에도 types barrel freeze 위반이 남았습니다.');
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) {
    try {
      selfTest();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    return;
  }

  const { next, known, typesImportStale } = collectViolations();
  printInventory(known);
  assertLegacyFrozen(known);
  assertCoreAcademyForbidden();
  assertStorageServiceIndustrySnapshot();
  if (typesImportStale.length > 0) {
    console.error("types barrel inventory에 있으나 '@/types' import가 없습니다. 이전한 항목만 목록에서 제거하세요:");
    for (const rel of typesImportStale) console.error(`  - ${rel}`);
    process.exit(1);
  }

  if (next.length > 0) {
    console.error('\n새로운 계층 의존 위반이 있습니다:');
    for (const row of next) {
      console.error(`  - ${row.file} [${row.kind}] ${row.details.join('; ')}`);
    }
    process.exit(1);
  }

  console.log('check-architecture-dependencies: ok');
}

main();
