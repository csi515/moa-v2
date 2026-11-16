/**
 * Audit Export Interceptor
 * 
 * 제로 트러스트 보안:
 * 대량 개인정보/재무 엑셀 다운로드 시 프론트엔드 인터셉터가 RLS 기반 불변 감사 로그(Audit Log)
 * RPC를 성공적으로 호출했을 때만 파일 스트림/다운로드가 열리도록 순서를 강제 보장함.
 */

import { supabase } from '@/lib/supabase/client';
import { callRpc } from '@/shared/kernel';

export type AuditableEntityType =
  | 'customer'
  | 'staff'
  | 'booking'
  | 'reservation'
  | 'payment'
  | 'refund'
  | 'pass'
  | 'membership'
  | 'sale'
  | 'inventory'
  | 'permissions';

export interface AuditExportPayload {
  organizationId: string;
  entityType: AuditableEntityType;
  entityId?: string;
  action?: string;
  locationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRpcResult {
  ok: boolean;
  auditLogId?: string;
  error?: string;
}

export type AuditRpcCaller = (
  organizationId: string,
  entityType: AuditableEntityType,
  entityId: string,
  action: string,
  locationId?: string,
  afterData?: Record<string, unknown>
) => Promise<string | null>;

/**
 * 기본 Supabase append_audit_log RPC 호출자
 */
export const defaultSupabaseAuditCaller: AuditRpcCaller = async (
  organizationId,
  entityType,
  entityId,
  action,
  locationId,
  afterData
) => {
  const { data, error } = await callRpc<string>(supabase, 'append_audit_log', {
    p_organization_id: organizationId,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_location_id: locationId ?? null,
    p_after_data: afterData ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Audit log generation failed');
  }

  return data as string;
};

/**
 * 대량 엑셀 다운로드 인터셉터
 * 감사 로그 저장이 성공해야만 exportCallback(파일 스트림/Blob 다운로드)이 실행된다.
 */
export async function interceptExportWithAudit<T>(
  payload: AuditExportPayload,
  exportCallback: () => Promise<T> | T,
  customAuditCaller?: AuditRpcCaller
): Promise<T> {
  if (!payload.organizationId) {
    throw new Error('Organization ID is required for audited export');
  }

  const caller = customAuditCaller ?? defaultSupabaseAuditCaller;
  const action = payload.action ?? 'excel_export';
  const entityId = payload.entityId ?? `bulk_export_${Date.now()}`;

  // 1. 불변 감사 로그 기록 (선행 필수 조건)
  try {
    const logId = await caller(
      payload.organizationId,
      payload.entityType,
      entityId,
      action,
      payload.locationId,
      payload.metadata
    );

    if (!logId) {
      throw new Error('감사 로그 식별자 발급 실패: 다운로드가 중단되었습니다.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[보안 통제] 감사 로그 기록 실패로 파일 다운로드가 차단되었습니다: ${message}`);
  }

  // 2. 감사 로그 기록 성공 후에만 실제 파일 스트림/생성 실행
  return await exportCallback();
}
