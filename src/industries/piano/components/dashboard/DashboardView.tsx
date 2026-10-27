import React from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { StaffDashboardView } from './StaffDashboardView';
import { DirectorTodayHome } from './director';

/**
 * 피아노 홈
 * - 원장/관리자: 오늘 일정·등원·미납·처리할 업무
 * - 강사: 담당 범위 축소 대시보드
 */
export const DashboardView: React.FC = () => {
  const { isStaff } = usePermissions();

  if (isStaff) {
    return (
      <div data-testid="staff-home">
        <StaffDashboardView />
      </div>
    );
  }

  return (
    <div data-testid="director-home">
      <DirectorTodayHome />
    </div>
  );
};
