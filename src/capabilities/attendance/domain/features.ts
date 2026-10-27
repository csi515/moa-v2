import type { IndustryType } from '@/core/industry/types';
import { getIndustryPlugin } from '@/core/industry/registry';
import type { AcademySettings } from '@/types';
import type { AttendanceModuleSettings } from './types';
import { resolveAttendanceFeatureEnabled } from './attendanceFeatureFlag';

export {
  resolveAttendanceEnabledForBackfill,
  resolveAttendanceFeatureEnabled,
  withAttendanceModuleEnabled,
} from './attendanceFeatureFlag';

export function getDefaultAttendanceSettings(industry: IndustryType): AttendanceModuleSettings {
  return { enabled: getIndustryPlugin(industry).attendanceDefault };
}

export function isAttendanceModuleEnabled(
  settings: AcademySettings | null | undefined,
  industry: IndustryType | string | null | undefined
): boolean {
  return resolveAttendanceFeatureEnabled(
    settings?.features?.attendance?.enabled,
    getIndustryPlugin(industry).attendanceDefault
  );
}
