/**
 * Invoice Bundle Helpers
 *
 * 정기 이용료 외에 교재비, 참가비, 행사비 등을
 * 원터치로 한 장의 청구/수납에 묶어 처리할 수 있도록 돕는 도메인 유틸리티.
 */

export interface InvoiceBundlePreset {
  id: string;
  label: string;
  category: 'textbook' | 'event';
  amount: number;
}

/** 대표 부대비용 프리셋 목록 */
export const OPTIONAL_INVOICE_BUNDLE_PRESETS: readonly InvoiceBundlePreset[] = [
  { id: 'textbook-basic', label: '기초 입문 교재', category: 'textbook', amount: 15000 },
  { id: 'textbook-advanced', label: '중상급 심화 교재', category: 'textbook', amount: 18000 },
  { id: 'recital-fee', label: '정기 발표회비', category: 'event', amount: 30000 },
  { id: 'competition-fee', label: '대회/콩쿠르 참가비', category: 'event', amount: 50000 },
] as const;

/** 레거시 호환 별칭 */
export const PIANO_INVOICE_BUNDLE_PRESETS = OPTIONAL_INVOICE_BUNDLE_PRESETS;

/**
 * 부대비용 항목을 수납 메모에 자연스럽게 병합하는 헬퍼 함수
 */
export function appendBundleItemToMemo(
  currentMemo: string,
  itemLabel: string,
  amount: number
): string {
  const line = `[추가항목] ${itemLabel} (${amount.toLocaleString()}원)`;
  if (!currentMemo.trim()) return line;
  if (currentMemo.includes(itemLabel)) return currentMemo;
  return `${currentMemo} / ${line}`;
}

/**
 * 합산 결제 총액을 계산하는 헬퍼
 */
export function calculateBundledTotal(
  baseTuition: number,
  selectedPresetAmounts: number[]
): number {
  return selectedPresetAmounts.reduce((sum, val) => sum + val, baseTuition);
}
