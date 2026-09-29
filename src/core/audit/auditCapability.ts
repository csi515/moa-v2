/**
 * 테넌트 Audit Log Capability.
 * application log가 아니며, 기존 도메인 쓰기를 교체하지 않는다.
 */
import { auditService } from './auditService';
import { buildAuditWriteArgs } from './auditArgs';
import { writeAuditLog } from './auditWriter';
import { AUDIT_FIELD_ALLOWLIST, AUDIT_PILOT_ENTITIES, isAuditEntityType } from './registry';
import { sanitizeAuditPair, sanitizeAuditPayload } from './sanitize';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './types';

export const auditCapability = {
  entityTypes: AUDIT_ENTITY_TYPES,
  actions: AUDIT_ACTIONS,
  pilots: AUDIT_PILOT_ENTITIES,
  allowlist: AUDIT_FIELD_ALLOWLIST,
  isEntityType: isAuditEntityType,
  sanitize: sanitizeAuditPayload,
  sanitizePair: sanitizeAuditPair,
  write: writeAuditLog,
  buildWriteArgs: buildAuditWriteArgs,
  list: auditService.list,
} as const;

export type AuditCapability = typeof auditCapability;
