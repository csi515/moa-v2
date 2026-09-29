import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { bookingStorage } from '@/capabilities/booking/infrastructure/bookingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import { parentStorage } from '@/capabilities/parent/infrastructure/parentStorage';
import { resourcesStorage } from '@/capabilities/resources/infrastructure/resourcesStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { schedulingStorage } from '@/capabilities/scheduling/infrastructure/schedulingStorage';
import { transportStorage } from '@/capabilities/transport/infrastructure/transportStorage';
import { dashboardStatsStorage } from './dashboardStatsStorage';
import { settingsStorage } from './settingsStorage';
import { storageCore } from './storageApi';

/**
 * Legacy compatibility 조립. 구현 SoT는 각 도메인 싱글톤이다.
 * 새 slice를 여기 Object.assign에 추가하지 않는다. 동결 목록: scripts/storage-facade-freeze.mjs
 * persist/hydrate/sync 의미는 바꾸지 않는다.
 */
export const assembledStorage = Object.assign(
  storageCore,
  rosterStorage,
  schedulingStorage,
  bookingStorage,
  resourcesStorage,
  transportStorage,
  settingsStorage,
  parentStorage,
  attendanceStorage,
  billingStorage,
  commerceStorage,
  dashboardStatsStorage
);

export {
  attendanceStorage,
  billingStorage,
  bookingStorage,
  commerceStorage,
  dashboardStatsStorage,
  parentStorage,
  resourcesStorage,
  rosterStorage,
  schedulingStorage,
  settingsStorage,
  transportStorage,
};
