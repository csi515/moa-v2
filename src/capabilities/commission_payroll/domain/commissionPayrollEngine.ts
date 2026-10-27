/**
 * 전문가·프리랜서 인센티브 & 요율 정산 순수 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 미용실(hair_salon), 1:1 PT샵(pt_fitness), 학원 강사, 자동차 정비소(auto_repair),
 *           골프 아카데미(golf_academy), 피부과/에스테틱(skin_clinic), 네일샵(nail_salon) 등
 *
 * 주요 기능:
 *  1. 개인별 매출 기여도 및 시술/레슨/정비 단가 기준 커미션(인센티브) 계산
 *  2. 카드 결제 수수료 및 재료비/부대비용 차감 정산
 *  3. 3.3% 사업소득세(소득세 3% + 지방소득세 0.3%) 원천징수 자동 계산
 *  4. 세전/세후 실수령액 및 전문가별 월간 정산 명세서(PayrollStatement) 산출
 */

export interface StaffPayrollPolicy {
  staffId: string;
  staffName: string;
  role: string; // e.g. "수석 헤어 디자이너", "시니어 PT 트레이너", "마스터 미캐닉"
  baseSalary: number; // 기본급 (프리랜서의 경우 0원 가능)
  defaultCommissionRate: number; // 기본 인센티브 요율 (예: 0.50 -> 매출의 50%)
  withholdingTaxRate?: number; // 원천징수 세율 (기본 0.033: 3.3%)
  cardFeeDeductionRate?: number; // 카드 결제 시 수수료 공제율 (예: 0.03 -> 3%)
  fixedDeductions?: number; // 고정 공제액 (협회비, 대여료 등)
}

export type PaymentMethod = 'card' | 'cash' | 'transfer';

export interface ServicePerformanceItem {
  id: string;
  staffId: string;
  serviceDate: string; // YYYY-MM-DD
  serviceName: string; // e.g. "시그니처 볼륨 매직 펌", "1:1 퍼스널 트레이닝 10회", "합성유 교환 & 점검"
  customerName: string;
  grossSales: number; // 매출액 (단가)
  paymentMethod: PaymentMethod;
  customRate?: number; // 특정 시술/VIP 세션 시 개별 요율 우선 적용
  materialCost?: number; // 건별 부자재/재료비 공제액
}

export interface PayrollStatement {
  staffId: string;
  staffName: string;
  role: string;
  performanceCount: number;
  totalGrossSales: number;
  baseSalary: number;
  totalCommission: number;
  totalCardFeeDeduction: number;
  totalMaterialDeduction: number;
  totalFixedDeductions: number;
  preTaxEarnings: number; // 세전 정산 총액
  incomeTax: number; // 사업소득세 (3%)
  localIncomeTax: number; // 지방소득세 (0.3%)
  totalWithholdingTax: number; // 원천징수 합계 (3.3%)
  netPayout: number; // 세후 실지급액
  effectiveCommissionRate: number; // 매출 대비 실수령 비율 (%)
}

export interface PayrollBatchSummary {
  totalStaffCount: number;
  totalGrossSales: number;
  totalPreTaxEarnings: number;
  totalWithholdingTax: number;
  totalNetPayout: number;
  statements: PayrollStatement[];
}

/**
 * 1. 건별 커미션 및 공제 계산 (순수 함수)
 */
export function calculateItemCommission(
  item: ServicePerformanceItem,
  defaultRate: number,
  cardFeeRate = 0
): {
  grossSales: number;
  appliedRate: number;
  commission: number;
  cardFeeDeduction: number;
  materialDeduction: number;
  netItemEarnings: number;
} {
  const appliedRate = item.customRate ?? defaultRate;
  const commission = Math.round(item.grossSales * appliedRate);
  const cardFeeDeduction =
    item.paymentMethod === 'card' && cardFeeRate > 0
      ? Math.round(item.grossSales * cardFeeRate)
      : 0;
  const materialDeduction = item.materialCost ?? 0;
  const netItemEarnings = commission - cardFeeDeduction - materialDeduction;

  return {
    grossSales: item.grossSales,
    appliedRate,
    commission,
    cardFeeDeduction,
    materialDeduction,
    netItemEarnings,
  };
}

/**
 * 2. 개별 전문가 월간 정산 명세서 산출 (순수 함수)
 */
