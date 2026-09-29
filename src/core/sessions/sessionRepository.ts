import { getCoreClient } from '@/lib/supabase';
import type { CustomerSession, CustomerSessionListQuery, CustomerSessionStatus } from './types';
import { rowToCustomerSession, type CustomerSessionRow } from './sessionMappers';

export async function listCustomerSessions(
  organizationId: string,
  query: CustomerSessionListQuery = {}
): Promise<CustomerSession[]> {
  const client = getCoreClient();
  let builder = client
    .from('customer_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false })
    .limit(query.limit ?? 50);

  if (query.customerId) builder = builder.eq('customer_id', query.customerId);
  if (query.status) builder = builder.eq('status', query.status);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as CustomerSessionRow[] | null) ?? []).map(rowToCustomerSession);
}

export async function getCustomerSessionById(
  organizationId: string,
  sessionId: string
): Promise<CustomerSession | null> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('customer_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCustomerSession(data as CustomerSessionRow) : null;
}

export async function getActiveCustomerSession(
  organizationId: string,
  customerId: string
): Promise<CustomerSession | null> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('customer_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .eq('status', 'active' satisfies CustomerSessionStatus)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCustomerSession(data as CustomerSessionRow) : null;
}

export function listActiveCustomerSessions(organizationId: string): Promise<CustomerSession[]> {
  return listCustomerSessions(organizationId, { status: 'active' });
}
