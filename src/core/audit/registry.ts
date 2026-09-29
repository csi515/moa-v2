/**
 * entity별 before/after 허용 필드.
 * 허용 목록 밖·민감 키는 저장하지 않는다.
 */
import { AUDIT_ENTITY_TYPES, type AuditEntityType } from './types';

export const AUDIT_SENSITIVE_KEYS = [
  'phone',
  'email',
  'password',
  'pin',
  'token',
  'secret',
  'hash',
  'address',
  'ssn',
  'resident',
  'card',
  'account_number',
] as const;

export const AUDIT_FIELD_ALLOWLIST: Record<AuditEntityType, readonly string[]> = {
  customer: ['status'],
  staff: ['status'],
  booking: ['status'],
  reservation: ['status'],
  payment: ['status', 'amount'],
  refund: ['status', 'amount'],
  pass: ['status'],
  membership: ['role', 'is_active', 'staff_id', 'user_id'],
  sale: ['status', 'total'],
  inventory: ['quantity', 'movement_type'],
  permissions: ['permission', 'scope_type', 'scope_id', 'is_active'],
};

export const AUDIT_PILOT_ENTITIES: readonly AuditEntityType[] = ['membership', 'permissions'];

export function isAuditEntityType(value: string | null | undefined): value is AuditEntityType {
  return typeof value === 'string' && (AUDIT_ENTITY_TYPES as readonly string[]).includes(value);
}

export function allowlistForEntity(entityType: string): readonly string[] {
  if (!isAuditEntityType(entityType)) return [];
  return AUDIT_FIELD_ALLOWLIST[entityType];
}
