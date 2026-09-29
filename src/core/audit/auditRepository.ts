import { getCoreClient } from '@/lib/supabase';
import { rowToAuditLog, type AuditLogRow } from './auditMappers';
import type { AuditLog, AuditLogQuery } from './types';

export async function listAuditLogs(query: AuditLogQuery): Promise<AuditLog[]> {
  const client = getCoreClient();
  let builder = client
    .from('audit_logs')
    .select(
      'id, organization_id, location_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, request_id, idempotency_key, created_at'
    )
    .eq('organization_id', query.organizationId)
    .order('created_at', { ascending: false })
    .limit(query.limit ?? 50);

  if (query.entityType) builder = builder.eq('entity_type', query.entityType);
  if (query.entityId) builder = builder.eq('entity_id', query.entityId);
  if (query.actorUserId) builder = builder.eq('actor_user_id', query.actorUserId);
  if (query.locationId) builder = builder.eq('location_id', query.locationId);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as AuditLogRow[] | null) ?? []).map(rowToAuditLog);
}
