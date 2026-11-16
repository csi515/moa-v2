import type { StaffGrants } from '@/core/staff/staffGrants';
import type { TeacherPayType } from '@/capabilities/billing/finance/billingLedgerTypes';

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
