import { getBathClient } from '@/lib/supabase/bathClient';
import type { BathVisit, BathVisitStatus } from '../types/visit';
import { rowToBathVisit, type BathVisitRow } from './visitMappers';

export type ListBathVisitsQuery = {
  organizationId: string;
  customerId?: string;
  status?: BathVisitStatus;
  limit?: number;
};

export async function listBathVisits(query: ListBathVisitsQuery): Promise<BathVisit[]> {
  const client = getBathClient();
  let builder = client
    .from('visits')
    .select('*')
    .eq('organization_id', query.organizationId)
    .order('check_in_at', { ascending: false })
    .limit(query.limit ?? 50);

  if (query.customerId) {
    builder = builder.eq('customer_id', query.customerId);
  }
  if (query.status) {
    builder = builder.eq('status', query.status);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as BathVisitRow[] | null) ?? []).map(rowToBathVisit);
}

export async function getBathVisitById(
  organizationId: string,
  visitId: string
): Promise<BathVisit | null> {
  const client = getBathClient();
  const { data, error } = await client
    .from('visits')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', visitId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBathVisit(data as BathVisitRow) : null;
}

export async function listOpenBathVisits(organizationId: string): Promise<BathVisit[]> {
  return listBathVisits({ organizationId, status: 'checked_in' });
}
