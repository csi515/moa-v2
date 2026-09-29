export function mapResourceReservationError(message: string, fallback: string): Error {
  if (
    message.includes('already reserved') ||
    message.includes('overlap') ||
    message.includes('conflicts')
  ) {
    return new Error('이미 예약된 시간대입니다.');
  }
  if (message.includes('Overnight')) {
    return new Error('자정을 넘는 예약은 할 수 없습니다.');
  }
  if (
    /not found or inactive|Invalid practice room|Invalid bookable resource|Resource not found/i.test(
      message
    )
  ) {
    return new Error('예약할 수 없는 자원입니다.');
  }
  if (message.includes('operating hours') || message.includes('Outside room')) {
    return new Error('운영 시간 외에는 예약할 수 없습니다.');
  }
  if (message.includes('closed')) {
    return new Error('학원 휴무일에는 예약할 수 없습니다.');
  }
  if (message.includes('Permission denied')) {
    return new Error('권한이 없습니다.');
  }
  return new Error(message || fallback);
}
