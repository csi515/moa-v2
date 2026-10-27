/**
 * RF/NFC 카드 및 바코드 실물 발급 대장 도메인 엔진 (Pure Functions)
 */

export type CardStatus = 'IN_STOCK' | 'ISSUED' | 'SUSPENDED' | 'LOST' | 'RETURNED' | 'DISCARDED';

export interface PhysicalCardRecord {
  id: string;
  tenant_id: string;
  card_uid: string; // NFC UID, RFID 번호 또는 바코드 시리얼
  card_label?: string; // 카드 표면 인쇄 번호
  assigned_member_id?: string;
  assigned_member_name?: string;
  status: CardStatus;
  issued_at?: string;
  lost_at?: string;
  reissue_fee_paid: number;
  created_at: string;
}

export function validateCardUid(uid: string): { isValid: boolean; error?: string } {
  if (!uid || uid.trim().length === 0) {
    return { isValid: false, error: '카드 고유 일련번호(UID)를 입력해 주세요.' };
  }
  if (uid.trim().length < 4) {
    return { isValid: false, error: '카드 UID는 최소 4자리 이상이어야 합니다.' };
  }
  return { isValid: true };
}

export function transitionCardStatus(
  currentStatus: CardStatus,
  action: 'ISSUE' | 'SUSPEND' | 'REPORT_LOST' | 'REACTIVATE' | 'RETURN' | 'DISCARD'
): { nextStatus: CardStatus; isAllowed: boolean; error?: string } {
  switch (action) {
    case 'ISSUE':
      if (currentStatus === 'IN_STOCK' || currentStatus === 'RETURNED') {
        return { nextStatus: 'ISSUED', isAllowed: true };
      }
      return { nextStatus: currentStatus, isAllowed: false, error: '재고 상태의 카드만 발급 가능합니다.' };

    case 'SUSPEND':
      if (currentStatus === 'ISSUED') {
        return { nextStatus: 'SUSPENDED', isAllowed: true };
      }
      return { nextStatus: currentStatus, isAllowed: false, error: '발급 중인 카드만 정지 가능합니다.' };

    case 'REPORT_LOST':
      if (currentStatus === 'ISSUED' || currentStatus === 'SUSPENDED') {
        return { nextStatus: 'LOST', isAllowed: true };
      }
      return { nextStatus: currentStatus, isAllowed: false, error: '발급되었던 카드만 분실 처리 가능합니다.' };

    case 'REACTIVATE':
      if (currentStatus === 'SUSPENDED') {
        return { nextStatus: 'ISSUED', isAllowed: true };
      }
      return { nextStatus: currentStatus, isAllowed: false, error: '정지 상태 카드만 재활성화 가능합니다.' };

    case 'RETURN':
      if (currentStatus === 'ISSUED' || currentStatus === 'SUSPENDED') {
        return { nextStatus: 'RETURNED', isAllowed: true };
      }
      return { nextStatus: currentStatus, isAllowed: false, error: '사용 중인 카드만 반납 가능합니다.' };

    case 'DISCARD':
      return { nextStatus: 'DISCARDED', isAllowed: true };
  }
}

export function calculateReissueFee(standardFee: number, isWaiverRequested: boolean): number {
  if (isWaiverRequested) return 0;
  return Math.max(0, standardFee);
}
