import type { SessionPass } from '@/core/types/schedule';

type SessionPassRow = {
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

export function sessionPassToRow(pass: SessionPass, organizationId: string) {
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