export function calculateStaffPayroll(
  policy: StaffPayrollPolicy,
  items: readonly ServicePerformanceItem[]
): PayrollStatement {
  const staffItems = items.filter((it) => it.staffId === policy.staffId);
  const cardFeeRate = policy.cardFeeDeductionRate ?? 0;

  let totalGrossSales = 0;
  let totalCommission = 0;
  let totalCardFeeDeduction = 0;
  let totalMaterialDeduction = 0;

  for (const item of staffItems) {
    totalGrossSales += item.grossSales;
    const itemCalc = calculateItemCommission(item, policy.defaultCommissionRate, cardFeeRate);
    totalCommission += itemCalc.commission;
    totalCardFeeDeduction += itemCalc.cardFeeDeduction;
    totalMaterialDeduction += itemCalc.materialDeduction;
  }

  const fixedDeductions = policy.fixedDeductions ?? 0;
  const preTaxEarnings = Math.max(
    0,
    policy.baseSalary +
      totalCommission -
      totalCardFeeDeduction -
      totalMaterialDeduction -
      fixedDeductions
  );

  // 3.3% 원천징수 (소득세 3% 원단위 절사 + 소득세의 10%인 주민세 0.3% 원단위 절사)
  const isFreelancerTax = policy.withholdingTaxRate !== undefined ? policy.withholdingTaxRate : 0.033;
  let incomeTax = 0;
  let localIncomeTax = 0;

  if (isFreelancerTax > 0) {
    incomeTax = Math.floor(preTaxEarnings * 0.03);
    localIncomeTax = Math.floor(incomeTax * 0.1);
  }

  const totalWithholdingTax = incomeTax + localIncomeTax;
  const netPayout = preTaxEarnings - totalWithholdingTax;

  const effectiveCommissionRate =
    totalGrossSales > 0 ? Math.round((netPayout / totalGrossSales) * 1000) / 10 : 0;

  return {
    staffId: policy.staffId,
    staffName: policy.staffName,
    role: policy.role,
    performanceCount: staffItems.length,
    totalGrossSales,
    baseSalary: policy.baseSalary,
    totalCommission,
    totalCardFeeDeduction,
    totalMaterialDeduction,
    totalFixedDeductions: fixedDeductions,
    preTaxEarnings,
    incomeTax,
    localIncomeTax,
    totalWithholdingTax,
    netPayout,
    effectiveCommissionRate,
  };
}

/**
 * 3. 사업장 전체 전문가 정산 일괄 집계 (순수 함수)
 */
export function summarizePayrollBatch(
  policies: readonly StaffPayrollPolicy[],
  items: readonly ServicePerformanceItem[]
): PayrollBatchSummary {
  const statements = policies.map((policy) => calculateStaffPayroll(policy, items));

  let totalGrossSales = 0;
  let totalPreTaxEarnings = 0;
  let totalWithholdingTax = 0;
  let totalNetPayout = 0;

  for (const st of statements) {
    totalGrossSales += st.totalGrossSales;
    totalPreTaxEarnings += st.preTaxEarnings;
    totalWithholdingTax += st.totalWithholdingTax;
    totalNetPayout += st.netPayout;
  }

  return {
    totalStaffCount: statements.length,
    totalGrossSales,
    totalPreTaxEarnings,
    totalWithholdingTax,
    totalNetPayout,
    statements,
  };
}

/**
 * 4. 금액 원화 포맷 헬퍼 (순수 함수)
 */
export function formatKoreanWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * ============================================================================
 * [문화센터/평생교육원] 강좌별 수강료 매출 배분비율(RS %) 및 원천징수 정산
 * ============================================================================
 */

export interface CourseRevenueShareItem {
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  totalEnrolled: number;
  tuitionFeePerPerson: number;
  totalGrossSales: number;
  instructorShareRate: number; // e.g. 0.50
  totalMaterialCostDeduction: number;
  totalCardFeeDeduction: number;
  netRevenueToShare: number;
  instructorGrossPay: number;
  centerGrossShare: number;
  incomeTax: number;
  localIncomeTax: number;
  totalWithholdingTax: number;
  instructorNetPayout: number;
}

export function calculateCourseRevenueShare(input: {
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  totalEnrolled: number;
  tuitionFeePerPerson: number;
  instructorShareRate: number; // e.g. 0.50 (50%)
  materialCostPerPerson?: number;
  cardFeeRate?: number; // e.g. 0.03 (3%)
  withholdingTax?: boolean; // default true (3.3%)
}): CourseRevenueShareItem {
  const totalGrossSales = input.totalEnrolled * input.tuitionFeePerPerson;
  const totalMaterialCostDeduction = input.totalEnrolled * (input.materialCostPerPerson || 0);

  // 카드 수수료 공제: 매출액의 3% (설정된 경우)
  const cardFeeRate = input.cardFeeRate !== undefined ? input.cardFeeRate : 0.03;
  const totalCardFeeDeduction = Math.round(totalGrossSales * cardFeeRate);

  // 배분 대상 순매출 = 총매출 - 재료비 - 카드수수료
  const netRevenueToShare = Math.max(
    0,
    totalGrossSales - totalMaterialCostDeduction - totalCardFeeDeduction
  );

  // 강사 배분액 (세전)
  const instructorGrossPay = Math.round(netRevenueToShare * input.instructorShareRate);
  // 센터 귀속분
  const centerGrossShare = Math.max(0, netRevenueToShare - instructorGrossPay);

  // 3.3% 사업소득 원천징수
  const applyTax = input.withholdingTax !== false;
  const incomeTax = applyTax ? Math.round(instructorGrossPay * 0.03) : 0;
  const localIncomeTax = applyTax ? Math.round(instructorGrossPay * 0.003) : 0;
  const totalWithholdingTax = incomeTax + localIncomeTax;

  // 강사 실수령액
  const instructorNetPayout = Math.max(0, instructorGrossPay - totalWithholdingTax);

  return {
    courseId: input.courseId,
    courseName: input.courseName,
    instructorId: input.instructorId,
    instructorName: input.instructorName,
    totalEnrolled: input.totalEnrolled,
    tuitionFeePerPerson: input.tuitionFeePerPerson,
    totalGrossSales,
    instructorShareRate: input.instructorShareRate,
    totalMaterialCostDeduction,
    totalCardFeeDeduction,
    netRevenueToShare,
    instructorGrossPay,
    centerGrossShare,
    incomeTax,
    localIncomeTax,
    totalWithholdingTax,
    instructorNetPayout,
  };
}

