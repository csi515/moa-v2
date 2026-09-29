import { useMemo } from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { normalizeStaffGrants, type StaffGrants } from '@/core/staff/staffGrants';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from './useStorageRefresh';

/** 원장은 항상 허용. 강사는 자기 Teacher.grants만 씁니다. */
export function useStaffGrants() {
  const { isStaff, staffId } = usePermissions();
  const refreshKey = useStorageRefresh();

  const grants = useMemo(() => {
    if (!isStaff || !staffId) return normalizeStaffGrants(null);
    const teacher = StorageService.getTeachers().find((item) => item.id === staffId);
    return normalizeStaffGrants(teacher?.grants);
  }, [isStaff, staffId, refreshKey]);

  const allow = (key: keyof StaffGrants) => !isStaff || !!grants[key];

  return { isStaff, grants, allow };
}
