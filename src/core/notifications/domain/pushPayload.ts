/**
 * 0원 W3C Web Push 페이로드 규격화 순수 도메인 엔진 (Pure Functions)
 * UI 및 외부 DB 종속성 없음.
 */

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * 출석/퇴실 알림용 Web Push 페이로드 생성기
 */
export function buildAttendancePushPayload(
  studentName: string,
  actionTime: string,
  options?: { actionType?: 'checkin' | 'checkout'; url?: string }
): WebPushPayload {
  const safeName = studentName?.trim() || '회원';
  const safeTime =
    actionTime?.trim() ||
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const isCheckin = options?.actionType !== 'checkout';
  const actionLabel = isCheckin ? '출석' : '하원/퇴실';

  return {
    title: `[출결 알림] ${safeName} ${actionLabel}`,
    body: `${safeName}님이 ${safeTime}에 ${actionLabel} 처리되었습니다.`,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: `attendance-${Date.now()}`,
    url: options?.url || '/workspace/attendance',
    timestamp: Date.now(),
    data: {
      studentName: safeName,
      actionTime: safeTime,
      actionType: isCheckin ? 'checkin' : 'checkout',
    },
  };
}

/**
 * 이용권 만료 임박 알림용 Web Push 페이로드 생성기
 */
export function buildPassExpiringPushPayload(
  passName: string,
  remainingDays: number,
  options?: { url?: string }
): WebPushPayload {
  const safePass = passName?.trim() || '이용권';
  const days = Math.max(0, Math.floor(remainingDays));

  return {
    title: `[이용권 만료 예정] ${safePass}`,
    body: `${safePass}의 유효기간이 ${days}일 남았습니다. 만료 전 갱신 또는 사용을 확인해 주세요.`,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: `pass-expiring-${safePass}`,
    url: options?.url || '/customer/pass',
    timestamp: Date.now(),
    data: {
      passName: safePass,
      remainingDays: days,
    },
  };
}
