import type { Json } from '@/lib/supabase/database.types';
import type { CareJournal, MedicationRequest } from '@/industries/daycare/care/types';

type CareJournalRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  journal_date: string;
  mood: CareJournal['mood'];
  meals: string;
  nap: string;
  activities: string;
  bowel: string | null;
  health_note: string | null;
  teacher_note: string;
  staff_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type MedicationRequestRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  request_date: string;
  medicine_name: string;
  dosage: string;
  times: string;
  reason: string;
  guardian_name: string | null;
  status: MedicationRequest['status'];
  administered_at: string | null;
  administered_by: string | null;
  note: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

function readMeta(meta: Json): { studentName?: string; teacherName?: string } {
  return (meta || {}) as { studentName?: string; teacherName?: string };
}

export function rowToCareJournal(row: CareJournalRow): CareJournal {
  const meta = readMeta(row.metadata);
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    journalDate: row.journal_date,
    mood: row.mood,
    meals: row.meals,
    nap: row.nap,
    activities: row.activities,
    bowel: row.bowel || undefined,
    healthNote: row.health_note || undefined,
    teacherNote: row.teacher_note,
    teacherId: row.staff_id || undefined,
    teacherName: meta.teacherName || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function careJournalToRow(journal: CareJournal, orgId: string) {
  return {
    id: journal.id,
    organization_id: orgId,
    customer_id: journal.studentId,
    journal_date: journal.journalDate,
    mood: journal.mood,
    meals: journal.meals,
    nap: journal.nap,
    activities: journal.activities,
    bowel: journal.bowel || null,
    health_note: journal.healthNote || null,
    teacher_note: journal.teacherNote,
    staff_id: journal.teacherId || null,
    metadata: {
      studentName: journal.studentName,
      teacherName: journal.teacherName,
    } as Json,
  };
}

export function rowToMedicationRequest(row: MedicationRequestRow): MedicationRequest {
  const meta = readMeta(row.metadata);
  return {
    id: row.id,
    studentId: row.customer_id,
    studentName: meta.studentName || '',
    requestDate: row.request_date,
    medicineName: row.medicine_name,
    dosage: row.dosage,
    times: row.times,
    reason: row.reason,
    guardianName: row.guardian_name || undefined,
    status: row.status,
    administeredAt: row.administered_at || undefined,
    administeredBy: row.administered_by || undefined,
    note: row.note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function medicationRequestToRow(req: MedicationRequest, orgId: string) {
  return {
    id: req.id,
    organization_id: orgId,
    customer_id: req.studentId,
    request_date: req.requestDate,
    medicine_name: req.medicineName,
    dosage: req.dosage,
    times: req.times,
    reason: req.reason,
    guardian_name: req.guardianName || null,
    status: req.status,
    administered_at: req.administeredAt || null,
    administered_by: req.administeredBy || null,
    note: req.note || null,
    metadata: { studentName: req.studentName } as Json,
  };
}
