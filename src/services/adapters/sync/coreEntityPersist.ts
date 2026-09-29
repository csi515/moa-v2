import { getCoreClient } from '../../../lib/supabase';
import { STORAGE_KEYS, type StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import {
  persistCustomerPins,
  persistCustomers,
  persistParentStudentLinks,
  persistSettings,
  persistStaff,
} from './corePersistPeople';
import {
  persistAttendanceSessions,
  persistConsultations,
  persistNotifications,
  persistSchedules,
  persistServices,
  persistSessionPasses,
} from './corePersistCatalog';
import {
  persistExpenses,
  persistIncomeEntries,
  persistPayments,
  persistTeacherPayrollSettlements,
  persistTuitionPayments,
} from './corePersistFinance';

/** Core 엔티티 persist — false면 호출측이 soft-fail로 처리 */
export async function persistCoreEntity(
  key: StorageKey,
  organizationId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard = () => false
): Promise<boolean> {
  if (isAborted()) return false;
  const client = getCoreClient();

  let ok = true;
  switch (key) {
    case STORAGE_KEYS.SETTINGS:
      ok = await persistSettings(client, organizationId, cache);
      break;
    case STORAGE_KEYS.TEACHERS:
      ok = await persistStaff(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.STUDENTS:
    case STORAGE_KEYS.PARENTS:
      ok = await persistCustomers(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.CLASSES:
      ok = await persistServices(client, organizationId, cache, 'piano', isAborted);
      break;
    case STORAGE_KEYS.SERVICE_OFFERINGS:
      ok = await persistServices(client, organizationId, cache, 'pilates', isAborted);
      break;
    case STORAGE_KEYS.SCHEDULES:
    case STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS:
      ok = await persistSchedules(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.INVOICES:
      ok = await persistPayments(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.TUITION_PAYMENTS:
      ok = await persistTuitionPayments(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.EXPENSES:
      ok = await persistExpenses(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.INCOME_ENTRIES:
      ok = await persistIncomeEntries(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS:
      ok = await persistTeacherPayrollSettlements(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.CONSULTATIONS:
      ok = await persistConsultations(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.NOTIFICATIONS:
      ok = await persistNotifications(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.ATTENDANCE_SESSIONS:
      ok = await persistAttendanceSessions(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.SESSION_PASSES:
      ok = await persistSessionPasses(client, organizationId, cache, isAborted);
      break;
    case STORAGE_KEYS.CUSTOMER_PINS:
      ok = await persistCustomerPins(client, organizationId, cache);
      break;
    case STORAGE_KEYS.PARENT_STUDENT_LINKS:
      ok = await persistParentStudentLinks(client, organizationId, cache, isAborted);
      break;
    default:
      return true;
  }
  return ok && !isAborted();
}
