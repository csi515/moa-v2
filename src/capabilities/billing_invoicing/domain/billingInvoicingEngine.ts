/**
 * 정기 청구 & 미수금 원장 엔진 (Pure Function Domain)
 *
 * 대상: 학원 월 교습비 정기 청구, 작업실/공유오피스 월 임대료, PT 월 정기 수납
 * 순수 로직:
 *  1. 청구일 기준 대상자 산출식
 *  2. 납부 상태 머신 (PENDING -> PAID -> OVERDUE -> WAIVED)
 *  3. Web Share API 청구서 텍스트 생성 (인프라 비용 0원 원칙)
 */

export type InvoiceStatus = 'PENDING' | 'UNPAID' | 'PAID' | 'OVERDUE' | 'WAIVED';

export type CounterFeeFilter = 'all' | 'open' | 'paid';

const OPEN_FEE_STATUSES = new Set(['PENDING', 'UNPAID', 'OVERDUE']);

export function filterMonthlyFees<T extends { status: string }>(
  rows: T[],
  filter: CounterFeeFilter
): T[] {
  if (filter === 'paid') return rows.filter((row) => row.status === 'PAID');
  if (filter === 'open') return rows.filter((row) => OPEN_FEE_STATUSES.has(row.status));
  return rows;
}

export function summarizeOpenFees<T extends { status: string; memberId: string; amount: number }>(
  rows: T[]
): { people: number; amount: number } {
  const open = filterMonthlyFees(rows, 'open');
  return {
    people: new Set(open.map((row) => row.memberId)).size,
    amount: open.reduce((sum, row) => sum + row.amount, 0),
  };
}

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

// ============================================================================
// 국세청 홈택스 '전자세금계산서 일괄작성' 표준 서식 CSV 엔진
// ============================================================================

export interface TaxInvoiceSupplier {
  businessNumber: string; // 사업자등록번호 (10자리)
  subBusinessNumber?: string; // 종사업장번호
  companyName: string; // 상호(법인명)
  representativeName: string; // 성명(대표자명)
  address: string; // 사업장 주소
  businessType: string; // 업태
  businessItem: string; // 종목
  email: string; // 이메일
}

export interface TaxInvoiceBuyer {
  buyerType: 'BUSINESS' | 'INDIVIDUAL'; // BUSINESS: 01(사업자등록번호), INDIVIDUAL: 02(주민등록번호)
  registrationNumber: string; // 사업자등록번호 또는 주민등록번호
  subBusinessNumber?: string;
  companyName: string;
  representativeName: string;
  address?: string;
  businessType?: string;
  businessItem?: string;
  email1: string;
  email2?: string;
}

export interface TaxInvoiceItem {
  day?: string; // DD (예: '25')
  itemName: string; // 품목명
  specification?: string; // 규격
  quantity?: number; // 수량
  unitPrice?: number; // 단가
  supplyAmount: number; // 공급가액
  taxAmount: number; // 세액
  remark?: string; // 품목 비고
}

export interface TaxInvoice {
  invoiceType?: '01' | '02'; // 01: 일반, 02: 영세율 (기본값: '01')
  writeDate: string; // YYYYMMDD 또는 YYYY-MM-DD
  supplier: TaxInvoiceSupplier;
  buyer: TaxInvoiceBuyer;
  items: TaxInvoiceItem[]; // 최대 4개
  claimType: 'RECEIPT' | 'CLAIM'; // RECEIPT: 01(영수), CLAIM: 02(청구)
  remark?: string;
  totalSupplyAmount?: number;
  totalTaxAmount?: number;
}

/**
 * CSV 특수문자(따옴표, 쉼표, 줄바꿈) 이스케이프 유틸
 */
