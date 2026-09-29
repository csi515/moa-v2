export type BathModuleId = 'sauna_jjimjilbang';

export type {
  BathVisit,
  BathVisitStatus,
  BathVisitCheckInInput,
  BathVisitMutationAction,
  BathVisitMutationResult,
} from './visit';

export {
  BATH_FLOOR_TYPES,
  BATH_FLOOR_TYPE_LABELS,
  BATH_ROOM_RESOURCE_KIND,
  BATH_ROOM_TYPES,
  BATH_ROOM_TYPE_LABELS,
} from './room';
export type {
  BathFloorType,
  BathRoom,
  BathRoomListQuery,
  BathRoomType,
  BathRoomWriteInput,
} from './room';

export {
  BATH_SERVICE_CATEGORIES,
  BATH_SERVICE_CATEGORY_LABELS,
} from './service';
export type {
  BathService,
  BathServiceCategory,
  BathServiceListQuery,
  BathServiceTimeSlot,
  BathServiceWriteInput,
} from './service';

export {
  BATH_BOOKING_KINDS,
  BATH_BOOKING_KIND_LABELS,
  STAFF_RESOURCE_KIND,
} from './booking';
export type {
  BathAvailabilityQuery,
  BathBooking,
  BathBookingCreateInput,
  BathBookingKind,
  BathBookingListQuery,
  BathBookingStatus,
} from './booking';
