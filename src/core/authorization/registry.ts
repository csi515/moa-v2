/**
 * 권한 카탈로그 — 프론트와 DB가 같은 key를 쓴다.
 * SQL core.permission_catalog 시드와 키가 일치해야 한다.
 */
import { AUTH_SCOPE_TYPES, type Permission, type PermissionDefinition } from './types';

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { key: 'customers.read', resource: 'customers', action: 'read', description: '고객 조회' },
  { key: 'customers.write', resource: 'customers', action: 'write', description: '고객 생성·수정' },
  { key: 'sales.read', resource: 'sales', action: 'read', description: '판매 조회' },
  { key: 'sales.create', resource: 'sales', action: 'create', description: '판매 생성' },
  { key: 'sales.refund', resource: 'sales', action: 'refund', description: '판매 반품·환불' },
  { key: 'locations.read', resource: 'locations', action: 'read', description: '지점 접근' },
  { key: 'rooms.read', resource: 'rooms', action: 'read', description: '객실·공간 조회' },
  { key: 'rooms.manage', resource: 'rooms', action: 'manage', description: '객실·공간 관리' },
  { key: 'staff.read', resource: 'staff', action: 'read', description: '직원 조회' },
  { key: 'staff.manage', resource: 'staff', action: 'manage', description: '직원 관리' },
  { key: 'reports.read', resource: 'reports', action: 'read', description: '리포트 조회' },
  { key: 'finance.read', resource: 'finance', action: 'read', description: '회계·정산 조회' },
] as const;

export const PERMISSION_KEYS: readonly Permission[] = PERMISSION_DEFINITIONS.map((row) => row.key);

const PERMISSION_SET = new Set<string>(PERMISSION_KEYS);

export function isKnownPermission(value: string | null | undefined): value is Permission {
  return typeof value === 'string' && PERMISSION_SET.has(value);
}

export function isKnownScopeType(value: string | null | undefined): value is (typeof AUTH_SCOPE_TYPES)[number] {
  return typeof value === 'string' && (AUTH_SCOPE_TYPES as readonly string[]).includes(value);
}

export function getPermissionDefinition(key: string): PermissionDefinition | null {
  return PERMISSION_DEFINITIONS.find((row) => row.key === key) ?? null;
}
