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


// ─── Customers (Students / Parents) ───────────────────────────────

interface CustomerMetadata {
  entityType?: 'student' | 'parent';
  studentNumber?: string;
  gender?: 'M' | 'F';
  birthDate?: string;
  school?: string;
  grade?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  joinDate?: string;
  leaveDate?: string;
  level?: string;
  tuitionFee?: number;
  paymentDay?: number;
  billingMode?: string;
  specialNotes?: string;
  avatarColor?: string;
  teacherId?: string;
  teacherName?: string;
  classIds?: string[];
  emergencyContact?: string;
  address?: string;
  studentPhone?: string;
  studentIds?: string[];
  notes?: string;
  usesShuttleService?: boolean;
  pickupAddresses?: PickupAddress[];
}

export function selectedStudentGender(value: string | null | undefined): 'M' | 'F' | null {
  return value === 'M' || value === 'F' ? value : null;
}

export function studentToCustomerRow(student: Student, organizationId: string) {
  const gender = selectedStudentGender(student.gender);
  const metadata: CustomerMetadata = {
    entityType: 'student',
    studentNumber: student.studentNumber,
    ...(gender ? { gender } : {}),
    birthDate: student.birthDate,
    school: student.school,
    grade: student.grade,
    joinDate: student.joinDate,
    leaveDate: student.leaveDate,
    level: student.level,
    tuitionFee: student.tuitionFee,
    paymentDay: student.paymentDay,
    billingMode: student.billingMode || 'monthly',
    specialNotes: student.specialNotes,
    avatarColor: student.avatarColor,
    teacherId: student.teacherId,
    teacherName: student.teacherName,
    classIds: student.classIds,
    emergencyContact: student.emergencyContact,
    address: student.address,
    studentPhone: student.phone,
    usesShuttleService: student.usesShuttleService,
    pickupAddresses: student.pickupAddresses,
  };

  return {
    id: student.id,
    organization_id: organizationId,
    name: student.name,
    phone: student.phone || null,
    email: null,
    status: student.status,
    metadata: metadata as unknown as Json,
    memo: student.memo || null,
  };
}

export function customerRowToStudent(
  row: {
    id: string;
    name: string;
    phone: string | null;
    status: string;
    metadata: Json;
    memo: string | null;
    created_at: string;
    updated_at: string;
  },
  parentName?: string
): Student {
  const meta = (row.metadata || {}) as CustomerMetadata;
  return {
    id: row.id,
    studentNumber: meta.studentNumber || '',
    name: row.name,
    gender: selectedStudentGender(meta.gender) ?? ('' as Student['gender']),
    birthDate: meta.birthDate || '',
    school: meta.school || '',
    grade: meta.grade || '',
    parentId: meta.parentId,
    parentName: meta.parentName || parentName || '',
    parentPhone: meta.parentPhone || '',
    phone: meta.studentPhone || undefined,
    emergencyContact: meta.emergencyContact,
    address: meta.address,
    usesShuttleService: meta.usesShuttleService,
    pickupAddresses: meta.pickupAddresses,
    joinDate: meta.joinDate || row.created_at.slice(0, 10),
    leaveDate: meta.leaveDate,
    status: (row.status as Student['status']) || 'active',
    teacherId: meta.teacherId || '',
    teacherName: meta.teacherName || '',
    classIds: meta.classIds || [],
    level: meta.level || '바이엘 상',
    tuitionFee: meta.tuitionFee ?? 180000,
    paymentDay: meta.paymentDay ?? 25,
    billingMode: meta.billingMode === 'session_pass' ? 'session_pass' : 'monthly',
    specialNotes: meta.specialNotes,
    memo: row.memo || undefined,
    avatarColor: meta.avatarColor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parentToCustomerRow(parent: Parent, organizationId: string) {
  const metadata: CustomerMetadata = {
    entityType: 'parent',
    studentIds: parent.studentIds,
    address: parent.address,
    notes: parent.notes,
  };

  return {
    id: parent.id,
    organization_id: organizationId,
    name: parent.name,
    phone: parent.phone || null,
    email: parent.email || null,
    status: 'active',
    metadata: metadata as unknown as Json,
    memo: parent.notes || null,
  };
}

export function customerRowToParent(row: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  metadata: Json;
  memo: string | null;
  created_at: string;
}): Parent {
  const meta = (row.metadata || {}) as CustomerMetadata;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || undefined,
    address: meta.address,
    studentIds: meta.studentIds || [],
    notes: meta.notes || row.memo || undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

export function studentContactRow(
  student: Student,
  organizationId: string,
  contactId?: string,
  guardian?: { name: string; phone: string; email?: string | null }
) {
  const g = guardian || {
    name: student.parentName || '보호자',
    phone: student.parentPhone || '',
    email: null as string | null,
  };
  if (!g.name && !g.phone) return null;

  return {
    id: contactId || crypto.randomUUID(),
    organization_id: organizationId,
    customer_id: student.id,
    name: g.name || '보호자',
    relationship: 'parent',
    phone: g.phone || null,
    email: g.email || null,
    is_primary: true,
  };
}

export function isStudentCustomer(metadata: Json): boolean {
  const meta = (metadata || {}) as CustomerMetadata;
  return meta.entityType !== 'parent';
}

export function isParentCustomer(metadata: Json): boolean {
  const meta = (metadata || {}) as CustomerMetadata;
  return meta.entityType === 'parent';
}

