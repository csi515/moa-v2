import type { StaffGrants } from './staffGrants';

export type TeacherPayType = 'hourly' | 'attendance' | 'work_hours' | 'monthly' | 'none' | 'percentage';

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email?: string;
  userId?: string | null;
  hireDate: string;
  status: 'active' | 'inactive' | 'resigned';
  specialty?: string;
  salary?: number;
  hourlyRate?: number;
  payType?: TeacherPayType;
  color?: string;
  memo?: string;
  classIds?: string[];
  grants?: StaffGrants;
  defaultScheduleVisibility?: 'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE';
  roleTitle?: string;
  organizationId?: string;
}
