/**
 * Student Form Smart Input & Preset Helpers
 *
 * 원생 등록 시 반복 입력을 줄이고 15회 -> 3회로 타이핑을 단축하기 위한
 * 스마트 자동 완성 및 기본값 프리셋 유틸리티.
 */

/**
 * 전화번호 스마트 자동 포맷팅 & 8자리 뒷자리 자동 010 완성
 *
 * 규칙:
 * 1. 숫자 이외의 문자 제거
 * 2. 8자리 입력 시 (예: '23456789') 010 접두사 자동 보정 -> '010-2345-6789'
 * 3. 02 지역번호 (서울) 포맷팅
 * 4. 010 등 일반 휴대폰/지역번호 표준 3-4-4 포맷팅
 */
export function formatSmartPhoneInput(raw: string): string {
  if (!raw) return '';

  const clean = raw.trim();
  const digits = clean.replace(/\D/g, '');

  if (!digits) return '';

  // 8자리 뒷번호만 입력한 경우 (예: '12345678') -> '010-1234-5678'로 스마트 완성
  if (digits.length === 8 && !digits.startsWith('0')) {
    return `010-${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // 서울(02) 유선전화
  if (digits.startsWith('02')) {
    const limited = digits.slice(0, 10);
    if (limited.length <= 2) return limited;
    if (limited.length <= 5) return `${limited.slice(0, 2)}-${limited.slice(2)}`;
    if (limited.length <= 9) {
      return `${limited.slice(0, 2)}-${limited.slice(2, 5)}-${limited.slice(5)}`;
    }
    return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6)}`;
  }

  // 휴대폰(010, 011 등) 및 일반 3자리 지역번호
  const limited = digits.slice(0, 11);
  if (limited.length <= 3) return limited;
  if (limited.length <= 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  if (limited.length === 10 && !limited.startsWith('010')) {
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
  return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
}

/** 대표적인 수강료 간편 증감 가산 버튼 목록 (+1만, +5만, +10만) */
export const TUITION_STEP_AMOUNTS = [
  { label: '+1만', value: 10000 },
  { label: '+5만', value: 50000 },
  { label: '+10만', value: 100000 },
] as const;

/** 대표적인 형제자매/다자녀 수강료 1터치 할인 차감 버튼 목록 (-1만, -2만, -3만) */
export const TUITION_DISCOUNT_PRESETS = [
  { label: '-1만', value: 10000 },
  { label: '-2만', value: 20000 },
  { label: '-3만', value: 30000 },
] as const;

/**
 * 기존 수강료에 증감 단위를 안전하게 가산하는 헬퍼 함수
 */
export function applyTuitionStep(
  currentFee: number | string | undefined | null,
  stepAmount: number
): number {
  const current = typeof currentFee === 'number' ? currentFee : Number(currentFee) || 0;
  return Math.max(0, current + stepAmount);
}

/**
 * 기존 수강료에서 할인 금액을 안전하게 차감하는 헬퍼 함수 (최소 0원 보장)
 */
export function applyTuitionDiscount(
  currentFee: number | string | undefined | null,
  discountAmount: number
): number {
  const current = typeof currentFee === 'number' ? currentFee : Number(currentFee) || 0;
  return Math.max(0, current - discountAmount);
}

/** 레거시 고정 금액 프리셋 호환성 유지용 */
export const TUITION_PRESET_AMOUNTS = [
  { label: '15만', value: 150000 },
  { label: '18만', value: 180000 },
  { label: '20만', value: 200000 },
  { label: '25만', value: 250000 },
  { label: '30만', value: 300000 },
] as const;

/** 대표적인 결제일 1터치 프리셋 일자 목록 (매월 N일) */
export const PAYMENT_DAY_PRESETS = [1, 5, 10, 15, 25] as const;
