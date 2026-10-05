import { useMemo } from 'react';
import type { IndustryType } from '@/core/industry/types';
import { isAttendanceModuleEnabled } from '@/capabilities/attendance/features';
import { applyStaffGrantTabs, normalizeStaffGrants } from '@/core/staff/staffGrants';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { StorageService } from '@/services/storage';
import type { AcademySettings } from '@/core/organizations/settingsTypes';
import {
  getAllowedTabs,
  getDefaultTab,
  getUserRoleBadge,
  getUserRoleLabel,
  isParentRole,
  isStaffRole,
} from './permissions';

export type NavigationPermissionState = {
  settings: AcademySettings;
  allowedTabs: ReturnType<typeof getAllowedTabs>;
  defaultTab: ReturnType<typeof getDefaultTab>;
  roleLabel: string;
  roleBadge: string;
  attendanceEnabled: boolean;
  isStaff: boolean;
  isParent: boolean;
};

/** UX-only role and navigation data; it does not evaluate data permissions. */
export function useNavigationPermissions(input: {
  role: string | null | undefined;
  staffId: string | null;
  industry: IndustryType;
}): NavigationPermissionState {
  const refreshKey = useStorageRefresh('settings');
  const settings = StorageService.getSettings();
  const staffGrants = useMemo(() => {
    if (!isStaffRole(input.role) || !input.staffId) return null;
    const teacher = StorageService.getTeachers().find((item) => item.id === input.staffId);
    return normalizeStaffGrants(teacher?.grants);
  }, [input.role, input.staffId, refreshKey]);
  const isStaff = isStaffRole(input.role);

  const allowedTabs = useMemo(
    () => applyStaffGrantTabs(getAllowedTabs(input.role, input.industry, settings), staffGrants, isStaff),
    // settings is storage-backed; feature changes are represented by refreshKey below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.role, input.industry, settings.features?.attendance?.enabled, refreshKey, staffGrants, isStaff]
  );
  const attendanceEnabled = useMemo(
    () => isAttendanceModuleEnabled(settings, input.industry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.features?.attendance?.enabled, input.industry, refreshKey]
  );

  return {
    settings,
    allowedTabs,
    defaultTab: getDefaultTab(input.role, input.industry),
    roleLabel: getUserRoleLabel(input.role, input.industry),
    roleBadge: getUserRoleBadge(input.role, input.industry),
    attendanceEnabled,
    isStaff,
    isParent: isParentRole(input.role),
  };
}
