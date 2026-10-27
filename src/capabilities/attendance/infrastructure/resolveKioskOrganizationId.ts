import { getOrganizationId } from '@/services/adapters/storageContext';

export type KioskOrgMode = 'standalone' | 'embedded';

/**
 * 키오스크 사업장 ID 해석.
 * standalone: local-org 폴백 금지 / embedded: 로컬 개발 폴백 허용
 */
export function resolveKioskOrganizationId(params: {
  currentOrgId?: string | null;
  storedOrgId?: string | null;
  mode: KioskOrgMode;
}): string {
  const fromContext = params.currentOrgId || params.storedOrgId || null;
  if (fromContext && fromContext !== 'local-org') return fromContext;
  if (params.mode === 'embedded') return fromContext || 'local-org';
  return '';
}

/** Provider + storage 기본 해석 */
export function resolveKioskOrganizationIdFromApp(
  currentOrgId: string | null | undefined,
  mode: KioskOrgMode
): string {
  return resolveKioskOrganizationId({
    currentOrgId,
    storedOrgId: getOrganizationId(),
    mode,
  });
}

export function isKioskOrganizationReady(organizationId: string): boolean {
  return Boolean(organizationId && organizationId !== 'local-org');
}
