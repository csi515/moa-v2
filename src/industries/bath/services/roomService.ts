/**
 * Bath 객실 카탈로그.
 * 예약 충돌은 resourceReservationCapability. 결제/입실은 다루지 않는다.
 */
import { isSupabaseConfigured } from '@/lib/supabase';
import { getBathClient } from '@/lib/supabase/bathClient';
import { resourceReservationCapability } from '@/core/resources';
import { getOrganizationId } from '@/services/adapters';
import type { ResourceReservation } from '@/core/resources';
import type { BathRoom, BathRoomListQuery, BathRoomWriteInput } from '../types/room';
import { mapBathRoomRpcError } from './roomErrors';
import { rowToBathRoom, type BathRoomRow } from './roomMappers';
import { getBathRoomById, getBathRoomByResourceId, listBathRooms } from './roomRepository';
import { bathRoomValidationMessage, validateBathRoomInput } from './roomValidation';

function requireOrgId(): string {
  if (!isSupabaseConfigured()) {
    throw new Error('온라인 환경에서만 객실을 처리할 수 있습니다.');
  }
  const orgId = getOrganizationId();
  if (!orgId) {
    throw new Error('사업장이 선택되지 않았습니다.');
  }
  return orgId;
}

function assertWrite(input: BathRoomWriteInput): void {
  const decision = validateBathRoomInput(input);
  if (decision.ok === false) {
    throw new Error(bathRoomValidationMessage(decision.reason));
  }
}

async function callRoomRpc(
  name: 'upsert_room' | 'set_room_active' | 'delete_room',
  args: Record<string, unknown>
): Promise<BathRoom | null> {
  const client = getBathClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) {
    throw new Error(mapBathRoomRpcError(error).message);
  }
  if (!data) return null;
  return rowToBathRoom(data as BathRoomRow);
}

function writeArgs(organizationId: string, input: BathRoomWriteInput, id?: string) {
  return {
    p_organization_id: organizationId,
    p_id: id ?? null,
    p_room_number: input.roomNumber.trim(),
    p_name: input.name.trim(),
    p_room_type: input.roomType,
    p_floor_type: input.floorType,
    p_capacity: input.capacity,
    p_bathtub_count: input.bathtubCount ?? 0,
    p_has_scrub_station: input.hasScrubStation ?? false,
    p_has_shower: input.hasShower ?? false,
    p_has_toilet: input.hasToilet ?? false,
    p_base_price: input.basePrice ?? 0,
    p_active: input.active ?? true,
    p_sort_order: input.sortOrder ?? 0,
    p_metadata: input.metadata ?? {},
  };
}

export const bathRoomService = {
  list(query: BathRoomListQuery = {}) {
    return listBathRooms(requireOrgId(), query);
  },

  listActive() {
    return listBathRooms(requireOrgId(), { active: true });
  },

  getById(roomId: string) {
    return getBathRoomById(requireOrgId(), roomId);
  },

  getByResourceId(resourceId: string) {
    return getBathRoomByResourceId(requireOrgId(), resourceId);
  },

  create(input: BathRoomWriteInput): Promise<BathRoom> {
    assertWrite(input);
    return callRoomRpc('upsert_room', writeArgs(requireOrgId(), input)).then((room) => {
      if (!room) throw new Error('객실 저장에 실패했습니다.');
      return room;
    });
  },

  update(roomId: string, input: BathRoomWriteInput): Promise<BathRoom> {
    assertWrite(input);
    return callRoomRpc('upsert_room', writeArgs(requireOrgId(), input, roomId)).then((room) => {
      if (!room) throw new Error('객실 저장에 실패했습니다.');
      return room;
    });
  },

  setActive(roomId: string, active: boolean): Promise<BathRoom> {
    return callRoomRpc('set_room_active', {
      p_organization_id: requireOrgId(),
      p_room_id: roomId,
      p_active: active,
    }).then((room) => {
      if (!room) throw new Error('객실 상태 변경에 실패했습니다.');
      return room;
    });
  },

  remove(roomId: string): Promise<void> {
    return callRoomRpc('delete_room', {
      p_organization_id: requireOrgId(),
      p_room_id: roomId,
    }).then(() => undefined);
  },

  /** 예약 원장은 Capability. 객실에 booked 상태를 두지 않는다. */
  listReservations(roomId: string): Promise<ResourceReservation[]> {
    const organizationId = requireOrgId();
    return getBathRoomById(organizationId, roomId).then((room) => {
      if (!room) throw new Error('객실을 찾을 수 없습니다.');
      return resourceReservationCapability.listReservations({
        organizationId,
        resourceId: room.resourceId,
        order: 'asc',
      });
    });
  },
};
