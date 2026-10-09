/**
 * 업종 등록 지점 불일치 검출 (테스트 전용, 앱 번들에 넣지 않음).
 * catalog.moduleId ↔ plugin ↔ composition module list.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INDUSTRY_ALIASES,
  INDUSTRY_IDS,
  MODULE_INDUSTRY_IDS,
} from './catalog';

export type PluginRecord = {
  file: string;
  id: string | null;
  optionValue: string | null;
  attendanceDefault: boolean | null;
  syncCapabilities: string[];
  aliases: string[];
  /** plugin이 `./sync/register*` 를 static import 하는지. 픽스처는 생략 가능. */
  eagerRegisterImport?: boolean;
  placeLabel?: string | null;
  ownerLabel?: string | null;
  placeNamePlaceholder?: string | null;
  customerLabel?: string | null;
};

export type IndustryModuleAppRecord = {
  id: string;
  appExport: string | null;
  loadAppSpec: string | null;
  file: string | null;
};

export type IndustryRegistrationSnapshot = {
  catalogIds: string[];
  moduleIds: string[];
  pluginIds: string[];
  registryPluginIds: string[];
  routerKeys: string[];
  routerComponents: string[];
  loaderExports: string[];
  moduleApps: IndustryModuleAppRecord[];
  pluginRecords: PluginRecord[];
  registeredCapabilities: string[];
  aliases: Record<string, string>;
  missingLoaderImports: string[];
  extraGaps: string[];
};

function uniqueSorted(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort();
}

function missing(from: string[], into: string[]): string[] {
  const set = new Set(into);
  return from.filter((id) => !set.has(id));
}

export function parseIndustryModuleIds(src: string): string[] {
  return [...src.matchAll(/defineIndustryModule\(\{\s*id:\s*'([a-z][a-z0-9_]*)'/g)].map(
    (m) => m[1]
  );
}

export function parseIndustryModuleLoadSpecs(src: string): string[] {
  return [...src.matchAll(/import\(['"](@\/industries\/[^'"]+)['"]\)/g)].map((m) => m[1]);
}

/** industryModules defineIndustryModule 블록에서 AppContent 등록을 파생한다. */
export function parseIndustryModuleApps(src: string): Omit<IndustryModuleAppRecord, 'file'>[] {
  return [...src.matchAll(/defineIndustryModule\(\{([\s\S]*?)\}\s*\)/g)].flatMap((m) => {
    const block = m[1];
    const id = block.match(/\bid:\s*'([a-z][a-z0-9_]*)'/)?.[1];
    if (!id) return [];
    const appExport = block.match(/appExport:\s*'([A-Za-z][A-Za-z0-9]*)'/)?.[1] ?? null;
    const loadAppSpec =
      block.match(/(?:loadViewMap|loadApp):\s*\(\)\s*=>\s*import\(['"](@\/industries\/[^'"]+)['"]\)/)?.[1] ?? null;
    return [
      {
        id,
        appExport: appExport ?? (block.includes('loadViewMap') ? 'default' : null),
        loadAppSpec,
      },
    ];
  });
}

export function parseIndustryModulePluginSymbols(src: string): string[] {
  return [...src.matchAll(/plugin:\s*(\w+PluginManifest)/g)].map((m) => m[1]);
}

export function parseIndustryModulePluginImports(src: string): { symbol: string; path: string }[] {
  return [
    ...src.matchAll(/import\s+\{\s*(\w+PluginManifest)\s*\}\s+from\s+['"](@\/industries\/[^'"]+)['"]/g),
  ].map((m) => ({ symbol: m[1], path: m[2] }));
}

/** 레거시 APP_BY_INDUSTRY 블록 파서 — 픽스처 호환 */
export function parseAppByIndustryEntries(src: string): { id: string; component: string }[] {
  const block = src.match(/const APP_BY_INDUSTRY[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  return [...block.matchAll(/^\s*([a-z][a-z0-9_]*):\s*([A-Z][A-Za-z0-9]*)/gm)].map((m) => ({
    id: m[1],
    component: m[2],
  }));
}

export function parseLoaderExports(src: string): string[] {
  return [...src.matchAll(/export const ([A-Z][A-Za-z0-9]*) = lazy/g)].map((m) => m[1]);
}

export function parseLoaderImportSpecifiers(src: string): string[] {
  return [...src.matchAll(/import\(['"](@\/(?:industries|modules)\/[^'"]+)['"]\)/g)].map((m) => m[1]);
}

export function parsePluginRecord(src: string, file: string): PluginRecord {
  return {
    file,
    id: src.match(/\bid:\s*'([a-z][a-z0-9_]*)'/)?.[1] ?? null,
    optionValue: src.match(/option:\s*\{[\s\S]*?value:\s*'([a-z][a-z0-9_]*)'/)?.[1] ?? null,
    attendanceDefault: (() => {
      const m = src.match(/attendanceDefault:\s*(true|false)/);
      return m ? m[1] === 'true' : null;
    })(),
    syncCapabilities: [
      ...(src.match(/syncCapabilities:\s*\[([^\]]*)\]/)?.[1].matchAll(/'([a-z][a-z0-9_]*)'/g) ?? []),
    ].map((m) => m[1]),
    aliases: [...(src.match(/aliases:\s*\[([^\]]*)\]/)?.[1].matchAll(/'([a-z][a-z0-9_]*)'/g) ?? [])].map(
      (m) => m[1]
    ),
    eagerRegisterImport: /import\s+['"]\.\/sync\/register/.test(src),
    placeLabel: src.match(/placeLabel:\s*'([^']+)'/)?.[1] ?? null,
    ownerLabel: src.match(/ownerLabel:\s*'([^']+)'/)?.[1] ?? null,
    placeNamePlaceholder: src.match(/placeNamePlaceholder:\s*'([^']+)'/)?.[1] ?? null,
    customerLabel: src.match(/customerLabel:\s*'([^']+)'/)?.[1] ?? null,
  };
}