function escapeCsv(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 사업자번호 / 주민번호 하이픈 제거 유틸
 */
function cleanBizNumber(val: string): string {
  return val.replace(/[^0-9]/g, '');
}

/**
 * 날짜를 YYYYMMDD 포맷으로 정규화
 */
function normalizeDateYYYYMMDD(val: string): string {
  return val.replace(/[^0-9]/g, '').slice(0, 8);
}

/**
 * 국세청 홈택스 전자세금계산서 일괄작성 표준 서식 CSV 생성
 * - RFC 4180 호환 및 Excel 한글 깨짐 방지 UTF-8 BOM 지원
 */
export function generateHometaxTaxInvoiceCsv(invoices: TaxInvoice[]): string {
  const headers = [
    '전자세금계산서 종류',
    '작성일자',
    '공급자 등록번호',
    '공급자 종사업장번호',
    '공급자 상호',
    '공급자 성명',
    '공급자 사업장주소',
    '공급자 업태',
    '공급자 종목',
    '공급자 이메일',
    '공급받는자 구분',
    '공급받는자 등록번호',
    '공급받는자 종사업장번호',
    '공급받는자 상호',
    '공급받는자 성명',
    '공급받는자 사업장주소',
    '공급받는자 업태',
    '공급받는자 종목',
    '공급받는자 이메일1',
    '공급받는자 이메일2',
    '공급가액',
    '세액',
    '비고',
    '일자1',
    '품목1',
    '규격1',
    '수량1',
    '단가1',
    '공급가액1',
    '세액1',
    '품목비고1',
    '일자2',
    '품목2',
    '규격2',
    '수량2',
    '단가2',
    '공급가액2',
    '세액2',
    '품목비고2',
    '일자3',
    '품목3',
    '규격3',
    '수량3',
    '단가3',
    '공급가액3',
    '세액3',
    '품목비고3',
    '일자4',
    '품목4',
    '규격4',
    '수량4',
    '단가4',
    '공급가액4',
    '세액4',
    '품목비고4',
    '영수/청구 구분',
  ];

  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(','));

  for (const inv of invoices) {
    const invoiceType = inv.invoiceType || '01';
    const writeDate = normalizeDateYYYYMMDD(inv.writeDate);

    // 총 공급가액 및 세액 계산
    const calculatedSupply = inv.items.reduce((acc, it) => acc + (it.supplyAmount || 0), 0);
    const calculatedTax = inv.items.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
    const totalSupply = inv.totalSupplyAmount !== undefined ? inv.totalSupplyAmount : calculatedSupply;
    const totalTax = inv.totalTaxAmount !== undefined ? inv.totalTaxAmount : calculatedTax;

    const buyerTypeCode = inv.buyer.buyerType === 'BUSINESS' ? '01' : '02';
    const claimTypeCode = inv.claimType === 'RECEIPT' ? '01' : '02';

    // 품목 슬롯 4개 초기화
    const itemSlots: string[] = [];
    for (let i = 0; i < 4; i++) {
      const it = inv.items[i];
      if (it) {
        itemSlots.push(
          escapeCsv(it.day ? it.day.padStart(2, '0') : writeDate.slice(6, 8)),
          escapeCsv(it.itemName || ''),
          escapeCsv(it.specification || ''),
          escapeCsv(it.quantity !== undefined ? it.quantity : ''),
          escapeCsv(it.unitPrice !== undefined ? it.unitPrice : ''),
          escapeCsv(it.supplyAmount || 0),
          escapeCsv(it.taxAmount || 0),
          escapeCsv(it.remark || '')
        );
      } else {
        itemSlots.push('""', '""', '""', '""', '""', '""', '""', '""');
      }
    }

    const row = [
      escapeCsv(invoiceType),
      escapeCsv(writeDate),
      escapeCsv(cleanBizNumber(inv.supplier.businessNumber)),
      escapeCsv(inv.supplier.subBusinessNumber || ''),
      escapeCsv(inv.supplier.companyName),
      escapeCsv(inv.supplier.representativeName),
      escapeCsv(inv.supplier.address),
      escapeCsv(inv.supplier.businessType),
      escapeCsv(inv.supplier.businessItem),
      escapeCsv(inv.supplier.email),
      escapeCsv(buyerTypeCode),
      escapeCsv(cleanBizNumber(inv.buyer.registrationNumber)),
      escapeCsv(inv.buyer.subBusinessNumber || ''),
      escapeCsv(inv.buyer.companyName),
      escapeCsv(inv.buyer.representativeName),
      escapeCsv(inv.buyer.address || ''),
      escapeCsv(inv.buyer.businessType || ''),
      escapeCsv(inv.buyer.businessItem || ''),
      escapeCsv(inv.buyer.email1),
      escapeCsv(inv.buyer.email2 || ''),
      escapeCsv(totalSupply),
      escapeCsv(totalTax),
      escapeCsv(inv.remark || ''),
      ...itemSlots,
      escapeCsv(claimTypeCode),
    ];

    lines.push(row.join(','));
  }

  // Excel 한글 인코딩 호환을 위해 UTF-8 BOM 추가
  return '\uFEFF' + lines.join('\r\n');
}

// ============================================================================
// 거래처/회원별 미수금 에이징 리포트(Aging Report) 분석 엔진
// ============================================================================

export interface UnpaidRecord {
  id: string;
  memberOrCompanyId: string;
  memberOrCompanyName: string;
  invoiceNumber?: string;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  contactPhone?: string;
  contactEmail?: string;
  category?: string; // 수강료, 원자재 납품대금, 외주용역료 등
}

export type AgingRiskLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface MemberAgingItem {
  memberOrCompanyId: string;
  memberOrCompanyName: string;
  contactPhone?: string;
  contactEmail?: string;
  totalUnpaidAmount: number;
  currentAmount: number; // 30일 이내
  days31To60Amount: number; // 31~60일
  days61To90Amount: number; // 61~90일
  over90Amount: number; // 90일 초과
  oldestDueDate: string;
  maxOverdueDays: number;
  riskLevel: AgingRiskLevel;
  unpaidCount: number;
}

export interface AccountsReceivableAgingSummary {
  referenceDate: string;
  totalUnpaidAmount: number;
  totalUnpaidCount: number;
  bucketTotals: {
    current: number; // <= 30일
    days31To60: number; // 31~60일
    days61To90: number; // 61~90일
    over90: number; // > 90일
  };
  bucketCounts: {
    current: number;
    days31To60: number;
    days61To90: number;
    over90: number;
  };
  memberAgingList: MemberAgingItem[];
  highRiskTotal: number; // 61일 이상 (WARNING + CRITICAL 합계)
}

