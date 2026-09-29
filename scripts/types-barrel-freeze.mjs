/**
 * src/types/index.ts freeze.
 * 허용: 소유 계층 re-export, 남은 Student/Teacher 등 local snapshot.
 * 금지: Industry import, Capability 구현 import, 신규 local domain 정의,
 *       StudentLevel cross-industry union, 신규 계층 파일의 @/types barrel import.
 */
export const FROZEN_TYPES_INDEX_REL = 'src/types/index.ts';

/** barrel에 남겨도 되는 local 정의 이름. 새로 넣지 않는다. */
export const TYPES_BARREL_ALLOWED_LOCAL = new Set([
  'StudentStatus',
  'StudentLevel',
  'Student',
  'Parent',
  'Teacher',
  'ClassItem',
]);

const TYPES_BARREL_LAYERS = new Set(['core', 'capability', 'industry', 'composition']);

export function isTypesBarrelLayer(layer) {
  return TYPES_BARREL_LAYERS.has(layer);
}

export function isTypesBarrelSpecifier(spec) {
  if (!spec) return false;
  return spec === '@/types' || spec === '@/types/index' || spec === '@/types/index.ts';
}

export function isTypesBarrelRelative(fromRel, spec, resolveRel) {
  if (!spec || !spec.startsWith('.')) return false;
  const resolved = resolveRel(fromRel, spec);
  return resolved === 'src/types' || resolved === 'src/types/index';
}

export function isTypesBarrelCapabilityTypeSpec(spec) {
  if (!spec) return false;
  if (!(spec === '@/capabilities' || spec.startsWith('@/capabilities/'))) return false;
  const rest = spec.slice('@/capabilities/'.length);
  if (/\/(types)(?:\/|$)/.test(`/${rest}`) || /(?:^|\/)types$/.test(rest)) return true;
  if (/(?:Type|Types)$/.test(rest.split('/').pop() ?? '')) return true;
  if (rest.includes('/domain/types')) return true;
  if (rest.endsWith('billingLedgerTypes') || rest.endsWith('textbookTypes') || rest.endsWith('paymentMethod')) {
    return true;
  }
  return false;
}

export function isTypesBarrelIndustrySpec(spec) {
  if (!spec) return false;
  return spec === '@/industries' || spec.startsWith('@/industries/') || spec.startsWith('@/modules/');
}

export function typesBarrelLocalDefinitionNames(source) {
  const names = new Set();
  const re =
    /^export\s+(?:type|interface|const|function|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  for (const match of source.matchAll(re)) {
    names.add(match[1]);
  }
  return [...names];
}

export function typesBarrelUnknownLocalDefs(source) {
  return typesBarrelLocalDefinitionNames(source).filter((name) => !TYPES_BARREL_ALLOWED_LOCAL.has(name));
}

export function typesBarrelHasStudentLevelUnion(source) {
  const matches = [...source.matchAll(/export\s+type\s+StudentLevel\s*=\s*([^;]+)/g)];
  for (const match of matches) {
    const rhs = match[1].replace(/\s+/g, ' ').trim();
    if (rhs === 'string') continue;
    if (rhs.includes('|')) return true;
    if (/바이엘|0세반|DaycareAgeClass|PianoStudentLevel|GymClassLevel/.test(rhs)) return true;
  }
  return /export\s+type\s+StudentLevel[\s\S]{0,800}바이엘/.test(source) && /0세반/.test(source);
}

export function typesBarrelCapabilityImplSpecs(source, collectImportSpecs) {
  const blocked = [];
  for (const spec of collectImportSpecs(source)) {
    if (!spec.startsWith('@/capabilities')) continue;
    if (isTypesBarrelCapabilityTypeSpec(spec)) continue;
    blocked.push(spec);
  }
  return blocked;
}
