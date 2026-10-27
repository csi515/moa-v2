/**
 * Daycare 운영 데이터 row ↔ app 매핑.
 * 알림장/투약 매퍼와 분리한다.
 */
import type { Json } from '@/lib/supabase/database.types';
import type {
  AuthorizedPickup,
  CareIncident,
  CarePickupLog,
  CctvViewRequest,
  ChildLegalRecord,
  MealSampleLog,
  SafetyChecklistItem,
  SafetyInspectionLog,
  StaffHealthCert,
} from '@/industries/daycare/care/types';

type Meta = { studentName?: string; teacherName?: string };

function metaOf(value: Json): Meta {
  return (value || {}) as Meta;
}

function jsonRecord(value: Json): { [key: string]: Json | undefined } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) return {};
  return value;
}

function pickupsOf(value: Json): AuthorizedPickup[] {
  if (!Array.isArray(value)) return [];
  const rows: AuthorizedPickup[] = [];
  for (const item of value) {
    const record = jsonRecord(item);
    if (!record) continue;
    rows.push({
      name: String(record.name || ''),
      relation: String(record.relation || ''),
      phone: String(record.phone || ''),
    });
  }
  return rows;
}

function itemsOf(value: Json): SafetyChecklistItem[] {
  if (!Array.isArray(value)) return [];
  const rows: SafetyChecklistItem[] = [];
  for (const item of value) {
    const record = jsonRecord(item);
    if (!record) continue;
    rows.push({
      key: String(record.key || ''),
      label: String(record.label || ''),
      checked: record.checked === true,
    });
  }
  return rows;
}

export function rowToChildLegalRecord(row: {
  id: string;
  customer_id: string;
  vaccination_checked_at: string | null;
  health_check_date: string | null;
  allergy_note: string | null;
  authorized_pickups: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): ChildLegalRecord {
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: metaOf(row.metadata).studentName || '',
    vaccinationCheckedAt: row.vaccination_checked_at || undefined,
    healthCheckDate: row.health_check_date || undefined,
    allergyNote: row.allergy_note || undefined,
    authorizedPickups: pickupsOf(row.authorized_pickups),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function childLegalRecordToRow(record: ChildLegalRecord, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    customer_id: record.studentId,
    vaccination_checked_at: record.vaccinationCheckedAt || null,
    health_check_date: record.healthCheckDate || null,
    allergy_note: record.allergyNote || null,
    authorized_pickups: record.authorizedPickups as unknown as Json,
    metadata: { studentName: record.studentName } as Json,
  };
}

export function rowToCareIncident(row: {
  id: string;
  customer_id: string;
  occurred_at: string;
  content: string;
  action_taken: string;
  parent_notified_at: string | null;
  staff_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): CareIncident {
  const meta = metaOf(row.metadata);
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    occurredAt: row.occurred_at,
    content: row.content,
    actionTaken: row.action_taken,
    parentNotifiedAt: row.parent_notified_at || undefined,
    teacherId: row.staff_id || undefined,
    teacherName: meta.teacherName || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function careIncidentToRow(record: CareIncident, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    customer_id: record.studentId,
    occurred_at: record.occurredAt,
    content: record.content,
    action_taken: record.actionTaken,
    parent_notified_at: record.parentNotifiedAt || null,
    staff_id: record.teacherId || null,
    metadata: { studentName: record.studentName, teacherName: record.teacherName } as Json,
  };
}

export function rowToStaffHealthCert(row: {
  id: string;
  staff_id: string;
  expires_at: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): StaffHealthCert {
  return {
    id: row.id,
    teacherId: row.staff_id,
    teacherName: metaOf(row.metadata).teacherName || '',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function staffHealthCertToRow(record: StaffHealthCert, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    staff_id: record.teacherId,
    expires_at: record.expiresAt,
    metadata: { teacherName: record.teacherName } as Json,
  };
}

export function rowToSafetyLog(row: {
  id: string;
  log_date: string;
  kind: SafetyInspectionLog['kind'];
  items: Json;
  note: string | null;
  staff_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): SafetyInspectionLog {
  return {
    id: row.id,
    logDate: row.log_date,
    kind: row.kind,
    items: itemsOf(row.items),
    note: row.note || undefined,
    teacherId: row.staff_id || undefined,
    teacherName: metaOf(row.metadata).teacherName || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function safetyLogToRow(record: SafetyInspectionLog, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    log_date: record.logDate,
    kind: record.kind,
    items: record.items as unknown as Json,
    note: record.note || null,
    staff_id: record.teacherId || null,
    metadata: { teacherName: record.teacherName } as Json,
  };
}

export function rowToMealSample(row: {
  id: string;
  menu_name: string;
  stored_at: string;
  dispose_at: string;
  staff_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): MealSampleLog {
  return {
    id: row.id,
    menuName: row.menu_name,
    storedAt: row.stored_at,
    disposeAt: row.dispose_at,
    teacherId: row.staff_id || undefined,
    teacherName: metaOf(row.metadata).teacherName || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mealSampleToRow(record: MealSampleLog, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    menu_name: record.menuName,
    stored_at: record.storedAt,
    dispose_at: record.disposeAt,
    staff_id: record.teacherId || null,
    metadata: { teacherName: record.teacherName } as Json,
  };
}

export function rowToCctvRequest(row: {
  id: string;
  requested_at: string;
  purpose: string;
  applicant_name: string;
  applicant_staff_id: string | null;
  status: CctvViewRequest['status'];
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}): CctvViewRequest {
  return {
    id: row.id,
    requestedAt: row.requested_at,
    purpose: row.purpose,
    applicantName: row.applicant_name,
    applicantTeacherId: row.applicant_staff_id || undefined,
    status: row.status,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function cctvRequestToRow(record: CctvViewRequest, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    requested_at: record.requestedAt,
    purpose: record.purpose,
    applicant_name: record.applicantName,
    applicant_staff_id: record.applicantTeacherId || null,
    status: record.status,
    reviewed_at: record.reviewedAt || null,
    reviewed_by: record.reviewedBy || null,
    metadata: {} as Json,
  };
}

export function rowToPickupLog(row: {
  id: string;
  customer_id: string;
  pickup_date: string;
  picked_up_at: string;
  picker_name: string;
  relation: string;
  outside_consent: boolean;
  staff_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): CarePickupLog {
  const meta = metaOf(row.metadata);
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    pickupDate: row.pickup_date,
    pickedUpAt: row.picked_up_at,
    pickerName: row.picker_name,
    relation: row.relation,
    outsideConsent: row.outside_consent,
    teacherId: row.staff_id || undefined,
    teacherName: meta.teacherName || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function pickupLogToRow(record: CarePickupLog, orgId: string) {
  return {
    id: record.id,
    organization_id: orgId,
    customer_id: record.studentId,
    pickup_date: record.pickupDate,
    picked_up_at: record.pickedUpAt,
    picker_name: record.pickerName,
    relation: record.relation,
    outside_consent: record.outsideConsent,
    staff_id: record.teacherId || null,
    metadata: { studentName: record.studentName, teacherName: record.teacherName } as Json,
  };
}
