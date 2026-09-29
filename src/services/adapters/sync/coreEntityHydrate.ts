import type {
  AcademySettings,
  Parent,
  PracticeRoomBooking,
  Student,
} from '../../../types';
import { getCoreClient } from '../../../lib/supabase';
import { isAppointmentIndustry } from '@/core/industry/industryUi';
import { readLocal, writeLocal } from '../localStorageEngine';
import { STORAGE_KEYS, type StorageKey } from '../storageKeys';
import {
  consultationRowToApp,
  customerRowToParent,
  customerRowToStudent,
  isParentCustomer,
  isPilatesServiceRow,
  isPracticeRoomScheduleRow,
  isStudentCustomer,
  notificationRowToApp,
  parseOrganizationSettings,
  paymentRowToInvoice,
  scheduleRowToBooking,
  serviceRowToClass,
  serviceRowToOffering,
  staffRowToTeacher,
} from './entityMappers';
import { normalizeIndustryType } from '../../../core/industry/types';
import {
  coreRowToExpense,
  coreRowToIncome,
  coreRowToSettlement,
  transactionRowToTuitionPayment,
} from './financeEntityMappers';
import {
  coreRowToSession,
  pinRowsFromCustomers,
} from './attendanceEntityMappers';
import { rowToLink } from './parentLinkEntityMappers';
import type { SyncCache } from './syncTypes';
import { checkHydrateErrors } from './persistHelpers';
import { rowToSessionPass } from './sessionPassMappers';
import { applyDirtyListMerge } from '../pendingMutations';

