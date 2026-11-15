import { createRecordsStorage } from '@/services/storage/recordsStorage';
import { createScheduleStorage } from '@/services/storage/scheduleStorage';
import { createStaffClassStorage } from '@/services/storage/staffClassStorage';
import { createCustomerStorage } from '@/services/storage/customerStorage';
import { createTextbookCatalogStorage } from '@/services/storage/textbookCatalogStorage';
import { createAttendanceStorage } from '@/services/storage/attendanceStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Scheduling persistence facade. 기존 schedule/records/classes/customers factory를 연결한다. */
export function createSchedulingCapabilityStorage(api: StorageApi) {
  return {
    ...createScheduleStorage(),
    ...createRecordsStorage(api),
    ...createStaffClassStorage(),
    ...createCustomerStorage(api),
    ...createTextbookCatalogStorage(api),
    ...createAttendanceStorage(api),
  };
}

export type SchedulingCapabilityStorage = ReturnType<typeof createSchedulingCapabilityStorage>;

/** Scheduling persist SoT (예약·오퍼링 + records). */
export const schedulingStorage = createSchedulingCapabilityStorage(storageApi);
