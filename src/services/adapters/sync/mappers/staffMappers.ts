import type {
  AppNotification,
  AttendanceRecord,
  ClassItem,
  Consultation,
  Parent,
  Student,
  TuitionInvoice,
} from '../../../../types';
import type { Json, PaymentMethod as DbPaymentMethod, PaymentStatus } from '../../../../lib/supabase/database.types';
import type { StaffMetadata } from '../../types';
import type { AcademySettings, Teacher } from '../../../../types';
import type { Booking, ServiceOffering } from '../../../../core/types/schedule';
import type { PickupAddress } from '../../../../core/transport/types';


// ─── Staff (Teachers) ───────────────────────────────────────────────

export function teacherToStaffRow(teacher: Teacher, organizationId: string) {
  const metadata: StaffMetadata = {
    hireDate: teacher.hireDate,
    specialty: teacher.specialty,
    salary: teacher.salary,
    hourlyRate: teacher.hourlyRate,
    payType: teacher.payType,
    color: teacher.color,
    memo: teacher.memo,
    classIds: teacher.classIds,
    grants: teacher.grants,
  };

  return {
    id: teacher.id,
    organization_id: organizationId,
    name: teacher.name,
    phone: teacher.phone || null,
    email: teacher.email || null,
    status: teacher.status,
    metadata: metadata as unknown as Json,
  };
}

export function staffRowToTeacher(row: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  user_id?: string | null;
  status: string;
  metadata: Json;
}): Teacher {
  const meta = (row.metadata || {}) as StaffMetadata;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || undefined,
    userId: row.user_id ?? null,
    hireDate: meta.hireDate || new Date().toISOString().slice(0, 10),
    status: (row.status as Teacher['status']) || 'active',
    specialty: meta.specialty,
    salary: meta.salary,
    hourlyRate: meta.hourlyRate,
    payType: meta.payType,
    color: meta.color,
    memo: meta.memo,
    classIds: meta.classIds,
    grants: meta.grants,
  };
}

