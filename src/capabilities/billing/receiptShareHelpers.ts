/**
 * Tuition & Payment Receipt Share Helpers
 *
 * 수강료 및 원페이퍼 부대비용 수납 후 학부모 카카오톡/문자 전송용
 * 영수증 안내 메시지 자동 생성 및 클립보드 복사 유틸리티.
 */

export interface ReceiptTextParams {
  academyName?: string;
  studentName: string;
  yearMonth: string; // "2026-11"
  payAmount: number;
  payMethodLabel: string; // "카드", "계좌이체" 등
  payDate: string; // "2026-11-09"
  memo?: string;
}

/**
 * 학부모 전달용 원페이퍼 모바일 수납 영수증 텍스트 생성
 */
export function generateTuitionReceiptText(params: ReceiptTextParams): string {
  const academy = params.academyName?.trim() || '음악학원';
  const formattedAmount = (params.payAmount || 0).toLocaleString('ko-KR');

  // "2026-11" -> "2026년 11월"
  let formattedMonth = params.yearMonth;
  if (/^\d{4}-\d{2}$/.test(params.yearMonth)) {
    const [y, m] = params.yearMonth.split('-');
    formattedMonth = `${y}년 ${parseInt(m, 10)}월`;
  }

  const lines = [
    `[${academy}] 수납 확인 영수증`,
    '━━━━━━━━━━━━━━━━━━',
    `• 원생명: ${params.studentName}`,
    `• 수강월: ${formattedMonth}`,
    `• 수납일시: ${params.payDate}`,
    `• 결제수단: ${params.payMethodLabel}`,
    `• 수납금액: ${formattedAmount}원`,
  ];

  if (params.memo && params.memo.trim()) {
    lines.push(`• 수납내역/메모: ${params.memo.trim()}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('소중한 자녀를 믿고 맡겨주셔서 감사합니다. 🎵');

  return lines.join('\n');
}

/**
 * 안전한 클립보드 복사 함수 (fallback 지원)
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // clipboard API 실패 시 fallback 시도
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
