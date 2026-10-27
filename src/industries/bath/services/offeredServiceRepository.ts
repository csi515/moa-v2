import { getBathClient } from '@/lib/supabase/bathClient';
import type { BathService, BathServiceListQuery } from '../types/service';
import { rowToBathService, type BathServiceRow } from './offeredServiceMappers';

type LinkRow = { service_id: string; resource_id?: string; staff_id?: string };

async function loadServiceLinks(
  organizationId: string,
  serviceIds: string[]
): Promise<{ resources: Map<string, string[]>; staff: Map<string, string[]> }> {
  const resources = new Map<string, string[]>();
  const staff = new Map<string, string[]>();
  if (serviceIds.length === 0) return { resources, staff };

  const client = getBathClient();
  const [resourceRes, staffRes] = await Promise.all([
    client
      .from('service_resources')
      .select('service_id, resource_id')
      .eq('organization_id', organizationId)
      .in('service_id', serviceIds),
    client
      .from('service_staff')
      .select('service_id, staff_id')
      .eq('organization_id', organizationId)
      .in('service_id', serviceIds),
  ]);
  if (resourceRes.error) throw resourceRes.error;
  if (staffRes.error) throw staffRes.error;

  for (const row of (resourceRes.data as LinkRow[] | null) ?? []) {
    const list = resources.get(row.service_id) ?? [];
    if (row.resource_id) list.push(row.resource_id);
    resources.set(row.service_id, list);
  }
  for (const row of (staffRes.data as LinkRow[] | null) ?? []) {
    const list = staff.get(row.service_id) ?? [];
    if (row.staff_id) list.push(row.staff_id);
    staff.set(row.service_id, list);
  }
  return { resources, staff };
}

function withLinks(
  rows: BathServiceRow[],
  links: { resources: Map<string, string[]>; staff: Map<string, string[]> }
): BathService[] {
  return rows.map((row) =>
    rowToBathService({
      ...row,
      resource_ids: links.resources.get(row.id) ?? row.resource_ids ?? [],
      staff_ids: links.staff.get(row.id) ?? row.staff_ids ?? [],
    })
  );
}

export async function listBathServices(
  organizationId: string,
  query: BathServiceListQuery = {}
): Promise<BathService[]> {
  const client = getBathClient();
  let builder = client
    .from('services')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (query.active !== undefined) builder = builder.eq('active', query.active);
  if (query.category) builder = builder.eq('category', query.category);

  const { data, error } = await builder;
  if (error) throw error;
  const rows = (data as BathServiceRow[] | null) ?? [];
  const links = await loadServiceLinks(
    organizationId,
    rows.map((row) => row.id)
  );
  return withLinks(rows, links);
}

export async function getBathServiceById(
  organizationId: string,
  serviceId: string
): Promise<BathService | null> {
  const client = getBathClient();
  const { data, error } = await client
    .from('services')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', serviceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as BathServiceRow;
  const links = await loadServiceLinks(organizationId, [row.id]);
  return withLinks([row], links)[0] ?? null;
}
