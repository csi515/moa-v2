import { getCoreClient } from '@/lib/supabase';
import { WAITLIST_OPEN_STATUSES } from './types';
import type { WaitlistEntry, WaitlistListQuery, WaitlistStatus } from './types';
import { rowToWaitlistEntry, withDisplayPositions, type WaitlistEntryRow } from './waitlistMappers';

export async function listWaitlistEntries(
  organizationId: string,
  query: WaitlistListQuery = {}
): Promise<WaitlistEntry[]> {
  const client = getCoreClient();
  let builder = client
    .from('waitlist_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .order('position', { ascending: true })
    .limit(query.limit ?? 100);

  if (query.targetType) builder = builder.eq('target_type', query.targetType);
  if (query.targetId) builder = builder.eq('target_id', query.targetId);
  if (query.customerId) builder = builder.eq('customer_id', query.customerId);
  if (query.status) builder = builder.eq('status', query.status);
  if (query.openOnly) builder = builder.in('status', [...WAITLIST_OPEN_STATUSES]);

  const { data, error } = await builder;
  if (error) throw error;
  return withDisplayPositions(((data as WaitlistEntryRow[] | null) ?? []).map(rowToWaitlistEntry));
}

export async function getWaitlistEntryById(
  organizationId: string,
  entryId: string
): Promise<WaitlistEntry | null> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('waitlist_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', entryId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToWaitlistEntry(data as WaitlistEntryRow) : null;
}

export function listOpenWaitlistEntries(
  organizationId: string,
  targetType: string,
  targetId: string
): Promise<WaitlistEntry[]> {
  return listWaitlistEntries(organizationId, { targetType, targetId, openOnly: true });
}

export type { WaitlistStatus };
