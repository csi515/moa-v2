import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';
import type { IndustryAttendanceCopy } from '@/core/industry/pluginTypes';

/** 어린이집 등하원 문구. 출결 코어는 이 객체를 업종 id로 고르지 않는다. */
export const daycareAttendanceCopy: IndustryAttendanceCopy = {
  ...studentAttendanceCopy,
  recordNoun: '등하원',
  manageTitle: '등원 관리',
  presentLabel: '등원',
  presentTimeLabel: '등원',
  memoSavedToast: '하원·전달 메모를 저장했습니다.',
  memo: {
    titleSuffix: '하원·전달 메모',
    hint: '세션 메모 · 등원 후 전달 사항 기록',
    placeholder: '예: 조부모님 하원, 16:30 픽업 예정',
  },
};
