import { sanitizeAuditPair } from './sanitize';
import type { WriteAuditLogInput } from './types';

export function buildAuditWriteArgs(input: WriteAuditLogInput) {
  const sanitized = sanitizeAuditPair(input.entityType, input.beforeData, input.afterData);
  return {
    p_organization_id: input.organizationId,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_action: input.action,
    p_location_id: input.locationId ?? null,
    p_before_data: sanitized.beforeData,
    p_after_data: sanitized.afterData,
    p_request_id: input.requestId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  };
}
