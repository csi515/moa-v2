import { getCoreClient } from '@/lib/supabase';

export type AdminAuditAction =
  | 'SUSPEND_TENANT'
  | 'ACTIVATE_TENANT'
  | 'APPROVE_MANUAL_PAYMENT'
  | 'CHANGE_SUBSCRIPTION_PLAN'
  | 'IMPERSONATE_LOGIN'
  | 'UPDATE_TENANT_ADDONS';

export interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: AdminAuditAction;
  targetOrgId: string;
  targetOrgName?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const AUDIT_STORAGE_KEY = 'moa_admin_audit_logs';

/**
 * 슈퍼 관리자의 주요 행위(상태 변경, 결제 승인, 대리 로그인 등)를 감사 로그로 기록합니다.
 */
export async function logAdminAuditAction(params: {
  adminId: string;
  action: AdminAuditAction;
  targetOrgId: string;
  targetOrgName?: string;
  details?: Record<string, unknown>;
}): Promise<AdminAuditEntry> {
  const entry: AdminAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminId: params.adminId,
    action: params.action,
    targetOrgId: params.targetOrgId,
    targetOrgName: params.targetOrgName,
    details: params.details || {},
    timestamp: new Date().toISOString(),
  };

  // 1. 콘솔 감사 출력
  console.info('[AdminAudit]', JSON.stringify(entry));

  // 2. 로컬 영속 로그 저장 (최신 500건 링버퍼)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const list: AdminAuditEntry[] = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      if (list.length > 500) list.length = 500;
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save admin audit entry to localStorage:', e);
    }
  }

  // 3. Supabase audit_logs 비동기 적재
  try {
    const client = getCoreClient();
    await client.from('audit_logs').insert({
      organization_id: params.targetOrgId,
      actor_id: params.adminId,
      action: params.action,
      entity_type: 'tenant',
      entity_id: params.targetOrgId,
      metadata: {
        ...params.details,
        target_org_name: params.targetOrgName,
      },
    } as any);
  } catch (err) {
    console.warn('Failed to write to core.audit_logs in Supabase:', err);
  }

  return entry;
}

export function getLocalAdminAuditLogs(): AdminAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
