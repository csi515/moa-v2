import type { StudentBillingMode } from '@/core/students/billingMode';

/**
 * Legacy compatibility barrel.
 * 신규 domain type은 여기 정의하지 않는다. 소유 계층에서 import한다.
 * @see docs/TYPES_DOMAIN_MAP.md
 */

/** @deprecated 신규 코드는 `@/core/auth/types/sessionUser` */
export type { User, UserRole } from '@/core/auth/types/sessionUser';

/** @deprecated 신규 코드는 `@/core/students/billingMode` */
export type { StudentBillingMode } from '@/core/students/billingMode';
/** @deprecated 신규 코드는 `@/core/students/billingMode` */
export { STUDENT_BILLING_MODE_LABEL, normalizeBillingMode } from '@/core/students/billingMode';

/** @deprecated 신규 코드는 `@/types/customer` */
export * from './customer';

/** @deprecated 신규 코드는 `@/types/teacher` */
export * from './teacher';

/** @deprecated 신규 코드는 `@/core/staff/workWindow` */
export type { DayOfWeek, StaffWorkWindow } from '@/core/staff/workWindow';

/** @deprecated 신규 코드는 `@/types/classItem` */
export * from './classItem';

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

/** @deprecated 신규 코드는 `@/capabilities/resources` */
export type { PracticeRoomBooking, PracticeRoomBookingStatus } from '@/capabilities/resources/types';

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
  OrganizationRoom,
  OrganizationRoomKind,
  OrganizationSettings,
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
