import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFamilyDiscountRate,
  detectAndMergeFamilyGroups,
  buildFamilyGroupDetail,
  calculateFamilyBundlePayment,
  findStudentFamilyInfo,
  type PianoStudentSummary,
  type PianoInvoiceSummary,
  type FamilyGroup,
} from './pianoFamilyDomain';

describe('pianoFamilyDomain', () => {
  const mockStudents: PianoStudentSummary[] = [
    {
      id: 's-1',
      name: '김민준',
      grade: '초3',
      parentName: '김철수',
      parentPhone: '010-1111-2222',
      tuitionFee: 220000,
      status: 'active',
    },
    {
      id: 's-2',
      name: '김서아',
      grade: '유치부',
      parentName: '김철수',
      parentPhone: '010-1111-2222', // 동일 연락처
      tuitionFee: 160000,
      status: 'active',
    },
    {
      id: 's-3',
      name: '이도현',
      grade: '초5',
      parentName: '이영희',
      parentPhone: '010-3333-4444',
      tuitionFee: 200000,
      status: 'active',
    },
  ];

  it('형제 수에 따른 할인율을 올바르게 계산해야 한다', () => {
    assert.equal(calculateFamilyDiscountRate(1), 0);
    assert.equal(calculateFamilyDiscountRate(2), 10);
    assert.equal(calculateFamilyDiscountRate(3), 15);
    assert.equal(calculateFamilyDiscountRate(4), 15);
  });

  it('동일 학부모 연락처를 가진 학생들을 가족 그룹으로 자동 감지해야 한다', () => {
    const groups = detectAndMergeFamilyGroups(mockStudents);
    assert.equal(groups.length, 1);
    const kimFamily = groups[0];
    assert.equal(kimFamily.representativePhone, '010-1111-2222');
    assert.equal(kimFamily.representativeName, '김철수');
    assert.equal(kimFamily.studentIds.length, 2);
    assert.deepEqual(kimFamily.studentIds, ['s-1', 's-2']);
    assert.equal(kimFamily.isAutoDetected, true);
  });

  it('수동 등록된 커스텀 그룹이 있는 경우 중복 생성하지 않고 병합해야 한다', () => {
    const customGroup: FamilyGroup = {
      groupId: 'custom-fam-1',
      familyName: '이도현 & 사촌 가족',
      representativeName: '이영희',
      representativePhone: '010-3333-4444',
      studentIds: ['s-3'],
      sharedCreditBalance: 50000,
      createdAt: '2026-11-01',
    };

    const groups = detectAndMergeFamilyGroups(mockStudents, [customGroup]);
    assert.equal(groups.length, 2); // custom 1 + auto 1
    assert.ok(groups.some(g => g.groupId === 'custom-fam-1'));
  });

  it('패밀리 상세 정보 및 할인액을 정확히 집계해야 한다', () => {
    const groups = detectAndMergeFamilyGroups(mockStudents);
    const kimFamily = groups[0];

    const mockInvoices: PianoInvoiceSummary[] = [
      {
        id: 'inv-1',
        studentId: 's-1',
        yearMonth: '2026-11',
        title: '11월 피아노 수강료',
        totalAmount: 220000,
        paidAmount: 0,
        unpaidAmount: 220000,
        status: 'unpaid',
      },
      {
        id: 'inv-2',
        studentId: 's-2',
        yearMonth: '2026-11',
        title: '11월 피아노 수강료',
        totalAmount: 160000,
        paidAmount: 0,
        unpaidAmount: 160000,
        status: 'unpaid',
      },
    ];

    const detail = buildFamilyGroupDetail(kimFamily, mockStudents, mockInvoices, {
      [kimFamily.groupId]: 50000,
    });

    assert.equal(detail.totalTuition, 380000);
    assert.equal(detail.discountRatePercent, 10); // 2명 = 10%
    assert.equal(detail.discountAmount, 38000); // 380,000 * 10%
    assert.equal(detail.netPayableAmount, 342000); // 380,000 - 38,000
    assert.equal(detail.totalUnpaidAmount, 380000);
    assert.equal(detail.unpaidInvoiceCount, 2);
    assert.equal(detail.group.sharedCreditBalance, 50000);
  });

  it('가족 묶음 결제 시 크레딧 상계 및 실납부액이 올바르게 계산되어야 한다', () => {
    const calc = calculateFamilyBundlePayment(380000, 10, 50000, true);
    assert.equal(calc.totalOriginalAmount, 380000);
    assert.equal(calc.discountAmount, 38000);
    assert.equal(calc.netPayableAmount, 342000);
    assert.equal(calc.appliedSharedCredit, 50000);
    assert.equal(calc.finalOutOfPocketAmount, 292000); // 342,000 - 50,000
    assert.equal(calc.remainingSharedCredit, 0);
  });

  it('특정 학생의 형제자매 정보를 올바르게 탐색해야 한다', () => {
    const groups = detectAndMergeFamilyGroups(mockStudents);
    const s1Info = findStudentFamilyInfo('s-1', groups, mockStudents);
    assert.equal(s1Info.isSiblingEnrolled, true);
    assert.equal(s1Info.siblingCount, 1);
    assert.equal(s1Info.siblings[0].name, '김서아');

    const s3Info = findStudentFamilyInfo('s-3', groups, mockStudents);
    assert.equal(s3Info.isSiblingEnrolled, false);
    assert.equal(s3Info.siblingCount, 0);
  });
});
