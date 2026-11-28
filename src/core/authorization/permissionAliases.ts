/**
 * Phase 4: 레거시 RolePermissionKey / colon 키 → canonical Permission.
 * SQL core.permission_key_aliases 와 동기화 유지.
 */

import { isKnownPermission } from './registry';
import type { Permission } from './types';

/** legacy → canonical (registry Permission 또는 확장 키) */
export const PERMISSION_KEY_ALIASES: Record<string, string> = {
  billing_invoices: 'finance.read',
  'billing:invoices:read': 'finance.read',
  statistics: 'reports.read',
  members_manage: 'staff.manage',
  'members:manage': 'staff.manage',
  resources_manage: 'rooms.manage',
  'resources:manage': 'rooms.manage',
  sales: 'sales.read',
  finance: 'finance.read',
  'inventory.manage': 'inventory.write',
};

/** canonical → 대표 레거시 키 (역할 매트릭스 평가용) */
export const CANONICAL_TO_LEGACY_MATRIX: Record<string, string> = {
  'finance.read': 'billing_invoices',
  'reports.read': 'statistics',
  'staff.manage': 'members_manage',
  'rooms.manage': 'resources_manage',
};

export function resolveCanonicalPermissionKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim();
  if (!key) return null;
  return PERMISSION_KEY_ALIASES[key] ?? key;
}

export function resolveCanonicalPermission(raw: string | null | undefined): Permission | null {
  const resolved = resolveCanonicalPermissionKey(raw);
  if (!resolved) return null;
  if (isKnownPermission(resolved)) return resolved;
  return null;
}

/** 매트릭스 boolean 키가 해당 canonical을 만족하는지 */
export function matrixKeySatisfiesCanonical(
  matrixFlags: Record<string, boolean> | null | undefined,
  canonical: string
): boolean {
  if (!matrixFlags) return false;
  if (matrixFlags[canonical] === true) return true;
  const legacy = CANONICAL_TO_LEGACY_MATRIX[canonical];
  if (legacy && matrixFlags[legacy] === true) return true;
  for (const [legacyKey, canon] of Object.entries(PERMISSION_KEY_ALIASES)) {
    if (canon === canonical && matrixFlags[legacyKey] === true) return true;
  }
  return false;
}
