/**
 * 외투 및 단기 수하물 보관 번호표 대장 도메인 엔진 (Pure Functions)
 */

export type BaggageType = 'COAT' | 'LUGGAGE' | 'STROLLER' | 'INSTRUMENT' | 'OTHER';
export type BaggageStatus = 'CHECKED_IN' | 'CLAIMED';

export interface BaggageClaimRecord {
  id: string;
  tenant_id: string;
  claim_number: string;
  tag_number: number; // 행거 번호 또는 짐 태그 번호
  baggage_type: BaggageType;
  description?: string;
  owner_name?: string;
  owner_phone?: string;
  status: BaggageStatus;
  checked_in_at: string;
  claimed_at?: string;
}

export function validateTagAvailability(
  tagNumber: number,
  activeTags: number[],
  maxTags: number
): { isAvailable: boolean; error?: string } {
  if (tagNumber < 1 || tagNumber > maxTags) {
    return { isAvailable: false, error: `태그 번호는 1부터 ${maxTags}까지 가능합니다.` };
  }
  if (activeTags.includes(tagNumber)) {
    return { isAvailable: false, error: `태그 ${tagNumber}번은 현재 보관 중입니다.` };
  }
  return { isAvailable: true };
}

export function claimBaggage(
  currentStatus: BaggageStatus
): { nextStatus: BaggageStatus; isAllowed: boolean; error?: string } {
  if (currentStatus === 'CHECKED_IN') {
    return { nextStatus: 'CLAIMED', isAllowed: true };
  }
  return { nextStatus: currentStatus, isAllowed: false, error: '이미 회수 인도된 물품입니다.' };
}

export function getBaggageTypeLabel(type: BaggageType): string {
  switch (type) {
    case 'COAT':
      return '외투/의류';
    case 'LUGGAGE':
      return '캐리어/수하물';
    case 'STROLLER':
      return '유모차';
    case 'INSTRUMENT':
      return '악기/고가장비';
    case 'OTHER':
      return '기타 물품';
  }
}
