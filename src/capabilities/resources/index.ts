export { resourcesCapability } from './manifest';

export {
  PRACTICE_ROOM_RESOURCE_KIND,
  RESOURCE_KINDS,
  RESOURCE_RESERVATION_BLOCKING_STATUSES,
} from './types';
export type {
  BookableResource,
  CreateResourceReservationInput,
  ListResourceReservationsQuery,
  ListResourcesQuery,
  PracticeRoomRow,
  RequestResourceReservationInput,
  Resource,
  ResourceKind,
  ResourceReservation,
  ResourceReservationStatus,
  PracticeRoomBooking,
  PracticeRoomBookingStatus,
  RoomReservationRow,
  UpsertBookableResourceInput,
} from './types';

export {
  isBlockingReservationStatus,
  resourceRangesOverlap,
  resourceReservationsConflict,
} from './overlap';
export { canReserveResource, isResourceSlotAllowed } from './resourcePolicy';
export { toResource, toPracticeRoomRow } from './resourceMappers';
export { mapResourceReservationError } from './reservationErrors';
export { dayRangeSeoul, seoulDateFromIso, seoulTimeFromIso, toSeoulIso } from './seoulTime';
export { resourceCapability } from './resourceCapability';
export type { ResourceCapability } from './resourceCapability';
export { capacityCapability } from '@/capabilities/scheduling/capacity';
export { resourceReservationCapability } from './resourceReservationCapability';
export type { ResourceReservationCapability } from './resourceReservationCapability';
