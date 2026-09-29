/** 업무 감사 기록. application log와 분리한다. */

export const AUDIT_ENTITY_TYPES = [
  'customer',
  'staff',
  'booking',
  'reservation',
  'payment',
  'refund',
  'pass',
  'membership',
  'sale',
  'inventory',
  'permissions',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'activate',
  'deactivate',
  'role_changed',
  'granted',
  'revoked',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditLog = {
  id: string;
  organizationId: string;
  locationId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  requestId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
};

export type WriteAuditLogInput = {
  organizationId: string;
  entityType: AuditEntityType | string;
  entityId: string;
  action: AuditAction | string;
  locationId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  requestId?: string | null;
  idempotencyKey?: string | null;
};

export type AuditLogQuery = {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  locationId?: string | null;
  limit?: number;
};
