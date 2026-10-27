/**
 * 물리 열쇠 대여 및 도어락 비밀번호 교체 대장 도메인 엔진 (Pure Functions)
 */

export type KeyType = 'PHYSICAL_KEY' | 'DIGITAL_DOORLOCK';
export type KeyState = 'AVAILABLE' | 'CHECKED_OUT' | 'LOST';

export interface AccessKeyRecord {
  id: string;
  tenant_id: string;
  name: string; // 예: "피아노 3번방 마스터키", "서버실 도어락"
  key_type: KeyType;
  location: string;
  current_state: KeyState;
  borrower_name?: string;
  borrowed_at?: string;
  borrow_purpose?: string;
  last_pin_changed_at?: string;
  pin_rotation_days: number;
}

export function checkPinRotationNeeded(
  lastChangedAt: string | undefined,
  rotationCycleDays: number,
  now: Date = new Date()
): { needsRotation: boolean; daysElapsed: number } {
  if (!lastChangedAt) {
    return { needsRotation: true, daysElapsed: 999 };
  }
  const lastDate = new Date(lastChangedAt);
  const diffMs = now.getTime() - lastDate.getTime();
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return {
    needsRotation: daysElapsed >= rotationCycleDays,
    daysElapsed,
  };
}

export function checkoutKey(
  currentState: KeyState,
  borrowerName: string,
  purpose: string
): { isAllowed: boolean; nextState: KeyState; error?: string } {
  if (currentState !== 'AVAILABLE') {
    return { isAllowed: false, nextState: currentState, error: '현재 대여 가능한 상태가 아닙니다.' };
  }
  if (!borrowerName || borrowerName.trim().length === 0) {
    return { isAllowed: false, nextState: currentState, error: '대여인 이름을 입력해 주세요.' };
  }
  return { isAllowed: true, nextState: 'CHECKED_OUT' };
}

export function returnKey(
  currentState: KeyState
): { isAllowed: boolean; nextState: KeyState; error?: string } {
  if (currentState !== 'CHECKED_OUT') {
    return { isAllowed: false, nextState: currentState, error: '대여 중인 열쇠만 반납할 수 있습니다.' };
  }
  return { isAllowed: true, nextState: 'AVAILABLE' };
}