/**
 * 미수금 에이징 리포트 계산 순수 함수
 * @param unpaidRecords 미납된 청구 레코드 목록
 * @param referenceDate 분석 기준일 (기본값: 오늘 YYYY-MM-DD)
 */
export function calculateAccountsReceivableAging(
  unpaidRecords: UnpaidRecord[],
  referenceDate?: string
): AccountsReceivableAgingSummary {
  const refDateStr = referenceDate || new Date().toISOString().slice(0, 10);
  const refTime = new Date(refDateStr).getTime();

  let totalUnpaidAmount = 0;
  const bucketTotals = {
    current: 0,
    days31To60: 0,
    days61To90: 0,
    over90: 0,
  };
  const bucketCounts = {
    current: 0,
    days31To60: 0,
    days61To90: 0,
    over90: 0,
  };

  // 거래처/회원별 집계 맵
  const memberMap = new Map<
    string,
    {
      memberOrCompanyId: string;
      memberOrCompanyName: string;
      contactPhone?: string;
      contactEmail?: string;
      totalUnpaidAmount: number;
      currentAmount: number;
      days31To60Amount: number;
      days61To90Amount: number;
      over90Amount: number;
      oldestDueDate: string;
      maxOverdueDays: number;
      unpaidCount: number;
    }
  >();

  for (const record of unpaidRecords) {
    if (record.amount <= 0) continue;

    const dueTime = new Date(record.dueDate).getTime();
    const diffMs = refTime - dueTime;
    const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    totalUnpaidAmount += record.amount;

    // 버킷 분류
    if (overdueDays <= 30) {
      bucketTotals.current += record.amount;
      bucketCounts.current += 1;
    } else if (overdueDays <= 60) {
      bucketTotals.days31To60 += record.amount;
      bucketCounts.days31To60 += 1;
    } else if (overdueDays <= 90) {
      bucketTotals.days61To90 += record.amount;
      bucketCounts.days61To90 += 1;
    } else {
      bucketTotals.over90 += record.amount;
      bucketCounts.over90 += 1;
    }

    // 거래처별 집계
    let memberData = memberMap.get(record.memberOrCompanyId);
    if (!memberData) {
      memberData = {
        memberOrCompanyId: record.memberOrCompanyId,
        memberOrCompanyName: record.memberOrCompanyName,
        contactPhone: record.contactPhone,
        contactEmail: record.contactEmail,
        totalUnpaidAmount: 0,
        currentAmount: 0,
        days31To60Amount: 0,
        days61To90Amount: 0,
        over90Amount: 0,
        oldestDueDate: record.dueDate,
        maxOverdueDays: overdueDays,
        unpaidCount: 0,
      };
      memberMap.set(record.memberOrCompanyId, memberData);
    }

    memberData.totalUnpaidAmount += record.amount;
    memberData.unpaidCount += 1;
    if (record.contactPhone) memberData.contactPhone = record.contactPhone;
    if (record.contactEmail) memberData.contactEmail = record.contactEmail;

    if (overdueDays > memberData.maxOverdueDays) {
      memberData.maxOverdueDays = overdueDays;
    }
    if (record.dueDate < memberData.oldestDueDate) {
      memberData.oldestDueDate = record.dueDate;
    }

    if (overdueDays <= 30) {
      memberData.currentAmount += record.amount;
    } else if (overdueDays <= 60) {
      memberData.days31To60Amount += record.amount;
    } else if (overdueDays <= 90) {
      memberData.days61To90Amount += record.amount;
    } else {
      memberData.over90Amount += record.amount;
    }
  }

  // 리스크 레벨 평가 및 정렬
  const riskPriority: Record<AgingRiskLevel, number> = {
    CRITICAL: 4,
    WARNING: 3,
    WATCH: 2,
    NORMAL: 1,
  };

  const memberAgingList: MemberAgingItem[] = Array.from(memberMap.values()).map((m) => {
    let riskLevel: AgingRiskLevel = 'NORMAL';
    if (m.over90Amount > 0) {
      riskLevel = 'CRITICAL';
    } else if (m.days61To90Amount > 0) {
      riskLevel = 'WARNING';
    } else if (m.days31To60Amount > 0) {
      riskLevel = 'WATCH';
    }

    return {
      ...m,
      riskLevel,
    };
  });

  // 정렬: 리스크 높은 순 -> 총 미수금 높은 순
  memberAgingList.sort((a, b) => {
    const diffRisk = riskPriority[b.riskLevel] - riskPriority[a.riskLevel];
    if (diffRisk !== 0) return diffRisk;
    return b.totalUnpaidAmount - a.totalUnpaidAmount;
  });

  const highRiskTotal = bucketTotals.days61To90 + bucketTotals.over90;

  return {
    referenceDate: refDateStr,
    totalUnpaidAmount,
    totalUnpaidCount: unpaidRecords.filter((r) => r.amount > 0).length,
    bucketTotals,
    bucketCounts,
    memberAgingList,
    highRiskTotal,
  };
}
