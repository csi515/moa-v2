/** @deprecated 신규 코드는 `@/capabilities/scheduling`를 사용한다. */
export {
  AVAILABILITY_SOURCE,
  AVAILABILITY_WEEKDAY_LABELS,
  DAY_OF_WEEK_LABELS,
} from '@/core/availability/types';
export type {
  AvailabilityDayOfWeek,
  AvailabilityListQuery,
  AvailabilityOverride,
  AvailabilityOverrideInput,
  AvailabilityResourceWindow,
  AvailabilityRule,
  AvailabilityRuleInput,
  AvailabilitySlotMinutes,
  AvailabilityStaffWindow,
  AvailabilityTimeWindow,
  ResolvedAvailabilityWindow,
} from '@/core/availability/types';
export { getIntervalMinutes, getOverrideWindows } from '@/core/availability/windows';
