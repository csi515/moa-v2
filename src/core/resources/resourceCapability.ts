/**
 * 업종 무관 Resource Capability.
 * 카탈로그만 다룬다. 예약은 resourceReservationCapability.
 */
import { windowsFromResourceHours } from '@/core/availability/windows';
import { capacityCapability } from '@/core/capacity';
import {
  getResourceById,
  listBookableResources,
  listPracticeRooms,
  listResources,
  setResourceActive,
  upsertBookableResource,
} from './resourceService';
import { toPracticeRoomRow, toResource } from './resourceMappers';
import { canReserveResource, isResourceSlotAllowed } from './resourcePolicy';
import { RESOURCE_KINDS } from './types';

export const resourceCapability = {
  kinds: RESOURCE_KINDS,
  list: listResources,
  listBookable: listBookableResources,
  getById: getResourceById,
  upsert: upsertBookableResource,
  setActive: setResourceActive,
  listPracticeRooms,
  toResource,
  toPracticeRoom: toPracticeRoomRow,
  availabilityWindows: windowsFromResourceHours,
  canReserve: canReserveResource,
  isSlotAllowed: isResourceSlotAllowed,
  capacitySnapshot: capacityCapability.resourceSnapshot,
} as const;

export type ResourceCapability = typeof resourceCapability;
