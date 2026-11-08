/**
 * Invoice Bundle Helpers
 *
 * 피아노 학원에서 수강료 외에 교재비, 콩쿠르 참가비, 정기 연주회비 등을
 * 원터치로 한 장의 청구/수납에 묶어 처리할 수 있도록 돕는 도메인 유틸리티.
 */

export interface InvoiceBundlePreset {
  id: string;
  label: string;
  category: 'textbook' | 'event';
  amount: number;
}

/** 피아노 학원 대표 부대비용 프리셋 목록 */
export const PIANO_INVOICE_BUNDLE_PRESETS: readonly InvoiceBundlePreset[] = [
  { id: 'textbook-basic', label: '바이엘/체르니 교재', category: 'textbook', amount: 15000 },
  { id: 'textbook-advanced', label: '소나티네/명곡집', category: 'textbook', amount: 18000 },
  { id: 'recital-fee', label: '정기 연주회비', category: 'event', amount: 30000 },
  { id: 'competition-fee', label: '콩쿠르 참가비', category: 'event', amount: 50000 },
] as const;

/**
 * 부대비용 항목을 수납 메모에 자연스럽게 병합하는 헬퍼 함수
 */
export function appendBundleItemToMemo(
  currentMemo: string,
  itemLabel: string,
  amount: number
): string {
  const note = `${itemLabel} (${amount.toLocaleString()}원)`;
  const trimmed = currentMemo.trim();

  if (!trimmed) {
    return note;
  }
  if (trimmed.includes(itemLabel)) {
    return trimmed;
  }
  return `${trimmed}, ${note}`;
}

/**
 * 기본 미납 수강료에 선택한 부대비용 총액을 합산하는 함수
 */
export function calculateBundledTotal(baseAmount: number, additionalFees: number[]): number {
  const validBase = Math.max(0, Number(baseAmount) || 0);
  const addTotal = additionalFees.reduce((sum, fee) => sum + Math.max(0, Number(fee) || 0), 0);
  return validBase + addTotal;
}
