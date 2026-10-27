/**
 * 시설 분실물·습득물 보관 및 반환 관리 순수 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 헬스장, 목욕탕/찜질방(sauna_jjimjilbang), 스터디카페(study_cafe), 실내 골프장,
 *           수영장(swim_school), 클라이밍장(climbing_gym) 등 다중이용시설
 *
 * 주요 기능:
 *  1. 습득 장소(락커룸, 샤워실, 타석 등) 및 습득일자 기준 법적 보관기한(기본 30일) 산출
 *  2. 만료 D-Day 카운트다운 및 상태머신 전이 (STORED -> CLAIMED / EXPIRED -> DISPOSED / DONATED)
 *  3. 만료 임박(7일 이내) 분실물 필터 및 수령 반환율 통계 산출
 */

export type LostItemCategory =
  | 'electronics' // 전자기기 (이어폰, 워치, 휴대폰 등)
  | 'clothing' // 의류/신발 (운동복, 외투, 운동화 등)
  | 'card_wallet' // 신분증/카드/지갑
  | 'accessory' // 귀금속/안경/모자
  | 'sports_equipment' // 스포츠 용품 (장갑, 벨트, 스트랩 등)
  | 'other'; // 기타 잡화

export type LostItemStatus =
  | 'STORED' // 보관 중
  | 'CLAIMED' // 본인 수령 완료
  | 'EXPIRED' // 보관 기한 만료 (폐기/기부 대기)
  | 'DISPOSED' // 폐기 완료
  | 'DONATED'; // 복지시설 기부 완료

export interface ClaimantInfo {
  name: string;
  phone: string;
  claimedAt: string; // ISO string
  verificationMethod: 'id_check' | 'security_code' | 'photo_proof'; // 본인 확인 방법
  note?: string;
}

export interface DispositionInfo {
  action: 'disposed' | 'donated';
  disposedAt: string; // ISO string
  note: string;
}

export interface LostItem {
  id: string;
  itemCode: string; // e.g. "LF-202610-001"
  title: string; // e.g. "애플워치 시리즈 8 (미드나이트)"
  category: LostItemCategory;
  foundLocation: string; // e.g. "남자 락커룸 42번 앞", "샤워실 선반"
  foundAt: string; // YYYY-MM-DD
  storageLocation: string; // e.g. "안내데스크 1번 보관함", "사무실 금고"
  retentionDays: number; // 기본 30일
  status: LostItemStatus;
  claimant?: ClaimantInfo;
  disposition?: DispositionInfo;
  imageUrl?: string;
  notes?: string;
}

export interface LostAndFoundSummary {
  totalCount: number;
  storedCount: number;
  expiringSoonCount: number; // 7일 이하 남음
  claimedCount: number;
  disposedOrDonatedCount: number;
  claimRate: number; // 수령 반환율 (%)
}

/**
 * 1. 보관 만료일(YYYY-MM-DD) 계산 (순수 함수)
 */
export function calculateExpiryDate(foundAt: string, retentionDays: number): string {
  const date = new Date(foundAt);
  date.setDate(date.getDate() + retentionDays);
  return date.toISOString().slice(0, 10);
}

/**
 * 2. 현재일 기준 잔여 보관 일수(D-Day) 계산 (순수 함수)
 */
export function calculateDaysRemaining(expiryDate: string, currentDate?: string): number {
  const current = currentDate ? new Date(currentDate) : new Date();
  const currentOnlyDate = new Date(current.toISOString().slice(0, 10)).getTime();
  const expiryTime = new Date(expiryDate).getTime();
  const diffTime = expiryTime - currentOnlyDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 3. 보관 만료 여부를 반영한 실제 상태 평가 (순수 함수)
 */
export function evaluateLostItemEffectiveStatus(
  item: LostItem,
  currentDate?: string
): LostItemStatus {
  if (item.status === 'CLAIMED' || item.status === 'DISPOSED' || item.status === 'DONATED') {
    return item.status;
  }
  const expiryDate = calculateExpiryDate(item.foundAt, item.retentionDays);
  const remaining = calculateDaysRemaining(expiryDate, currentDate);
  if (remaining <= 0) {
    return 'EXPIRED';
  }
  return 'STORED';
}

/**
 * 4. 만료 임박(기본 7일 이하) 또는 이미 만료된 분실물 필터 (순수 함수)
 */
export function filterItemsExpiringSoon(
  items: readonly LostItem[],
  thresholdDays = 7,
  currentDate?: string
): LostItem[] {
  return items.filter((item) => {
    const status = evaluateLostItemEffectiveStatus(item, currentDate);
    if (status !== 'STORED' && status !== 'EXPIRED') return false;
    const expiryDate = calculateExpiryDate(item.foundAt, item.retentionDays);
    const remaining = calculateDaysRemaining(expiryDate, currentDate);
    return remaining <= thresholdDays;
  });
}

/**
 * 5. 분실물 종합 관리 통계 요약 (순수 함수)
 */
export function summarizeLostAndFound(
  items: readonly LostItem[],
  currentDate?: string
): LostAndFoundSummary {
  let storedCount = 0;
  let expiringSoonCount = 0;
  let claimedCount = 0;
  let disposedOrDonatedCount = 0;

  for (const item of items) {
    const status = evaluateLostItemEffectiveStatus(item, currentDate);
    if (status === 'STORED') {
      storedCount++;
      const expiry = calculateExpiryDate(item.foundAt, item.retentionDays);
      if (calculateDaysRemaining(expiry, currentDate) <= 7) {
        expiringSoonCount++;
      }
    } else if (status === 'EXPIRED') {
      storedCount++;
      expiringSoonCount++;
    } else if (status === 'CLAIMED') {
      claimedCount++;
    } else if (status === 'DISPOSED' || status === 'DONATED') {
      disposedOrDonatedCount++;
    }
  }

  const claimRate =
    items.length > 0 ? Math.round((claimedCount / items.length) * 1000) / 10 : 0;

  return {
    totalCount: items.length,
    storedCount,
    expiringSoonCount,
    claimedCount,
    disposedOrDonatedCount,
    claimRate,
  };
}
