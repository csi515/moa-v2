/**
 * 업종 무관 Waitlist Capability.
 * Booking/Resource Reservation을 복제하지 않는다.
 */
import {
  claimVacancySequentially,
  displayPositionOf,
  evaluateWaitlistAssign,
  evaluateWaitlistCancel,
  evaluateWaitlistExpire,
  evaluateWaitlistJoin,
  evaluateWaitlistNotify,
  nextWaitlistPosition,
  pickNextForVacancy,
  resequenceOpenEntries,
} from './transitions';
import { WAITLIST_OPEN_STATUSES, WAITLIST_STATUSES, WAITLIST_TARGET_TYPES } from './types';
import { waitlistService } from './waitlistService';

export const waitlistCapability = {
  statuses: WAITLIST_STATUSES,
  openStatuses: WAITLIST_OPEN_STATUSES,
  targetTypes: WAITLIST_TARGET_TYPES,
  list: waitlistService.list,
  listOpen: waitlistService.listOpen,
  getById: waitlistService.getById,
  join: waitlistService.join,
  cancel: waitlistService.cancel,
  expire: waitlistService.expire,
  notify: waitlistService.notify,
  claimVacancy: waitlistService.claimVacancy,
  evaluateJoin: evaluateWaitlistJoin,
  evaluateCancel: evaluateWaitlistCancel,
  evaluateExpire: evaluateWaitlistExpire,
  evaluateNotify: evaluateWaitlistNotify,
  evaluateAssign: evaluateWaitlistAssign,
  nextPosition: nextWaitlistPosition,
  resequence: resequenceOpenEntries,
  displayPosition: displayPositionOf,
  pickNext: pickNextForVacancy,
  claimSequential: claimVacancySequentially,
} as const;

export type WaitlistCapability = typeof waitlistCapability;
