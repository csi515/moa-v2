/**
 * B2B 공급처 원장 & 매입 세무 전표 순수 도메인 엔진 (Pure Functions)
 *
 * 주요 기능:
 *  1. 매입 전표(Purchase Invoice) 공급가액·부가세(10%)·총액 계산
 *  2. 납품 품목별 단가 변동률 추적 및 원가 급등(Surge) 감지
 *  3. 외상 매입금(AP) 결제 분개 및 잔액 상태 전이 (미지급/부분지급/완납)
 *  4. 부가세 신고용 홈택스 매입 세금계산서 합계표 자동 집계
 *  5. 외상 매입금 연체 에이징(AP Aging) 리포트 산출
 */

export type PaymentTerm = 'cash_on_delivery' | 'net_15' | 'end_of_month' | 'end_of_next_month';
export type TaxInvoiceType = 'tax_invoice' | 'zero_tax' | 'tax_exempt' | 'credit_card' | 'cash_receipt';
export type TaxInvoiceStatus = 'issued' | 'pending' | 'reverse_requested' | 'not_applicable';
export type InvoicePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface Vendor {
  id: string;
  name: string; // 상호 (e.g. "(주)한국식자재유통", "밀본 코리아", "현대모비스 성수대리점")
  businessNumber: string; // 사업자등록번호 (10자리)
  representative: string; // 대표자명
  contactPhone: string;
  email?: string;
  bankAccount: {
    bank: string;
    accountNumber: string;
    accountHolder: string;
  };
  paymentTerm: PaymentTerm;
  currentPayableBalance: number; // 현재 외상 매입금 미지급 잔액 (AP)
}

export interface PurchaseItemInput {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt?: boolean; // 면세 품목 여부 (농수산물 등)
}

export interface PurchaseInvoiceItem extends PurchaseItemInput {
  supplyAmount: number; // 공급가액 (수량 * 단가)
  taxAmount: number; // 부가세 (일반과세 10%, 면세 0원)
  totalAmount: number; // 합계 (공급가액 + 부가세)
}

export interface PurchaseInvoice {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // 결제 예정일 (YYYY-MM-DD)
  items: PurchaseInvoiceItem[];
  totalSupplyAmount: number; // 총 공급가액
  totalTaxAmount: number; // 총 부가세 (매입세액)
  totalAmount: number; // 총 매입 전표 금액
  taxInvoiceType: TaxInvoiceType;
  taxInvoiceStatus: TaxInvoiceStatus;
  hometaxApprovalNumber?: string; // 홈택스 전자세금계산서 승인번호
  paymentStatus: InvoicePaymentStatus;
  paidAmount: number;
  remainingAmount: number;
}

export interface PriceFluctuationResult {
  previousPrice: number;
  currentPrice: number;
  priceDifference: number;
  changeRatePercent: number; // 변동률 (+5.2%, -3.1%)
  isPriceSurge: boolean; // 임계치 초과 급등 여부
  alertMessage?: string;
}

export interface ApAgingBucket {
  currentNotDue: number; // 만기 미도래 정상 잔액
  overdue1To30Days: number; // 1~30일 연체
  overdue31To60Days: number; // 31~60일 연체
  overdue61To90Days: number; // 61~90일 연체
  overdueOver90Days: number; // 90일 초과 장기 연체
  totalOutstanding: number; // 총 외상 미지급액
}

export interface HometaxTaxInvoiceSummary {
  periodLabel: string; // e.g. "2026년 제1기 확정 (1월~6월)"
  totalVendorCount: number; // 공급처(매입처) 수
  totalInvoiceCount: number; // 총 매입 매수
  totalSupplyAmount: number; // 총 공급가액
  totalDeductibleTax: number; // 공제 가능 매입세액
}

/**
 * 1. 매입 전표 품목들의 공급가액, 부가세(10%), 총합계를 계산합니다.
 */
export function calculatePurchaseInvoiceTotals(items: PurchaseItemInput[]): {
  items: PurchaseInvoiceItem[];
  totalSupplyAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
} {
  let totalSupply = 0;
  let totalTax = 0;

  const processedItems: PurchaseInvoiceItem[] = items.map((item) => {
    const qty = Math.max(0, item.quantity);
    const price = Math.max(0, item.unitPrice);
    const supply = Math.round(qty * price);
    const tax = item.isTaxExempt ? 0 : Math.round(supply * 0.1);
    const total = supply + tax;

    totalSupply += supply;
    totalTax += tax;

    return {
      ...item,
      quantity: qty,
      unitPrice: price,
      supplyAmount: supply,
      taxAmount: tax,
      totalAmount: total,
    };
  });

  return {
    items: processedItems,
    totalSupplyAmount: totalSupply,
    totalTaxAmount: totalTax,
    totalAmount: totalSupply + totalTax,
  };
}

/**
 * 2. 동일 품목의 직전 입고 단가 대비 가격 변동률을 추적하고 급등 경고를 생성합니다.
 */
