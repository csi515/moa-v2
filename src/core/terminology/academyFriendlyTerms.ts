/**
 * Academy Friendly Terminology Dictionary & Helper
 *
 * 개발자/시스템 중심의 기술 용어(Billing, Ledger, Placement, Customer, Active 등)를
 * 50~60대 원장님 및 학원 강사 현장 사용자의 눈높이에 맞춘
 * 친숙하고 직관적인 '현장 학원 우리말 용어'로 100% 매핑하는 단일 진실 공급원(SSOT)입니다.
 *
 * 아키텍처 규칙:
 * - Core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

export const ACADEMY_FRIENDLY_TERMS: Record<string, string> = {
  // 1. 고객 및 원생 도메인 (Customer / Member / Roster)
  customer: '원생',
  customers: '원생들',
  member: '원생',
  members: '원생들',
  student: '원생',
  students: '원생들',
  roster: '원생 명부',

  // 2. 재원 상태 (Status)
  active: '재원 중',
  paused: '휴원',
  withdrawn: '퇴원',
  pending: '등록 대기',

  // 3. 시간표 및 배정 도메인 (Scheduling / Placement)
  placement: '수업 시간표 배정',
  placements: '수업 시간표 배정 내역',
  schedule: '수업 시간표',
  scheduling: '수업 시간표 관리',
  timetable: '수업 시간표',

  // 4. 수납 및 재무 도메인 (Billing / Invoicing / Ledger / Credit)
  billing: '수강료 수납 및 청구',
  invoicing: '수강료 청구 고지',
  invoice: '수강료 고지서',
  invoices: '수강료 고지서 내역',
  tuition: '수강료',
  payment: '수강료 수납',
  ledger: '학원 장부',
  credit: '원비 지갑',
  deposit: '선불 충전금',

  // 5. 출결 및 학원 시설
  attendance: '출결 관리',
  checkin: '등원 (출석)',
  checkout: '하원',
  teacher: '선생님',
  instructor: '선생님',
  guardian: '학부모',
  parent: '학부모',
  facility: '학원',
  room: '피아노 연습실',
  practice_room: '피아노 연습실',
} as const;

/**
 * 시스템/영문 기술 키를 현장 친화적 학원 우리말 용어로 변환합니다.
 */
export function toAcademyFriendlyTerm(rawKey: string, fallback?: string): string {
  if (!rawKey) return fallback ?? '';
  const normalized = rawKey.trim().toLowerCase();
  if (normalized in ACADEMY_FRIENDLY_TERMS) {
    return ACADEMY_FRIENDLY_TERMS[normalized];
  }
  return fallback ?? rawKey;
}

/**
 * 원생 재원 상태를 친숙한 우리말 텍스트로 반환합니다.
 */
export function getAcademyStatusLabel(status: string | undefined | null): string {
  if (!status) return '미지정';
  const norm = status.trim().toLowerCase();
  if (norm === 'active') return '재원 중';
  if (norm === 'paused') return '휴원';
  if (norm === 'withdrawn') return '퇴원';
  if (norm === 'pending') return '등록 대기';
  return status;
}

/**
 * 수강료 청구 상태를 현장 용어로 반환합니다.
 */
export function getAcademyInvoiceStatusLabel(status: string | undefined | null): string {
  if (!status) return '상태 없음';
  const norm = status.trim().toLowerCase();
  switch (norm) {
    case 'paid':
      return '당월 완납';
    case 'unpaid':
      return '미납';
    case 'partial':
      return '일부 납부';
    case 'overdue':
      return '연체';
    case 'cancelled':
    case 'canceled':
      return '청구 취소';
    case 'draft':
      return '청구 대기';
    default:
      return status;
  }
}

/**
 * 수납 결제 수단을 직관적인 한글 명칭으로 변환합니다.
 */
export function getAcademyPaymentMethodLabel(method: string | undefined | null): string {
  if (!method) return '기타 수납';
  const norm = method.trim().toLowerCase();
  switch (norm) {
    case 'onsite_card':
    case 'card':
      return '학원 현장 카드 결제';
    case 'bank_transfer':
    case 'transfer':
      return '계좌 이체';
    case 'cash':
      return '현금 수납';
    case 'credit_wallet':
    case 'credit':
      return '선불 원비 지갑 차감';
    case 'easy_pay':
      return '간편 결제 (앱/링크)';
    default:
      return method;
  }
}
