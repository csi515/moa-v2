import { getCoreClient } from '@/lib/supabase';
import { rowToLocation, type LocationRow } from './locationMappers';
import type { Location, LocationListQuery } from './types';

export async function listLocations(
  organizationId: string,
  query: LocationListQuery = {}
): Promise<Location[]> {
  const client = getCoreClient();
  let builder = client
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
    .limit(query.limit ?? 100);
  if (query.activeOnly) builder = builder.eq('is_active', true);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as LocationRow[] | null) ?? []).map(rowToLocation);
}

export async function getLocationById(
  organizationId: string,
  locationId: string
): Promise<Location | null> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', locationId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToLocation(data as LocationRow) : null;
}
