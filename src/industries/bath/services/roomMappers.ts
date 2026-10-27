import type { Json } from '@/lib/supabase/database.types';
import type { BathFloorType, BathRoom, BathRoomType } from '../types/room';

export type BathRoomRow = {
  id: string;
  organization_id: string;
  resource_id: string;
  room_number: string;
  name: string;
  room_type: BathRoomType;
  floor_type: BathFloorType;
  capacity: number;
  bathtub_count: number;
  has_scrub_station: boolean;
  has_shower: boolean;
  has_toilet: boolean;
  base_price: number | string;
  active: boolean;
  sort_order: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export function rowToBathRoom(row: BathRoomRow): BathRoom {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    resourceId: row.resource_id,
    roomNumber: row.room_number,
    name: row.name,
    roomType: row.room_type,
    floorType: row.floor_type,
    capacity: row.capacity,
    bathtubCount: row.bathtub_count,
    hasScrubStation: row.has_scrub_station,
    hasShower: row.has_shower,
    hasToilet: row.has_toilet,
    basePrice: Number(row.base_price),
    active: row.active,
    sortOrder: row.sort_order,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
