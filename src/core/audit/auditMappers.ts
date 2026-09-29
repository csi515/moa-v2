import type { AuditLog } from './types';

export type AuditLogRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  request_id: string | null;
  idempotency_key: string | null;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    locationId: row.location_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeData: asRecord(row.before_data),
    afterData: asRecord(row.after_data),
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}
