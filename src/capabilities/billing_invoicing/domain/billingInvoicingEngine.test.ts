import assert from 'node:assert/strict';
import {
  calculateBillingDueTargets,
  transitionInvoiceStatus,
  filterMonthlyFees,
  summarizeOpenFees,
  generateInvoiceShareText,
  generateHometaxTaxInvoiceCsv,
  calculateAccountsReceivableAging,
  type BillingMember,
  type InvoiceRecord,
  type TaxInvoice,
  type UnpaidRecord,
} from './billingInvoicingEngine';

function run() {
  const members: BillingMember[] = [
    {
      id: 'm-1',
      name: '홍길동',
      billingDay: 25,
      monthlyAmount: 200000,
      isActive: true,
      enrollmentStartDate: '2026-01-01',
    },
    {
      id: 'm-2',
      name: '이순신',
      billingDay: 25,
      monthlyAmount: 250000,
      isActive: true,
      enrollmentStartDate: '2026-03-01',
    },
    {
      id: 'm-3',
      name: '강감찬',
      billingDay: 10, // 다른 청구일
      monthlyAmount: 180000,
      isActive: true,
      enrollmentStartDate: '2026-02-01',
    },
    {
      id: 'm-4',
      name: '휴면회원',
      billingDay: 25,
      monthlyAmount: 200000,
      isActive: false, // 비활성
      enrollmentStartDate: '2026-01-01',
    },
  ];

  // 1. 매월 25일 정기 청구 대상자 산출 (홍길동, 이순신 2명 / 총 450,000원)
  const targets = calculateBillingDueTargets(members, '2026-06', 25);
  assert.equal(targets.dueMembers.length, 2);
  assert.equal(targets.totalExpectedAmount, 450000);
  assert.deepEqual(
    targets.dueMembers.map((m) => m.name),
    ['홍길동', '이순신']
  );

  // 2. 청구서 납부 상태 머신 전이 (PENDING -> PAID)
  const invoice: InvoiceRecord = {
    id: 'inv-1',
    memberId: 'm-1',
    memberName: '홍길동',
    amount: 200000,
    billingYearMonth: '2026-06',
    dueDate: '2026-06-30',
    status: 'PENDING',
  };

  const paid = transitionInvoiceStatus(invoice, 'PAY', {
    paidAt: '2026-06-25T14:00:00Z',
  });
  assert.equal(paid.success, true);
  assert.equal(paid.updatedInvoice.status, 'PAID');
  assert.equal(paid.updatedInvoice.paidAt, '2026-06-25T14:00:00Z');

  // 3. 연체 및 면제 전이
  const overdue = transitionInvoiceStatus(invoice, 'MARK_OVERDUE');
  assert.equal(overdue.success, true);
  assert.equal(overdue.updatedInvoice.status, 'OVERDUE');

  const waived = transitionInvoiceStatus(overdue.updatedInvoice, 'WAIVE', {
    waiveReason: '장학 혜택 100% 감면',
  });
  assert.equal(waived.success, true);
  assert.equal(waived.updatedInvoice.status, 'WAIVED');
  assert.equal(waived.updatedInvoice.waiveReason, '장학 혜택 100% 감면');

  // 4. Web Share 청구서 텍스트 생성 검증 (0원 비용 원칙)
  const share = generateInvoiceShareText({
    orgName: '모아피아노학원',
    memberName: '홍길동',
    billingYearMonth: '2026년 6월',
    amount: 200000,
    dueDate: '2026-06-30',
    bankName: '토스뱅크',
    accountNumber: '1000-1234-5678',
    accountHolder: '모아원장',
  });

  assert.match(share.title, /모아피아노학원/);
  assert.match(share.text, /홍길동/);
  assert.match(share.text, /200,000원/);
  assert.match(share.text, /2026-06-30/);
  assert.match(share.text, /1000-1234-5678/);

  // 5. 국세청 홈택스 전자세금계산서 일괄작성 CSV 생성 검증
  const sampleInvoices: TaxInvoice[] = [
    {
      invoiceType: '01',
      writeDate: '2026-10-25',
      supplier: {
        businessNumber: '123-45-67890',
        companyName: '(주)모아엔터프라이즈',
        representativeName: '김대표',
        address: '경기도 성남시 분당구 판교역로 100',
        businessType: '서비스',
        businessItem: '소프트웨어 개발 및 교육',
        email: 'billing@moa-saas.com',
      },
      buyer: {
        buyerType: 'BUSINESS',
        registrationNumber: '987-65-43210',
        companyName: '알파제조(주)',
        representativeName: '박공장',
        address: '경기도 화성시 동탄산단로 50',
        businessType: '제조업',
        businessItem: '정밀기계부품',
        email1: 'tax@alpha-mfg.com',
      },
      items: [
        {
          day: '25',
          itemName: '맞춤형 정밀 가공 부품 A세트',
          specification: 'SUS304',
          quantity: 10,
          unitPrice: 500000,
          supplyAmount: 5000000,
          taxAmount: 500000,
          remark: '1차 납품분',
        },
      ],
      claimType: 'CLAIM',
      remark: '납기일 준수 납품 완료 건',
    },
  ];

  const csvOutput = generateHometaxTaxInvoiceCsv(sampleInvoices);
  // UTF-8 BOM 포함 여부
  assert.equal(csvOutput.charCodeAt(0), 0xfeff);
  // 헤더 컬럼 검증
  assert.match(csvOutput, /"전자세금계산서 종류"/);
  assert.match(csvOutput, /"공급자 등록번호"/);
  assert.match(csvOutput, /"공급받는자 등록번호"/);
  assert.match(csvOutput, /"영수\/청구 구분"/);
  // 데이터 행 매핑 검증
  assert.match(csvOutput, /"1234567890"/); // 하이픈 제거된 공급자 사업자번호
  assert.match(csvOutput, /"9876543210"/); // 하이픈 제거된 공급받는자 사업자번호
  assert.match(csvOutput, /"\(주\)모아엔터프라이즈"/);
  assert.match(csvOutput, /"알파제조\(주\)"/);
  assert.match(csvOutput, /"5000000"/); // 공급가액
  assert.match(csvOutput, /"500000"/); // 세액
  assert.match(csvOutput, /"02"/); // 청구 구분

  // 6. 거래처/회원별 미수금 에이징(Aging) 리포트 검증
  const referenceDate = '2026-10-25';
  const unpaidRecords: UnpaidRecord[] = [
    // A사: 15일 연체 (30일 이내: NORMAL)
    {
      id: 'unpaid-1',
      memberOrCompanyId: 'comp-a',
      memberOrCompanyName: 'A파트너스',
      dueDate: '2026-10-10',
      amount: 1000000,
      contactPhone: '010-1111-2222',
    },
    // B사: 45일 연체 (31~60일: WATCH)
    {
      id: 'unpaid-2',
      memberOrCompanyId: 'comp-b',
      memberOrCompanyName: 'B솔루션',
      dueDate: '2026-09-10',
      amount: 2500000,
    },
    // C사: 75일 연체 (61~90일: WARNING)
    {
      id: 'unpaid-3',
      memberOrCompanyId: 'comp-c',
      memberOrCompanyName: 'C글로벌',
      dueDate: '2026-08-11',
      amount: 4000000,
    },
    // D사: 115일 연체 (90일 초과: CRITICAL)
    {
      id: 'unpaid-4',
      memberOrCompanyId: 'comp-d',
      memberOrCompanyName: 'D상사',
      dueDate: '2026-07-02',
      amount: 8000000,
    },
    // D사 추가 건: 20일 연체 (복수 청구서)
    {
      id: 'unpaid-5',
      memberOrCompanyId: 'comp-d',
      memberOrCompanyName: 'D상사',
      dueDate: '2026-10-05',
      amount: 2000000,
    },
  ];

  const agingSummary = calculateAccountsReceivableAging(unpaidRecords, referenceDate);

  // 총 미수금 검증 (100만 + 250만 + 400만 + 800만 + 200만 = 1,750만)
  assert.equal(agingSummary.totalUnpaidAmount, 17500000);
  assert.equal(agingSummary.totalUnpaidCount, 5);

  // 버킷별 금액 검증
  assert.equal(agingSummary.bucketTotals.current, 3000000); // 100만 + 200만
  assert.equal(agingSummary.bucketTotals.days31To60, 2500000); // 250만
  assert.equal(agingSummary.bucketTotals.days61To90, 4000000); // 400만
  assert.equal(agingSummary.bucketTotals.over90, 8000000); // 800만

  // 고위험(61일 이상) 총액
  assert.equal(agingSummary.highRiskTotal, 12000000); // 400만 + 800만

  // 리스크 순서 정렬 검증 (CRITICAL(D상사) -> WARNING(C글로벌) -> WATCH(B솔루션) -> NORMAL(A파트너스))
  assert.equal(agingSummary.memberAgingList[0].memberOrCompanyName, 'D상사');
  assert.equal(agingSummary.memberAgingList[0].riskLevel, 'CRITICAL');
  assert.equal(agingSummary.memberAgingList[0].totalUnpaidAmount, 10000000);
  assert.equal(agingSummary.memberAgingList[0].unpaidCount, 2);

  assert.equal(agingSummary.memberAgingList[1].memberOrCompanyName, 'C글로벌');
  assert.equal(agingSummary.memberAgingList[1].riskLevel, 'WARNING');

  assert.equal(agingSummary.memberAgingList[2].memberOrCompanyName, 'B솔루션');
  assert.equal(agingSummary.memberAgingList[2].riskLevel, 'WATCH');

  assert.equal(agingSummary.memberAgingList[3].memberOrCompanyName, 'A파트너스');
  assert.equal(agingSummary.memberAgingList[3].riskLevel, 'NORMAL');

  const fees = [
    { status: 'PENDING', memberId: 'a', amount: 1000 },
    { status: 'UNPAID', memberId: 'a', amount: 500 },
    { status: 'OVERDUE', memberId: 'b', amount: 2000 },
    { status: 'PAID', memberId: 'c', amount: 9000 },
  ];
  assert.equal(filterMonthlyFees(fees, 'open').length, 3);
  assert.equal(filterMonthlyFees(fees, 'paid').length, 1);
  assert.deepEqual(summarizeOpenFees(fees), { people: 2, amount: 3500 });

  console.log('billingInvoicingEngine.test.ts: ok');
}

run();
