/**
 * StorageService 동결 계약.
 * storage.ts는 assembledStorage 재export만. domainFacades Object.assign slice는 이 목록만.
 * 새 domain method / 새 slice는 architecture checker가 실패시킨다.
 */
export const FROZEN_STORAGE_TS_REL = 'src/services/storage.ts';
export const FROZEN_DOMAIN_FACADES_REL = 'src/services/storage/domainFacades.ts';

export const FROZEN_STORAGE_ASSIGN_SLICES = [
  'storageCore',
  'rosterStorage',
  'schedulingStorage',
  'bookingStorage',
  'resourcesStorage',
  'transportStorage',
  'settingsStorage',
  'parentStorage',
  'attendanceStorage',
  'billingStorage',
  'commerceStorage',
  'dashboardStatsStorage',
];

export function storageTsDefinesDomainApi(source, stripComments) {
  const code = stripComments(source);
  if (/\bfunction\b/.test(code)) return 'storage.ts must not declare functions';
  if (/\bObject\.assign\b/.test(code)) return 'storage.ts must not Object.assign slices';
  if (/\bcreate\w+Storage\b/.test(code)) return 'storage.ts must not create domain storage';
  const exportNames = [...code.matchAll(/export\s+(?:const|let|class|enum)\s+(\w+)/g)].map(
    (match) => match[1]
  );
  const extra = exportNames.filter((name) => name !== 'StorageService');
  if (extra.length > 0) return `storage.ts extra export: ${extra.join(', ')}`;
  if (!/export\s+const\s+StorageService\s*=\s*assembledStorage/.test(code)) {
    return 'storage.ts must re-export assembledStorage as StorageService';
  }
  return null;
}

export function domainFacadesUnknownSlices(source) {
  const assign = source.match(/Object\.assign\s*\(([\s\S]*?)\)/);
  if (!assign) return ['domainFacades.ts must Object.assign frozen slices'];
  const ids = [...assign[1].matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g)]
    .map((match) => match[1])
    .filter((id) => id !== 'Object' && id !== 'assign');
  const unknown = [...new Set(ids)].filter((id) => !FROZEN_STORAGE_ASSIGN_SLICES.includes(id));
  return unknown;
}
