import { createAttendanceStorage } from '@/services/storage/attendanceStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Attendance persistence facade. 기존 factory를 연결한다. hydrate/sync 의미는 바꾸지 않는다. */
export function createAttendanceCapabilityStorage(api: StorageApi) {
  return createAttendanceStorage(api);
}

export type AttendanceCapabilityStorage = ReturnType<typeof createAttendanceCapabilityStorage>;

/** Attendance persist SoT. 신규 코드는 StorageService가 아니라 이 싱글톤을 쓴다. */
export const attendanceStorage = createAttendanceCapabilityStorage(storageApi);
