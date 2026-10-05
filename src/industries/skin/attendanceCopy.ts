import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';
import type { IndustryAttendanceCopy } from '@/core/industry/pluginTypes';

/**
 * 피부 출결 문구.
 * 기록 명사 출입은 isAppointment가 만든다.
 * PIN 안내는 호출부 고객·연락처 호칭을 쓴다.
 */
export const skinAttendanceCopy: IndustryAttendanceCopy = {
  ...studentAttendanceCopy,
  pinDisabledUsesCustomerLabel: true,
  pinRevealUsesContactOrCustomer: true,
  pinRevealHandoff: undefined,
};
