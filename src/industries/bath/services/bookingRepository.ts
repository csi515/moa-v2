import { getBathClient } from '@/lib/supabase/bathClient';
import type { BathBooking, BathBookingListQuery } from '../types/booking';
import { rowToBathBooking, type BathBookingRow } from './bookingMappers';

export async function listBathBookings(
  organizationId: string,
  query: BathBookingListQuery = {}
): Promise<BathBooking[]> {
  const client = getBathClient();
  let builder = client
    .from('bookings')
    .select('*')
    .eq('organization_id', organizationId)
    .order('starts_at', { ascending: true })
    .limit(200);

  if (query.customerId) builder = builder.eq('customer_id', query.customerId);
  if (query.resourceId) builder = builder.eq('resource_id', query.resourceId);
  if (query.serviceId) builder = builder.eq('service_id', query.serviceId);
  if (query.status) builder = builder.eq('status', query.status);
  if (query.fromIso) builder = builder.gte('starts_at', query.fromIso);
  if (query.toIso) builder = builder.lte('starts_at', query.toIso);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as BathBookingRow[] | null) ?? []).map(rowToBathBooking);
}

export async function getBathBookingById(
  organizationId: string,
  bookingId: string
): Promise<BathBooking | null> {
  const client = getBathClient();
  const { data, error } = await client
    .from('bookings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBathBooking(data as BathBookingRow) : null;
}
