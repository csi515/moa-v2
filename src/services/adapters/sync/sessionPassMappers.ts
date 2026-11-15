import type { SessionPass } from '@/core/types/schedule';
import { todayIsoLocal } from '@/shared/utils/localDate';

export type SessionPassRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  customer_name: string;
  label: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  memo: string | null;
};

/** core.passes 테이블 행 타입 (tenant_id, remaining_count 기반) */
export type PassRow = {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  pass_name: string;
  pass_type?: string;
  total_count: number;
  remaining_count: number;
  status: string;
  is_active?: boolean;
  start_date?: string;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function calculateRemainingSessions(totalSessions: number, usedSessions: number): number {
  return Math.max(0, totalSessions - usedSessions);
}

export function calculateUsedSessions(totalSessions: number, remainingCount: number): number {
  const safeRemaining = Math.max(0, remainingCount);
  return Math.max(0, totalSessions - safeRemaining);
}

export function sessionPassToRow(pass: SessionPass, organizationId: string): SessionPassRow & { updated_at: string } {
  return {
    id: pass.id,
    organization_id: organizationId,
    customer_id: pass.customerId,
    customer_name: pass.customerName,
    label: pass.label,
    total_sessions: pass.totalSessions,
    used_sessions: pass.usedSessions,
    status: pass.status,
    purchased_at: pass.purchasedAt,
    expires_at: pass.expiresAt || null,
    memo: pass.memo || null,
    updated_at: new Date().toISOString(),
  };
}

export function rowToSessionPass(row: SessionPassRow): SessionPass {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || '',
    label: row.label || '',
    totalSessions: Number(row.total_sessions) || 0,
    usedSessions: Number(row.used_sessions) || 0,
    status: row.status as SessionPass['status'],
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at || undefined,
    memo: row.memo || undefined,
  };
}

/**
 * core.passes 행을 도메인 SessionPass 모델로 상호 변환.
 * remaining_count = total_count - used_sessions 정합성 보장.
 */
export function passRowToSessionPass(row: PassRow, customerName = ''): SessionPass {
  const total = Number(row.total_count) || 0;
  const remaining = Number(row.remaining_count) || 0;
  const used = calculateUsedSessions(total, remaining);

  let status: SessionPass['status'] = 'active';
  const rawStatus = (row.status || '').toUpperCase();
  if (rawStatus === 'EXHAUSTED' || remaining <= 0) {
    status = 'exhausted';
  } else if (rawStatus === 'EXPIRED' || rawStatus === 'PAUSED' || row.is_active === false) {
    status = 'cancelled';
  }

  const purchasedAt =
    row.created_at ||
    (row.start_date ? new Date(row.start_date).toISOString() : new Date().toISOString());

  return {
    id: row.id,
    customerId: row.customer_id || '',
    customerName,
    label: row.pass_name || '이용권',
    totalSessions: total,
    usedSessions: used,
    status,
    purchasedAt,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
  };
}

/**
 * 도메인 SessionPass 모델을 core.passes 행 포맷으로 변환.
 * organization_id -> tenant_id 정합성 보장.
 */
export function sessionPassToPassRow(pass: SessionPass, tenantId: string): PassRow {
  const remaining = calculateRemainingSessions(pass.totalSessions, pass.usedSessions);

  let status = 'ACTIVE';
  let isActive = true;

  if (pass.status === 'exhausted' || remaining <= 0) {
    status = 'EXHAUSTED';
    isActive = false;
  } else if (pass.status === 'cancelled') {
    status = 'EXPIRED';
    isActive = false;
  }

  return {
    id: pass.id,
    tenant_id: tenantId,
    customer_id: pass.customerId || null,
    pass_name: pass.label || '이용권',
    pass_type: 'COUNT_BASED',
    total_count: pass.totalSessions,
    remaining_count: remaining,
    status,
    is_active: isActive,
    start_date: pass.purchasedAt ? pass.purchasedAt.slice(0, 10) : todayIsoLocal(),
    expires_at: pass.expiresAt ? pass.expiresAt.slice(0, 10) : null,
    created_at: pass.purchasedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
