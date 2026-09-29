/** @deprecated 신규 코드는 `@/capabilities/scheduling`를 사용한다. */
export {
  UNASSIGNED_STAFF_TOKEN,
  normalizeStaffId,
  buildSlotKey,
  isActiveBookingStatus,
  buildSlotOccupancyIndex,
  groupBookingsIntoSlots,
  findActiveMemberInSlot,
  countSlotOccupancy,
  getSlotCapacityInfo,
} from '@/capabilities/scheduling/capacity/bookingCapacity';
export type { SlotBookingGroup, SlotCapacityInfo } from '@/capabilities/scheduling/capacity/bookingCapacity';