/** Core 엔티티 전체 hydrate */
export async function hydrateCoreEntities(
  organizationId: string,
  cache: SyncCache,
  industryTypeRaw?: string | null
): Promise<void> {
  const industryType = normalizeIndustryType(industryTypeRaw);
  const client = getCoreClient();

  const [
    orgResult,
    staffResult,
    customersResult,
    contactsResult,
    servicesResult,
    schedulesResult,
    paymentsResult,
    paymentTxResult,
    expensesResult,
    incomeResult,
    payrollSettlementsResult,
    consultationsResult,
    notificationsResult,
    attendanceSessionsResult,
    parentLinksResult,
    sessionPassesResult,
  ] = await Promise.all([
    client.from('organizations').select('settings, name, industry_type').eq('id', organizationId).single(),
    client.from('staff').select('*').eq('organization_id', organizationId),
    client.from('customers').select('*').eq('organization_id', organizationId),
    client.from('customer_contacts').select('*').eq('organization_id', organizationId),
    client.from('services').select('*').eq('organization_id', organizationId),
    // schedules: org 전체 hydrate (offline 캘린더·이력용).
    // 날짜 윈도우 remote filter는 sync Domain Service와 충돌·과거 월 공백을 유발하므로
    // 조회 최적화는 ScheduleService(bookingQuery) in-memory로 처리. 수만 건 이상 시 재검토.
    client.from('schedules').select('*').eq('organization_id', organizationId),
    client.from('payments').select('*').eq('organization_id', organizationId),
    client.from('payment_transactions').select('*').eq('organization_id', organizationId),
    client.from('expenses').select('*').eq('organization_id', organizationId),
    client.from('income_entries').select('*').eq('organization_id', organizationId),
    client.from('teacher_payroll_settlements').select('*').eq('organization_id', organizationId),
    client.from('consultations').select('*').eq('organization_id', organizationId),
    client.from('notifications').select('*').eq('organization_id', organizationId),
    client.from('attendance_sessions').select('*').eq('organization_id', organizationId),
    client.from('parent_student_links').select('*').eq('organization_id', organizationId),
    client.from('session_passes' as 'schedules').select('*').eq('organization_id', organizationId),
  ]);

  checkHydrateErrors(
    {
      org: orgResult.error,
      staff: staffResult.error,
      customers: customersResult.error,
      contacts: contactsResult.error,
      services: servicesResult.error,
      schedules: schedulesResult.error,
      payments: paymentsResult.error,
      paymentTx: paymentTxResult.error,
      expenses: expensesResult.error,
      income: incomeResult.error,
      payrollSettlements: payrollSettlementsResult.error,
      consultations: consultationsResult.error,
      notifications: notificationsResult.error,
      attendanceSessions: attendanceSessionsResult.error,
      parentLinks: parentLinksResult.error,
      sessionPasses: sessionPassesResult.error,
    },
    'core'
  );

  const defaultSettings = readLocal<AcademySettings>(STORAGE_KEYS.SETTINGS, {
    name: orgResult.data?.name || '',
    address: '',
    phone: '',
    defaultTuitionFee: 180000,
  });
  const settings = parseOrganizationSettings(orgResult.data?.settings, defaultSettings);
  // organizations.name 컬럼이 표시명의 소스 — settings JSON의 구 name보다 우선
  if (orgResult.data?.name) settings.name = orgResult.data.name;

  const teachers = (staffResult.data || []).map(staffRowToTeacher);

  const contactByCustomer = new Map(
    (contactsResult.data || [])
      .filter((c) => c.is_primary)
      .map((c) => [c.customer_id, c.name])
  );

  const customers = customersResult.data || [];
  const students: Student[] = customers
    .filter((c) => isStudentCustomer(c.metadata))
    .map((c) => customerRowToStudent(c, contactByCustomer.get(c.id)));

  const parents: Parent[] = customers
    .filter((c) => isParentCustomer(c.metadata))
    .map(customerRowToParent);

  const serviceRows = servicesResult.data || [];
  const appointmentIndustry = isAppointmentIndustry(industryType);
  const classes = appointmentIndustry
    ? []
    : serviceRows.filter((r) => !isPilatesServiceRow(r.metadata)).map(serviceRowToClass);
  const serviceOfferings = appointmentIndustry ? serviceRows.map(serviceRowToOffering) : [];

  const scheduleRows = schedulesResult.data || [];
  const bookings = scheduleRows
    .filter((r) => !isPracticeRoomScheduleRow(r.metadata))
    .map(scheduleRowToBooking);
  // Phase 3A: 연습실은 room_reservations 단일 원장 — schedules practice_room 동기화 중단
  const practiceRoomBookings: PracticeRoomBooking[] = [];
  const invoices = (paymentsResult.data || []).map(paymentRowToInvoice);
  const invoiceLookup = new Map(
    invoices.map((inv) => [
      inv.id,
      { studentId: inv.studentId, studentName: inv.studentName, yearMonth: inv.yearMonth },
    ])
  );
  const tuitionPayments = (paymentTxResult.data || []).map((row) =>
    transactionRowToTuitionPayment(row, invoiceLookup)
  );

  const studentMap = new Map(students.map((s) => [s.id, s.name]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const consultations = (consultationsResult.data || []).map((row) =>
    consultationRowToApp(
      row,
      studentMap.get(row.customer_id) || '',
      row.staff_id ? teacherMap.get(row.staff_id) || '' : ''
    )
  );

  const notifications = (notificationsResult.data || []).map(notificationRowToApp);
  const attendanceSessions = (attendanceSessionsResult.data || []).map(coreRowToSession);
  const customerPins = pinRowsFromCustomers(
    (customersResult.data || []).map((c) => ({
      id: c.id,
      check_in_pin_hash: (c as { check_in_pin_hash?: string | null }).check_in_pin_hash ?? null,
    }))
  );
  const parentStudentLinks = (parentLinksResult.data || []).map(rowToLink);
  const sessionPasses = (sessionPassesResult.data || []).map((row) =>
    rowToSessionPass(row as unknown as Parameters<typeof rowToSessionPass>[0])
  );

  const entities: [StorageKey, unknown][] = [
    [STORAGE_KEYS.SETTINGS, settings],
    [STORAGE_KEYS.TEACHERS, teachers],
    [STORAGE_KEYS.STUDENTS, students],
    [STORAGE_KEYS.PARENTS, parents],
    [STORAGE_KEYS.CLASSES, classes],
    [STORAGE_KEYS.SERVICE_OFFERINGS, serviceOfferings],
    [STORAGE_KEYS.SCHEDULES, applyDirtyListMerge(STORAGE_KEYS.SCHEDULES, bookings)],
    [STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, practiceRoomBookings],
    [STORAGE_KEYS.SESSION_PASSES, applyDirtyListMerge(STORAGE_KEYS.SESSION_PASSES, sessionPasses)],
    [STORAGE_KEYS.INVOICES, invoices],
    [STORAGE_KEYS.TUITION_PAYMENTS, tuitionPayments],
    [STORAGE_KEYS.EXPENSES, (expensesResult.data || []).map(coreRowToExpense)],
    [STORAGE_KEYS.INCOME_ENTRIES, (incomeResult.data || []).map(coreRowToIncome)],
    [
      STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS,
      (payrollSettlementsResult.data || []).map(coreRowToSettlement),
    ],
    [STORAGE_KEYS.CONSULTATIONS, consultations],
    [STORAGE_KEYS.NOTIFICATIONS, notifications],
    [STORAGE_KEYS.ATTENDANCE_SESSIONS, attendanceSessions],
    [STORAGE_KEYS.CUSTOMER_PINS, customerPins],
    [STORAGE_KEYS.PARENT_STUDENT_LINKS, parentStudentLinks],
  ];

  for (const [key, value] of entities) {
    cache.set(key, value);
    writeLocal(key, value);
  }

  // 슬롯 모집 마감·정원 — settings 미러에서 LOCAL_ONLY 키 복원 (다기기)
  const slotRecruitments = settings.slotRecruitments || [];
  writeLocal(STORAGE_KEYS.SLOT_RECRUITMENTS, slotRecruitments);
}
