/**
 * 정기 청구 & 미수금 원장 엔진 (Pure Function Domain)
 *
 * 대상: 학원 월 교습비 정기 청구, 작업실/공유오피스 월 임대료, PT 월 정기 수납
 * 순수 로직:
 *  1. 청구일 기준 대상자 산출식
 *  2. 납부 상태 머신 (PENDING -> PAID -> OVERDUE -> WAIVED)
 *  3. Web Share API 청구서 텍스트 생성 (인프라 비용 0원 원칙)
 */

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface BillingMember {
  id: string;
  name: string;
  billingDay: number; // 1~31
  monthlyAmount: number;
  isActive: boolean;
  enrollmentStartDate: string; // YYYY-MM-DD
}

export interface InvoiceRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  billingYearMonth: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  paidAt?: string;
  waiveReason?: string;
}

export function calculateBillingDueTargets(
  members: BillingMember[],
  targetYearMonth: string, // YYYY-MM
  targetDay: number // 매월 N일
): {
  dueMembers: BillingMember[];
  totalExpectedAmount: number;
} {
  const dueMembers = members.filter((m) => {
    if (!m.isActive) return false;
    // 가입 시작일이 청구월 이후인 경우 제외
    if (m.enrollmentStartDate.slice(0, 7) > targetYearMonth) return false;
    // 청구일 일치 여부
    return m.billingDay === targetDay;
  });

  const totalExpectedAmount = dueMembers.reduce(
    (acc, m) => acc + m.monthlyAmount,
    0
  );

  return {
    dueMembers,
    totalExpectedAmount,
  };
}

export function transitionInvoiceStatus(
  current: InvoiceRecord,
  action: 'PAY' | 'MARK_OVERDUE' | 'WAIVE',
  payload?: {
    paidAt?: string;
    waiveReason?: string;
  }
): { updatedInvoice: InvoiceRecord; success: boolean; error?: string } {
  switch (action) {
    case 'PAY': {
      if (current.status === 'PAID') {
        return { updatedInvoice: current, success: false, error: '이미 수납 완료된 청구서입니다.' };
      }
      return {
        updatedInvoice: {
          ...current,
          status: 'PAID',
          paidAt: payload?.paidAt ?? new Date().toISOString(),
        },
        success: true,
      };
    }

    case 'MARK_OVERDUE': {
      if (current.status !== 'PENDING') {
        return { updatedInvoice: current, success: false, error: '대기 중인 청구서만 미납/연체 전환 가능합니다.' };
      }
      return {
        updatedInvoice: {
          ...current,
          status: 'OVERDUE',
        },
        success: true,
      };
    }

    case 'WAIVE': {
      if (current.status === 'PAID') {
        return { updatedInvoice: current, success: false, error: '이미 완납된 청구서는 면제 처리할 수 없습니다.' };
      }
      return {
        updatedInvoice: {
          ...current,
          status: 'WAIVED',
          waiveReason: payload?.waiveReason ?? '관리자 면제',
        },
        success: true,
      };
    }

    default:
      return { updatedInvoice: current, success: false, error: '알 수 없는 동작' };
  }
}

export interface InvoiceSharePayload {
  orgName: string;
  memberName: string;
  billingYearMonth: string;
  amount: number;
  dueDate: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface WebShareInvoiceOutput {
  title: string;
  text: string;
  urlFallback: string;
}

/**
 * 인프라 비용 0원 원칙: 통신사 SMS/카카오 알림톡 없이
 * W3C Web Share API 및 클립보드 복사로 완결하는 청구 안내문 생성
 */
export function generateInvoiceShareText(
  payload: InvoiceSharePayload
): WebShareInvoiceOutput {
  const formattedAmount = Number(payload.amount).toLocaleString('ko-KR');

  const title = `[${payload.orgName}] ${payload.billingYearMonth} 정기 수납 안내`;
  const text = [
    `안녕하세요, ${payload.memberName}님.`,
    `[${payload.orgName}] ${payload.billingYearMonth} 정기 청구 안내드립니다.`,
    ``,
    `■ 청구 금액: ${formattedAmount}원`,
    `■ 납부 기한: ${payload.dueDate}까지`,
    `■ 입금 계좌: ${payload.bankName} ${payload.accountNumber} (예금주: ${payload.accountHolder})`,
    ``,
    `※ 본 안내는 MOA 0-Cost 결제 원장에 의해 생성되었습니다. 입금 후 자동 반영됩니다.`,
  ].join('\n');

  return {
    title,
    text,
    urlFallback: '',
  };
}