export function parseRegisteredCapabilityIds(src: string): string[] {
  return [...src.matchAll(/registerIndustrySyncCapability\(\{[\s\S]*?id:\s*'([^']+)'/g)].map((m) => m[1]);
}

function walkTsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, out);
      continue;
    }
    if (/\.ts$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

function collectRegisteredCapabilityIds(srcRoot: string): string[] {
  const files = [
    ...walkTsFiles(join(srcRoot, 'industries')),
    ...walkTsFiles(join(srcRoot, 'services/adapters/sync')),
  ];
  const ids = [];
  for (const file of files) {
    ids.push(...parseRegisteredCapabilityIds(readFileSync(file, 'utf8')));
  }
  return uniqueSorted(ids);
}

/** 순수 비교 — 픽스처로 누락 검출을 검증한다. */
export function collectIndustryRegistrationGaps(snap: IndustryRegistrationSnapshot): string[] {
  const gaps: string[] = [];
  const pushMissing = (ids: string[], message: (id: string) => string) => {
    for (const id of uniqueSorted(ids)) gaps.push(message(id));
  };

  pushMissing(
    missing(snap.moduleIds, snap.pluginIds),
    (id) => `catalog에는 있는데 plugin이 없음: ${id} (src/industries/*/plugin.ts 의 id)`
  );
  pushMissing(
    missing(snap.pluginIds, snap.moduleIds),
    (id) => `plugin은 있는데 catalog.moduleId가 없음: ${id} (definitions.ts DEFINITION_LIST)`
  );
  pushMissing(
    missing(snap.moduleIds, snap.registryPluginIds),
    (id) => `plugin은 있는데 registry에 없음: ${id} (industryModules.ts)`
  );
  pushMissing(
    missing(snap.moduleIds, snap.routerKeys),
    (id) => `plugin은 있는데 router에 없음: ${id} (industryModules APP_BY_INDUSTRY)`
  );
  pushMissing(
    missing(snap.routerKeys, snap.moduleIds),
    (id) => `router에는 있는데 catalog.moduleId가 없음: ${id}`
  );
  pushMissing(
    missing(snap.moduleIds, snap.moduleApps.map((app) => app.id)),
    (id) => `catalog에는 있는데 AppContent 등록이 없음: ${id} (industryModules loadApp)`
  );
  for (const app of snap.moduleApps) {
    if (!app.appExport) {
      gaps.push(`AppContent appExport 없음: ${app.id}`);
    }
    if (!app.loadAppSpec) {
      gaps.push(`AppContent loadApp 없음: ${app.id} (industryModules.ts)`);
    }
    if (!app.file) {
      gaps.push(`AppContent 파일 없음: ${app.id} (${app.loadAppSpec ?? 'loadApp missing'})`);
    }
  }
  pushMissing(
    missing(snap.routerComponents, snap.loaderExports),
    (id) => `router에는 있는데 module loader가 없음: ${id} (industryModules.ts)`
  );
  pushMissing(
    missing(snap.loaderExports, snap.routerComponents),
    (id) => `module loader는 있는데 router에 없음: ${id}`
  );

  for (const rec of snap.pluginRecords) {
    const label = rec.id ?? rec.file;
    if (rec.id && rec.optionValue && rec.id !== rec.optionValue) {
      gaps.push(`plugin id ↔ industry type 불일치: ${rec.file} id=${rec.id} option.value=${rec.optionValue}`);
    }
    if (rec.attendanceDefault == null) {
      gaps.push(`업종 기본값 누락: ${rec.file} attendanceDefault`);
    }
    if (rec.id && !rec.placeLabel) {
      gaps.push(`UI 라벨 누락: ${rec.file} placeLabel`);
    }
    if (rec.id && !rec.ownerLabel) {
      gaps.push(`UI 라벨 누락: ${rec.file} ownerLabel`);
    }
    if (rec.id && !rec.placeNamePlaceholder) {
      gaps.push(`UI placeholder 누락: ${rec.file} placeNamePlaceholder`);
    }
    if (rec.id && !rec.customerLabel) {
      gaps.push(`UI 라벨 누락: ${rec.file} customerLabel`);
    }
    if (rec.syncCapabilities.length > 0 && rec.eagerRegisterImport === false) {
      gaps.push(
        `capability 등록 경로 누락: plugin ${label} syncCapabilities 는 있는데 register*Sync 정적 import가 없음 (industryModules는 plugin을 eager import. AppContent lazy만으로는 등록되지 않음)`
      );
    }
    for (const cap of rec.syncCapabilities) {
      if (!snap.registeredCapabilities.includes(cap)) {
        gaps.push(
          `capability 선언 누락: plugin ${label} syncCapabilities "${cap}" 가 registerIndustrySyncCapability 등록에 없음`
        );
      }
    }
    for (const alias of rec.aliases) {
      if (snap.aliases[alias] !== rec.id) {
        gaps.push(
          `plugin alias ↔ canonical 불일치: "${alias}" → 기대 ${rec.id}, 실제 ${snap.aliases[alias] ?? '(없음)'}`
        );
      }
    }
  }

  const declaredCapabilities = uniqueSorted(snap.pluginRecords.flatMap((rec) => rec.syncCapabilities));
  pushMissing(
    missing(snap.registeredCapabilities, declaredCapabilities),
    (id) =>
      `capability 등록 미사용: registerIndustrySyncCapability "${id}" 가 어떤 plugin syncCapabilities에도 없음`
  );

  for (const [alias, target] of Object.entries(snap.aliases)) {
    if (!snap.catalogIds.includes(target)) {
      gaps.push(`alias 대상이 catalog에 없음: "${alias}" → "${target}"`);
    }
    if (snap.catalogIds.includes(alias)) {
      gaps.push(`alias 키가 catalog id와 충돌: "${alias}"`);
    }
  }

  for (const spec of snap.missingLoaderImports) {
    gaps.push(`module loader import 파일 없음: ${spec}`);
  }
  gaps.push(...snap.extraGaps);

  return gaps;
}

function resolveModuleSpecifier(srcRoot: string, spec: string): string | null {
  const rel = spec.replace(/^@\//, '');
  for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
    const full = join(srcRoot, `${rel}${ext}`);
    if (existsSync(full)) return full;
  }
  return null;
}

export function readIndustryRegistrationSnapshot(srcRoot: string): IndustryRegistrationSnapshot {
  const modulesPathTsx = join(srcRoot, 'app/industry/industryModules.tsx');
  const modulesPathTs = join(srcRoot, 'app/industry/industryModules.ts');
  const modulesSrc = readFileSync(existsSync(modulesPathTsx) ? modulesPathTsx : modulesPathTs, 'utf8');
  const registeredCapabilities = collectRegisteredCapabilityIds(srcRoot);

  const compositionIds = parseIndustryModuleIds(modulesSrc);
  const loaderImports = parseIndustryModuleLoadSpecs(modulesSrc);
  const missingLoaderImports = loaderImports.filter((spec) => !resolveModuleSpecifier(srcRoot, spec));

  const industriesDir = join(srcRoot, 'industries');
  const pluginFiles = existsSync(industriesDir)
    ? readdirSync(industriesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(industriesDir, d.name, 'plugin.ts'))
        .filter((file) => existsSync(file))
    : [];

  const pluginRecords = pluginFiles.map((file) =>
    parsePluginRecord(readFileSync(file, 'utf8'), file.replace(/\\/g, '/'))
  );
  const pluginIds = pluginRecords.map((r) => r.id).filter((id): id is string => Boolean(id));

  const compositionImports = parseIndustryModulePluginImports(modulesSrc);
  const compositionSymbols = parseIndustryModulePluginSymbols(modulesSrc);
  const importBySymbol = new Map(compositionImports.map((i) => [i.symbol, i.path]));
  const registryPluginIds: string[] = [];
  const extraGaps: string[] = [];
  for (const symbol of compositionSymbols) {
    const spec = importBySymbol.get(symbol);
    if (!spec) {
      extraGaps.push(`industryModules plugin 심볼 import 없음: ${symbol}`);
      continue;
    }
    const full = resolveModuleSpecifier(srcRoot, spec);
    if (!full) {
      extraGaps.push(`industryModules plugin import 파일 없음: ${spec}`);
      continue;
    }
    const id = parsePluginRecord(readFileSync(full, 'utf8'), spec).id;
    if (id) registryPluginIds.push(id);
  }

  const uniqueIds = uniqueSorted(compositionIds);
  if (uniqueIds.length !== compositionIds.length) {
    extraGaps.push('industryModules industry id가 중복된다');
  }

  const moduleApps: IndustryModuleAppRecord[] = parseIndustryModuleApps(modulesSrc).map((app) => {
    const file = app.loadAppSpec ? resolveModuleSpecifier(srcRoot, app.loadAppSpec) : null;
    if (file && app.appExport) {
      const appSrc = readFileSync(file, 'utf8');
      const exported =
        app.appExport === 'default'
          ? /export\s+default\b/.test(appSrc)
          : appSrc.includes(`export const ${app.appExport}`) ||
            appSrc.includes(`export { ${app.appExport}`) ||
            new RegExp(`export\\s*\\{[^}]*\\b${app.appExport}\\b`).test(appSrc);
      if (!exported) {
        extraGaps.push(`AppContent export 없음: ${app.id} ${app.appExport}`);
      }
    }
    return { ...app, file };
  });

  return {
    catalogIds: [...INDUSTRY_IDS],
    moduleIds: [...MODULE_INDUSTRY_IDS],
    pluginIds,
    registryPluginIds,
    routerKeys: compositionIds,
    routerComponents: compositionIds,
    loaderExports: compositionIds,
    moduleApps,
    pluginRecords,
    registeredCapabilities,
    aliases: { ...INDUSTRY_ALIASES },
    missingLoaderImports,
    extraGaps,
  };
}

export function assertIndustryRegistrationIntegrity(srcRoot?: string): void {
  const root = srcRoot ?? join(dirname(fileURLToPath(import.meta.url)), '../..');
  const gaps = collectIndustryRegistrationGaps(readIndustryRegistrationSnapshot(root));
  if (gaps.length > 0) {
    throw new Error(`업종 등록 누락 (${gaps.length}건)\n- ${gaps.join('\n- ')}`);
  }
}
