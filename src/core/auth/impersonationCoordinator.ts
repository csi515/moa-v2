/**
 * 최고 관리자 테넌트 대리 접속(Impersonation / Ghost Login) 코디네이터
 */

const IMPERSONATION_KEY = 'moa_impersonation_active';
const IMPERSONATION_ORG_NAME_KEY = 'moa_impersonation_org_name';
const IMPERSONATION_ORG_ID_KEY = 'moa_impersonation_org_id';
const IMPERSONATION_ADMIN_EMAIL_KEY = 'moa_impersonation_admin_email';

export interface ImpersonationState {
  isActive: boolean;
  orgId: string | null;
  orgName: string | null;
  adminEmail: string | null;
}

function getSessionStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).sessionStorage) {
    return (globalThis as any).sessionStorage as Storage;
  }
  return null;
}

function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage as Storage;
  }
  return null;
}

export function startImpersonation(
  targetOrgId: string,
  targetOrgName: string,
  adminEmail: string
): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  if (!session) return;
  try {
    session.setItem(IMPERSONATION_KEY, 'true');
    session.setItem(IMPERSONATION_ORG_ID_KEY, targetOrgId);
    session.setItem(IMPERSONATION_ORG_NAME_KEY, targetOrgName);
    session.setItem(IMPERSONATION_ADMIN_EMAIL_KEY, adminEmail);
    // 현재 접속 사업장 ID 동기화
    local?.setItem('moa_current_organization_id', targetOrgId);
  } catch (err) {
    console.error('Failed to start impersonation:', err);
  }
}

export function stopImpersonation(): void {
  const session = getSessionStorage();
  if (!session) return;
  try {
    session.removeItem(IMPERSONATION_KEY);
    session.removeItem(IMPERSONATION_ORG_ID_KEY);
    session.removeItem(IMPERSONATION_ORG_NAME_KEY);
    session.removeItem(IMPERSONATION_ADMIN_EMAIL_KEY);
  } catch (err) {
    console.error('Failed to stop impersonation:', err);
  }
}

export function getImpersonationState(): ImpersonationState {
  const session = getSessionStorage();
  if (!session) {
    return { isActive: false, orgId: null, orgName: null, adminEmail: null };
  }
  try {
    const isActive = session.getItem(IMPERSONATION_KEY) === 'true';
    if (!isActive) {
      return { isActive: false, orgId: null, orgName: null, adminEmail: null };
    }
    return {
      isActive: true,
      orgId: session.getItem(IMPERSONATION_ORG_ID_KEY),
      orgName: session.getItem(IMPERSONATION_ORG_NAME_KEY),
      adminEmail: session.getItem(IMPERSONATION_ADMIN_EMAIL_KEY),
    };
  } catch {
    return { isActive: false, orgId: null, orgName: null, adminEmail: null };
  }
}
