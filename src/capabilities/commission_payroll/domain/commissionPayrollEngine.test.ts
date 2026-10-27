import {
  StaffPayrollPolicy,
  ServicePerformanceItem,
  calculateItemCommission,
  calculateStaffPayroll,
  summarizePayrollBatch,
  formatKoreanWon,
  calculateCourseRevenueShare,
} from './commissionPayrollEngine';

function runTests() {
  console.log('--- Testing commissionPayrollEngine ---');

  // Test 1: 건별 커미션 및 카드 수수료 공제
  const itemCard: ServicePerformanceItem = {
    id: 'perf-1',
    staffId: 'staff-1',
    serviceDate: '2026-10-14',
    serviceName: '시그니처 볼륨 매직 펌',
    customerName: '홍길동',
    grossSales: 200000,
    paymentMethod: 'card',
    materialCost: 10000,
  };

  const itemCalc = calculateItemCommission(itemCard, 0.5, 0.03);
  if (itemCalc.commission !== 100000) {
    throw new Error(`Expected commission 100,000, got ${itemCalc.commission}`);
  }
  if (itemCalc.cardFeeDeduction !== 6000) {
    throw new Error(`Expected card fee 6,000, got ${itemCalc.cardFeeDeduction}`);
  }
  if (itemCalc.materialDeduction !== 10000) {
    throw new Error(`Expected material deduction 10,000, got ${itemCalc.materialDeduction}`);
  }
  if (itemCalc.netItemEarnings !== 84000) {
    throw new Error(`Expected net item earnings 84,000, got ${itemCalc.netItemEarnings}`);
  }
  console.log('✅ Test 1 passed: Item commission and fee deductions');

  // Test 2: 개별 전문가 월간 정산 명세서 (기본급 0, 프리랜서 3.3% 원천징수)
  const hairStylistPolicy: StaffPayrollPolicy = {
    staffId: 'stylist-mina',
    staffName: '미나 실장',
    role: '수석 헤어 디자이너',
    baseSalary: 0,
    defaultCommissionRate: 0.5, // 50%
    cardFeeDeductionRate: 0.03, // 3%
    withholdingTaxRate: 0.033, // 3.3%
    fixedDeductions: 50000, // 살롱 가운/기물 사용료
  };

  const stylistItems: ServicePerformanceItem[] = [
    {
      id: 'p1',
      staffId: 'stylist-mina',
      serviceDate: '2026-10-01',
      serviceName: '디자인 컷',
      customerName: '김고객',
      grossSales: 50000,
      paymentMethod: 'cash',
    },
    {
      id: 'p2',
      staffId: 'stylist-mina',
      serviceDate: '2026-10-02',
      serviceName: '열펌 & 영양 케어',
      customerName: '이고객',
      grossSales: 250000,
      paymentMethod: 'card',
      materialCost: 20000,
    },
    {
      id: 'p3',
      staffId: 'stylist-mina',
      serviceDate: '2026-10-03',
      serviceName: 'VIP 프리미엄 헤드스파',
      customerName: '박고객',
      grossSales: 100000,
      paymentMethod: 'card',
      customRate: 0.6, // VIP 세션 60% 요율 우대
    },
  ];

  const statement = calculateStaffPayroll(hairStylistPolicy, stylistItems);

  // 총매출: 50000 + 250000 + 100000 = 400,000
  if (statement.totalGrossSales !== 400000) {
    throw new Error(`Expected total gross 400,000, got ${statement.totalGrossSales}`);
  }

  // 커미션:
  // p1: 50000 * 0.5 = 25000
  // p2: 250000 * 0.5 = 125000
  // p3: 100000 * 0.6 = 60000
  // 합계 = 210,000
  if (statement.totalCommission !== 210000) {
    throw new Error(`Expected total commission 210,000, got ${statement.totalCommission}`);
  }

  // 카드 수수료: p2(250000*0.03=7500) + p3(100000*0.03=3000) = 10,500
  if (statement.totalCardFeeDeduction !== 10500) {
    throw new Error(`Expected card fee 10,500, got ${statement.totalCardFeeDeduction}`);
  }

  // 재료비: p2(20000)
  if (statement.totalMaterialDeduction !== 20000) {
    throw new Error(`Expected material deduction 20,000, got ${statement.totalMaterialDeduction}`);
  }

  // 세전 수익: base(0) + comm(210000) - cardFee(10500) - mat(20000) - fixed(50000) = 129,500
  if (statement.preTaxEarnings !== 129500) {
    throw new Error(`Expected preTax 129,500, got ${statement.preTaxEarnings}`);
  }

  // 소득세: floor(129500 * 0.03) = 3885
  // 주민세: floor(3885 * 0.1) = 388
  // 원천징수 합계 = 3885 + 388 = 4273
  if (statement.incomeTax !== 3885) {
    throw new Error(`Expected incomeTax 3,885, got ${statement.incomeTax}`);
  }
  if (statement.localIncomeTax !== 388) {
    throw new Error(`Expected localIncomeTax 388, got ${statement.localIncomeTax}`);
  }
  if (statement.totalWithholdingTax !== 4273) {
    throw new Error(`Expected totalWithholdingTax 4,273, got ${statement.totalWithholdingTax}`);
  }

  // 실수령액: 129500 - 4273 = 125,227
  if (statement.netPayout !== 125227) {
    throw new Error(`Expected netPayout 125,227, got ${statement.netPayout}`);
  }

  console.log('✅ Test 2 passed: Staff payroll statement with 3.3% tax');

  // Test 3: 다중 전문가 일괄 정산 집계
  const trainerPolicy: StaffPayrollPolicy = {
    staffId: 'trainer-james',
    staffName: '제임스 트레이너',
    role: '시니어 PT 코치',
    baseSalary: 1000000, // 기본급 100만원
    defaultCommissionRate: 0.4, // PT 매출의 40%
  };

  const trainerItems: ServicePerformanceItem[] = [
    {
      id: 'pt1',
      staffId: 'trainer-james',
      serviceDate: '2026-10-05',
      serviceName: 'PT 10회 패키지',
      customerName: '최회원',
      grossSales: 800000,
      paymentMethod: 'card',
    },
  ];

  const batchSummary = summarizePayrollBatch(
    [hairStylistPolicy, trainerPolicy],
    [...stylistItems, ...trainerItems]
  );

  if (batchSummary.totalStaffCount !== 2) {
    throw new Error(`Expected 2 staff, got ${batchSummary.totalStaffCount}`);
  }
  if (batchSummary.totalGrossSales !== 1200000) {
    throw new Error(`Expected 1,200,000 total sales, got ${batchSummary.totalGrossSales}`);
  }
  console.log('✅ Test 3 passed: Multi-staff batch summary');

  // Test 4: 통화 포맷
  const formatted = formatKoreanWon(1250000);
  if (!formatted.includes('1,250,000원')) {
    throw new Error(`Expected 1,250,000원, got ${formatted}`);
  }
  // Test 5: 문화센터 수강료 매출 배분(RS %) 및 원천징수 정산
  const courseShare = calculateCourseRevenueShare({
    courseId: 'crs-101',
    courseName: '정통 이탈리안 파스타 마스터 클래스',
    instructorId: 'inst-01',
    instructorName: '김민지',
    totalEnrolled: 12,
    tuitionFeePerPerson: 180000,
    instructorShareRate: 0.50,
    materialCostPerPerson: 30000,
    cardFeeRate: 0.03,
    withholdingTax: true,
  });

  if (courseShare.totalGrossSales !== 2160000) {
    throw new Error(`Expected total gross 2,160,000, got ${courseShare.totalGrossSales}`);
  }
  if (courseShare.totalMaterialCostDeduction !== 360000) {
    throw new Error(`Expected material deduction 360,000, got ${courseShare.totalMaterialCostDeduction}`);
  }
  if (courseShare.totalCardFeeDeduction !== 64800) {
    throw new Error(`Expected card fee 64,800, got ${courseShare.totalCardFeeDeduction}`);
  }
  if (courseShare.netRevenueToShare !== 1735200) {
    throw new Error(`Expected net revenue 1,735,200, got ${courseShare.netRevenueToShare}`);
  }
  if (courseShare.instructorGrossPay !== 867600) {
    throw new Error(`Expected instructor gross 867,600, got ${courseShare.instructorGrossPay}`);
  }
  if (courseShare.incomeTax !== 26028) {
    throw new Error(`Expected income tax 26,028, got ${courseShare.incomeTax}`);
  }
  if (courseShare.localIncomeTax !== 2603) {
    throw new Error(`Expected local income tax 2,603, got ${courseShare.localIncomeTax}`);
  }
  if (courseShare.instructorNetPayout !== 838969) {
    throw new Error(`Expected instructor net payout 838,969, got ${courseShare.instructorNetPayout}`);
  }
  console.log('✅ Test 5 passed: Course revenue share calculation with 3.3% tax');

  console.log('🎉 All commissionPayrollEngine tests passed!');
}

runTests();
