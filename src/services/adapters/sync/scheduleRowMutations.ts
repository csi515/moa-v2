/**
 * 예약 row-level 원격 변경. snapshot persist / diff-delete 를 타지 않는다.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '../storageContext';
import { bookingToScheduleRow } from './entityMappers';
import type { Booking } from '@/core/types/schedule';

export async function upsertRemoteSchedule(booking: Booking): Promise<boolean> {
  const orgId = getOrganizationId();
  if (!isSupabaseConfigured() || !orgId) return false;
  const client = getCoreClient();
  const { error } = await client
    .from('schedules')
    .upsert(bookingToScheduleRow(booking, orgId));
  if (error) {
    console.error('[schedules] row upsert failed', error);
    return false;
  }
  return true;
}

export async function deleteRemoteSchedule(bookingId: string): Promise<boolean> {
  const orgId = getOrganizationId();
  const id = bookingId?.trim();
  if (!isSupabaseConfigured() || !orgId || !id) return false;
  const client = getCoreClient();
  const { error } = await client
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);
  if (error) {
    console.error('[schedules] row delete failed', error);
    return false;
  }
  return true;
}
