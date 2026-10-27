import React from 'react';
import {
  LockerManagementView,
  type LockerRecord,
  type LockerGridStatus,
} from '@/capabilities/locker';

export type LockerStatus = LockerGridStatus;
export type { LockerRecord };

/**
 * LockersGridPage
 *
 * Capability 경계 원칙에 따라 실질적인 업무 로직 및 데이터 접근은
 * `@/capabilities/locker` (LockerManagementView & lockerService)로 위임하고
 * 라우트 엔트리포인트 호환성을 유지합니다.
 */
export const LockersGridPage: React.FC = () => {
  return <LockerManagementView />;
};

export default LockersGridPage;
