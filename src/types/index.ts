import type { PickupAddress } from '@/core/transport/types';
import type { StaffGrants } from '@/core/staff/staffGrants';
import type { StudentBillingMode } from '@/core/students/billingMode';
import type { TeacherPayType } from '@/capabilities/billing/finance/billingLedgerTypes';

/**
 * Legacy compatibility barrel.
 * 신규 domain type은 여기 정의하지 않는다. 소유 계층에서 import한다.
 * @see docs/TYPES_DOMAIN_MAP.md
 */

/** @deprecated 신규 코드는 `@/core/auth/types/sessionUser` */
export type { User, UserRole } from '@/core/auth/types/sessionUser';

export type StudentStatus = 'active' | 'leave' | 'withdrawn';

/** @deprecated 신규 코드는 `@/core/students/billingMode` */
export type { StudentBillingMode } from '@/core/students/billingMode';
/** @deprecated 신규 코드는 `@/core/students/billingMode` */
export { STUDENT_BILLING_MODE_LABEL, normalizeBillingMode } from '@/core/students/billingMode';

/**
 * @deprecated 전역 union 아님. 저장은 string. 값 검증은 Industry
 * (`PianoStudentLevel`, `DaycareAgeClass`, `GymClassLevel`).
 */
export type StudentLevel = string;

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  school: string;
  grade: string;
  /** @deprecated parent_student_links에서 파생 — UI는 getPrimaryGuardian 사용 */
  parentId?: string;
  /** @deprecated */
  parentName?: string;
  /** @deprecated */
  parentPhone?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  usesShuttleService?: boolean;
  pickupAddresses?: PickupAddress[];
  joinDate: string;
  leaveDate?: string;
  status: StudentStatus;
  teacherId: string;
  teacherName: string;
  classIds: string[];
  /** Industry 선택지 문자열. union 아님 */
  level: string;
  billingMode?: StudentBillingMode;
  tuitionFee: number;
  paymentDay: number;
  specialNotes?: string;
  memo?: string;
  avatarColor?: string;
  checkInPinSet?: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  studentIds: string[];
  notes?: string;
  createdAt: string;
}

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
}

/** @deprecated 신규 코드는 `@/core/staff/workWindow` */
export type { DayOfWeek, StaffWorkWindow } from '@/core/staff/workWindow';

export interface ClassItem {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  daysOfWeek: import('@/core/staff/workWindow').DayOfWeek[];
  startTime: string;
  endTime: string;
  capacity: number;
  level?: string;
  targetLevel?: string;
  fee?: number;
  textbook?: string;
  room: string;
  memo?: string;
  color?: string;
}

/** @deprecated 신규 코드는 `@/capabilities/attendance` */
export type {
  AttendanceRecord,
  AttendanceStatus,
  MakeupItem,
  MakeupScheduleInput,
  MakeupStatus,
} from '@/capabilities/attendance/domain/types';

/** @deprecated 신규 코드는 `@/capabilities/billing/finance/billingLedgerTypes` */
export type {
  CombinedPaymentRequest,
  Expense,
  ExpenseCategory,
  ExpenseItem,
  InvoiceExtraItem,
  InvoiceStatus,
  PaymentMethod,
  StudentMonthlyBillingSummary,
  StudentUnpaidSummary,
  TeacherPayType,
  TuitionInvoice,
  TuitionPayment,
  UnpaidInvoiceItem,
} from '@/capabilities/billing/finance/billingLedgerTypes';

/** @deprecated 신규 코드는 `@/core/resources` */
export type { PracticeRoomBooking, PracticeRoomBookingStatus } from '@/core/resources';

/** @deprecated 신규 코드는 `@/capabilities/consultation` */
export type { Consultation, ConsultationType } from '@/capabilities/consultation/types';

/** @deprecated 신규 코드는 `@/core/lessons/types` */
export type {
  LessonRecord,
  PerformanceVideo,
  PerformanceVideoType,
  PracticeRecord,
  Song,
} from '@/core/lessons/types';

/** @deprecated 신규 코드는 `@/capabilities/commerce/textbookTypes` */
export type {
  InventoryTransactionType,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookPaymentStatus,
  TextbookSale,
} from '@/capabilities/commerce/textbookTypes';

/** @deprecated 신규 코드는 `@/core/notices/notificationTypes` */
export type {
  AppNotification,
  NotificationItem,
  NotificationType,
} from '@/core/notices/notificationTypes';

/** @deprecated 신규 코드는 `@/core/events` */
export type { AcademyEvent, EventParticipantSummary } from '@/core/events';

/** @deprecated 신규 코드는 `@/core/organizations/settingsTypes` */
export type {
  AcademyRoom,
  AcademyRoomKind,
  AcademySettings,
  SettingsRetailCatalogItem as RetailProduct,
} from '@/core/organizations/settingsTypes';

/** @deprecated 신규 코드는 `@/core/public/types` */
export type { ConsultationSubmission, PublicOrgInfo } from '@/core/public/types';

/** @deprecated 신규 코드는 `@/core/customer/joinTypes` */
export type {
  CustomerJoinRequest,
  JoinRequestStatus,
  JoinRequestType,
} from '@/core/customer/joinTypes';

/** @deprecated 신규 코드는 `@/core/schedules/types` */
export type {
  BookableSchedule,
  CoreSchedule,
  MyReservation,
  Reservation,
  ReservationDetail,
  ReservationRequest,
  ReservationStatus,
  ScheduleFormData,
  ScheduleStatus,
} from '@/core/schedules/types';
