import { getBathClient } from '@/lib/supabase/bathClient';
import type { BathRoom, BathRoomListQuery } from '../types/room';
import { rowToBathRoom, type BathRoomRow } from './roomMappers';

export async function listBathRooms(
  organizationId: string,
  query: BathRoomListQuery = {}
): Promise<BathRoom[]> {
  const client = getBathClient();
  let builder = client
    .from('rooms')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('room_number', { ascending: true });

  if (query.active !== undefined) {
    builder = builder.eq('active', query.active);
  }
  if (query.roomType) {
    builder = builder.eq('room_type', query.roomType);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as BathRoomRow[] | null) ?? []).map(rowToBathRoom);
}

export async function getBathRoomById(
  organizationId: string,
  roomId: string
): Promise<BathRoom | null> {
  const client = getBathClient();
  const { data, error } = await client
    .from('rooms')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBathRoom(data as BathRoomRow) : null;
}

export async function getBathRoomByResourceId(
  organizationId: string,
  resourceId: string
): Promise<BathRoom | null> {
  const client = getBathClient();
  const { data, error } = await client
    .from('rooms')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('resource_id', resourceId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBathRoom(data as BathRoomRow) : null;
}
