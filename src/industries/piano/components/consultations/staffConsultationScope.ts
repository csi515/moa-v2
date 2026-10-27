import type { CustomerJoinRequest, ReservationDetail, Student } from '@/types';

function digits(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

function compactName(value?: string | null): string {
  return (value || '').replace(/\s/g, '').toLowerCase();
}

export function assignedStudentKeys(students: Student[]) {
  const names = new Set<string>();
  const phones = new Set<string>();
  for (const student of students) {
    const name = compactName(student.name);
    if (name) names.add(name);
    const parentName = compactName(student.parentName);
    if (parentName) names.add(parentName);
    for (const raw of [student.phone, student.parentPhone, student.emergencyContact]) {
      const phone = digits(raw);
      if (phone.length >= 8) phones.add(phone);
    }
  }
  return { names, phones };
}

function matchesName(text: string | null | undefined, names: Set<string>): boolean {
  const compact = compactName(text);
  if (!compact) return false;
  for (const name of names) {
    if (compact.includes(name) || name.includes(compact)) return true;
  }
  return false;
}

function matchesPhone(text: string | null | undefined, phones: Set<string>): boolean {
  const phone = digits(text);
  if (phone.length < 8) return false;
  for (const known of phones) {
    if (phone.endsWith(known) || known.endsWith(phone)) return true;
  }
  return false;
}

function metadataCounselorId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const raw = metadata.counselorId ?? metadata.counselor_id ?? metadata.staffId ?? metadata.staff_id;
  return typeof raw === 'string' && raw ? raw : null;
}

/** 담당 학생이거나 상담 담당이 본인인 예약만 */
export function reservationBelongsToStaff(
  row: ReservationDetail,
  staffId: string,
  students: Student[],
  scheduleIds: Set<string>
): boolean {
  if (scheduleIds.has(row.schedule_id)) return true;
  if (metadataCounselorId(row.metadata) === staffId) return true;
  const { names, phones } = assignedStudentKeys(students);
  return (
    matchesName(row.applicant_name, names) ||
    matchesPhone(row.applicant_phone, phones)
  );
}

/** 담당 학생이거나 상담 담당이 본인인 문의만 */
export function inquiryBelongsToStaff(
  row: CustomerJoinRequest,
  staffId: string,
  students: Student[]
): boolean {
  if (metadataCounselorId(row.customer_metadata) === staffId) return true;
  const { names, phones } = assignedStudentKeys(students);
  return (
    matchesName(row.applicant_name, names) ||
    matchesPhone(row.applicant_phone, phones) ||
    matchesName(row.message, names)
  );
}
