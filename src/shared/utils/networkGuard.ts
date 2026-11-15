import { showToast } from '@/shared/feedback/uiFeedback';

/**
 * 현재 브라우저 환경이 온라인인지 안전하게 확인합니다.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }
  return navigator.onLine;
}

/**
 * 결제, 수납, 삭제 등 네트워크 연결이 필수적인 작업 실행 전
 * 오프라인 여부를 감지하고 사용자에게 경고 토스트를 띄웁니다.
 *
 * @param actionName 작업 이름 (예: '수납 처리', '결제 요청', '데이터 삭제')
 * @returns 온라인 상태이면 true, 오프라인이면 false
 */
export function guardOnlineAction(actionName?: string): boolean {
  if (isOnline()) {
    return true;
  }

  const prefix = actionName ? `${actionName}은(는) ` : '';
  showToast.warning(
    `${prefix}인터넷에 연결된 상태에서만 가능합니다. 네트워크 연결을 확인해 주세요.`,
    '오프라인 상태'
  );
  return false;
}
