/** 보강 RPC 에러 코드 → UI 메시지 */
export function mapMakeupScheduleError(message: string): string {
  if (message.includes('MAKEUP_TEACHER_OVERLAP')) {
    return '같은 선생님의 시간이 겹칩니다.';
  }
  if (message.includes('MAKEUP_ROOM_OVERLAP') || message.includes('already reserved')) {
    return '같은 연습실/강의실 시간이 겹칩니다.';
  }
  if (message.includes('MAKEUP_INVALID_TIME')) {
    return '보강 시작·종료 시간을 확인해 주세요.';
  }
  if (message.includes('MAKEUP_NOT_FOUND')) {
    return '결석 기록을 찾을 수 없습니다.';
  }
  if (message.includes('MAKEUP_NOT_ABSENT')) {
    return '결석 건만 보강 일정을 등록할 수 있습니다.';
  }
  if (message.includes('Permission denied')) {
    return '권한이 없습니다.';
  }
  if (message.includes('Organization mismatch')) {
    return '다른 학원의 기록에는 접근할 수 없습니다.';
  }
  return message || '보강 일정 등록에 실패했습니다.';
}
