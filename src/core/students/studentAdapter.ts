import type { Customer, CustomerContact } from '@/core/customer/types';

/**
 * Legacy Student 호환 인터페이스 (구조적 서브타이핑).
 * 신규 코드는 `@/types` barrel import 없이도 레거시 원생 데이터와 완벽히 호환됩니다.
 */
export interface LegacyStudentLike {
  id: string;
  studentNumber?: string;
  name: string;
  gender?: 'M' | 'F';
  birthDate?: string;
  school?: string;
  grade?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  usesShuttleService?: boolean;
  pickupAddresses?: any[];
  joinDate?: string;
  leaveDate?: string;
  status: 'active' | 'leave' | 'withdrawn';
  teacherId?: string;
  teacherName?: string;
  classIds?: string[];
  level?: string;
  billingMode?: any;
  tuitionFee?: number;
  paymentDay?: number;
  specialNotes?: string;
  memo?: string;
  avatarColor?: string;
  checkInPinSet?: boolean;
  userId?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Legacy Student 객체를 범용 Customer 객체로 변환하는 어댑터입니다.
 * 학원 고유 필드는 metadata JSONB 내부에 안전하게 보존됩니다.
 */
export function studentToCustomer(student: LegacyStudentLike): Customer {
  const contacts: CustomerContact[] = [];
  if (student.parentName || student.parentPhone) {
    contacts.push({
      name: student.parentName || '보호자',
      phone: student.parentPhone,
      isPrimary: true,
      relationship: '보호자',
    });
  }

  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    status: student.status,
    memo: student.memo,
    contacts,
    metadata: {
      ...(student.metadata || {}),
      studentNumber: student.studentNumber,
      gender: student.gender,
      birthDate: student.birthDate,
      school: student.school,
      grade: student.grade,
      level: student.level,
      tuitionFee: student.tuitionFee,
      paymentDay: student.paymentDay,
      teacherId: student.teacherId,
      teacherName: student.teacherName,
      classIds: student.classIds,
      billingMode: student.billingMode,
      specialNotes: student.specialNotes,
      usesShuttleService: student.usesShuttleService,
      pickupAddresses: student.pickupAddresses,
      checkInPinSet: student.checkInPinSet,
    },
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

/**
 * 범용 Customer 객체를 레거시 Student 인터페이스로 매핑하는 역변환 어댑터입니다.
 */
export function customerToStudent(customer: Customer): LegacyStudentLike {
  const meta = customer.metadata || {};
  const primaryContact = customer.contacts?.find((c) => c.isPrimary) || customer.contacts?.[0];

  return {
    id: customer.id,
    studentNumber: (meta.studentNumber as string) || '',
    name: customer.name,
    gender: (meta.gender as 'M' | 'F') || 'M',
    birthDate: (meta.birthDate as string) || '',
    school: (meta.school as string) || '',
    grade: (meta.grade as string) || '',
    parentName: primaryContact?.name,
    parentPhone: primaryContact?.phone,
    phone: customer.phone,
    status: customer.status === 'inactive' ? 'withdrawn' : (customer.status as 'active' | 'leave' | 'withdrawn'),
    teacherId: (meta.teacherId as string) || '',
    teacherName: (meta.teacherName as string) || '',
    classIds: (meta.classIds as string[]) || [],
    level: (meta.level as string) || '',
    tuitionFee: (meta.tuitionFee as number) || 0,
    paymentDay: (meta.paymentDay as number) || 1,
    joinDate: customer.createdAt.slice(0, 10),
    memo: customer.memo,
    specialNotes: meta.specialNotes as string | undefined,
    usesShuttleService: Boolean(meta.usesShuttleService),
    pickupAddresses: meta.pickupAddresses as any,
    checkInPinSet: Boolean(meta.checkInPinSet),
    metadata: customer.metadata,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