export function trackItemPriceFluctuation(
  previousPrice: number,
  currentPrice: number,
  surgeThresholdPercent: number = 10
): PriceFluctuationResult {
  if (previousPrice <= 0) {
    return {
      previousPrice: 0,
      currentPrice,
      priceDifference: currentPrice,
      changeRatePercent: 0,
      isPriceSurge: false,
    };
  }

  const diff = currentPrice - previousPrice;
  const changeRate = Math.round((diff / previousPrice) * 1000) / 10; // 소수점 첫째자리까지
  const isSurge = changeRate >= surgeThresholdPercent;

  let alertMessage: string | undefined;
  if (isSurge) {
    alertMessage = `단가가 직전(${previousPrice.toLocaleString()}원) 대비 ${changeRate}% 상승하여 임계치(${surgeThresholdPercent}%)를 초과했습니다. 공급처 단가 재협상 또는 대체품 발주를 검토하세요.`;
  }

  return {
    previousPrice,
    currentPrice,
    priceDifference: diff,
    changeRatePercent: changeRate,
    isPriceSurge: isSurge,
    alertMessage,
  };
}

/**
 * 3. 매입 전표에 대한 결제(대금 지급)를 처리하고 미지급 잔액 및 결제 상태를 전이합니다.
 */
export function recordInvoicePayment(
  invoice: PurchaseInvoice,
  paymentAmount: number
): {
  updatedInvoice: PurchaseInvoice;
  appliedPayment: number;
  isFullyPaid: boolean;
} {
  const currentRemaining = invoice.remainingAmount;
  const pay = Math.max(0, Math.min(paymentAmount, currentRemaining));
  const nextPaid = invoice.paidAmount + pay;
  const nextRemaining = invoice.totalAmount - nextPaid;

  let nextStatus: InvoicePaymentStatus = 'unpaid';
  if (nextRemaining <= 0) {
    nextStatus = 'paid';
  } else if (nextPaid > 0) {
    nextStatus = 'partially_paid';
  }

  return {
    updatedInvoice: {
      ...invoice,
      paidAmount: nextPaid,
      remainingAmount: nextRemaining,
      paymentStatus: nextStatus,
    },
    appliedPayment: pay,
    isFullyPaid: nextRemaining <= 0,
  };
}

/**
 * 4. 세무 신고용 매입 세금계산서 합계표를 집계합니다 (면세 품목 및 세금계산서 미발행분 분리).
 */
export function generateHometaxPurchaseTaxSummary(
  invoices: PurchaseInvoice[],
  periodLabel: string
): HometaxTaxInvoiceSummary {
  // 세금계산서 발급 완료 또는 역발행된 정식 세금계산서만 필터링
  const taxInvoices = invoices.filter(
    (inv) =>
      inv.taxInvoiceType === 'tax_invoice' &&
      (inv.taxInvoiceStatus === 'issued' || inv.taxInvoiceStatus === 'reverse_requested')
  );

  const vendorSet = new Set(taxInvoices.map((inv) => inv.vendorId));
  const totalSupply = taxInvoices.reduce((sum, inv) => sum + inv.totalSupplyAmount, 0);
  const totalTax = taxInvoices.reduce((sum, inv) => sum + inv.totalTaxAmount, 0);

  return {
    periodLabel,
    totalVendorCount: vendorSet.size,
    totalInvoiceCount: taxInvoices.length,
    totalSupplyAmount: totalSupply,
    totalDeductibleTax: totalTax,
  };
}

/**
 * 5. 외상 매입금 미지급 잔액의 만기 경과(AP Aging)를 분석합니다.
 */
export function calculateApAgingReport(
  invoices: PurchaseInvoice[],
  asOfDate: string = new Date().toISOString().split('T')[0]
): ApAgingBucket {
  const asOf = new Date(asOfDate).getTime();

  let currentNotDue = 0;
  let overdue1To30 = 0;
  let overdue31To60 = 0;
  let overdue61To90 = 0;
  let overdueOver90 = 0;
  let totalOutstanding = 0;

  for (const inv of invoices) {
    if (inv.remainingAmount <= 0) continue; // 완납된 건 스킵

    totalOutstanding += inv.remainingAmount;
    const dueTime = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((asOf - dueTime) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      currentNotDue += inv.remainingAmount;
    } else if (diffDays <= 30) {
      overdue1To30 += inv.remainingAmount;
    } else if (diffDays <= 60) {
      overdue31To60 += inv.remainingAmount;
    } else if (diffDays <= 90) {
      overdue61To90 += inv.remainingAmount;
    } else {
      overdueOver90 += inv.remainingAmount;
    }
  }

  return {
    currentNotDue,
    overdue1To30Days: overdue1To30,
    overdue31To60Days: overdue31To60,
    overdue61To90Days: overdue61To90,
    overdueOver90Days: overdueOver90,
    totalOutstanding,
  };
}
