import type { IndustryAttendanceCopy } from './pluginTypes';

/**
 * 사람 명사를 학생으로 고정하는 출결 문구.
 * 플러그인이 선택한다. 코어는 업종 id로 이 묶음을 고르지 않는다.
 * 기록 명사·등원 문구·예약 업종 출입은 여기 넣지 않는다.
 */
export const studentAttendanceCopy: IndustryAttendanceCopy = {
  personNoun: '학생',
  kioskRepeatHint: '이미 출석한 학생이 다시 입력하면 안내만 표시됩니다',
  kioskAdminExitBody:
    '키오스크를 종료하고 일반 관리 화면으로 이동합니다. 학생이 아닌 관리자만 진행하세요.',
  pinRevealHandoff: '학부모님 또는 학생에게 전달하세요',
  parentEmpty: 'academy',
};
