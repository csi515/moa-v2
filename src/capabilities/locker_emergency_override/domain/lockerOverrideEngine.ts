/**
 * 사물함 비상 개방 입회 서약 및 감사 로그 도메인 엔진 (Pure Functions)
 */

export type OverrideReason = 'PIN_FORGOTTEN' | 'KEY_LOST' | 'EXPIRED_UNCLAIMED' | 'SAFETY_HAZARD';

export interface LockerOverrideRecord {
  id: string;
  tenant_id: string;
  locker_number: string;
  reason: OverrideReason;
  reason_detail?: string;
  lead_staff_name: string;
  witness_staff_name?: string;
  seized_items_summary?: string;
  is_bag_sealed: boolean;
  seal_tag_number?: string;
  opened_at: string;
}

export function validateOverrideWitness(
  requireDualWitness: boolean,
  leadStaff: string,
  witnessStaff?: string
): { isValid: boolean; error?: string } {
  if (!leadStaff || leadStaff.trim().length === 0) {
    return { isValid: false, error: '책임 개방자(주 조치자) 이름을 입력해 주세요.' };
  }
  if (requireDualWitness) {
    if (!witnessStaff || witnessStaff.trim().length === 0) {
      return { isValid: false, error: '2인 입회 규정에 따라 입회 증인 직원의 이름이 필수입니다.' };
    }
    if (leadStaff.trim() === witnessStaff.trim()) {
      return { isValid: false, error: '책임 개방자와 입회 증인은 동일 인물일 수 없습니다.' };
    }
  }
  return { isValid: true };
}

export function getOverrideReasonLabel(reason: OverrideReason): string {
  switch (reason) {
    case 'PIN_FORGOTTEN':
      return '비밀번호 분실';
    case 'KEY_LOST':
      return '열쇠 분실';
    case 'EXPIRED_UNCLAIMED':
      return '이용 만료 후 장기 미반납';
    case 'SAFETY_HAZARD':
      return '안전 위협 및 긴급 점검';
  }
}
