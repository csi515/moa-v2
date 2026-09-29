/**
 * 업종 무관 Availability Capability.
 * 기존 availability_rules / availability_overrides 와 시간창 판정을 묶는다.
 * 업종명 분기를 두지 않는다. 새 테이블/RPC를 만들지 않는다.
 */
import { availabilityService } from './availabilityService';
import { materializeAvailabilitySlots } from './materializeAvailabilitySlots';
import { AVAILABILITY_SOURCE } from './types';
import type { AvailabilityListQuery } from './types';
import {
  chunkSlots,
  getIntervalMinutes,
  getOverrideWindows,
  isClosedOnDate,
  isOutsideAvailabilityWindows,
  isOutsideResourceHours,
  isOutsideStaffHours,
  resolveWindowsForDate,
  windowsFromResourceHours,
} from './windows';

export const availabilityCapability = {
  listRules: availabilityService.listRules.bind(availabilityService),
  createRule: availabilityService.createRule.bind(availabilityService),
  deactivateRulesForDay: availabilityService.deactivateRulesForDay.bind(availabilityService),
  deactivateRule: availabilityService.deactivateRule.bind(availabilityService),
  listOverrides: availabilityService.listOverrides.bind(availabilityService),
  upsertOverride: availabilityService.upsertOverride.bind(availabilityService),
  deactivateOverride: availabilityService.deactivateOverride.bind(availabilityService),
  listOrgRules(organizationId: string, activeOnly = true) {
    return availabilityService.listRules(organizationId, {
      activeOnly,
      staffId: null,
    } satisfies AvailabilityListQuery);
  },
  listOrgOverrides(organizationId: string, fromDate?: string, activeOnly = true) {
    return availabilityService.listOverrides(organizationId, fromDate, {
      activeOnly,
      staffId: null,
    });
  },
  materializeSlots: materializeAvailabilitySlots,
  getIntervalMinutes,
  getOverrideWindows,
  resolveWindowsForDate,
  chunkSlots,
  isClosedOnDate,
  isOutsideAvailabilityWindows,
  isOutsideStaffHours,
  isOutsideResourceHours,
  windowsFromResourceHours,
  source: AVAILABILITY_SOURCE,
} as const;

export type AvailabilityCapability = typeof availabilityCapability;
