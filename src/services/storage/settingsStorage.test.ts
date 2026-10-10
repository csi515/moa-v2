/**
 * Settings Storage & Multi-vertical Partitioned Merge Regression Tests
 * 실행: npx tsx src/services/storage/settingsStorage.test.ts
 */

import assert from 'node:assert/strict';
import { mergeOrganizationSettings } from './settingsStorage';
import type { AcademySettings } from '../../types';

function run(): void {
  console.log('[TEST] settingsStorage: mergeOrganizationSettings & Partition Preservation');

  const baseSettings: AcademySettings = {
    name: '모아 통합 사업장',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    directorName: '김대표',
    defaultTuitionFee: 180000,
    defaultPaymentDay: 25,
    defaultLessonMinutes: 50,
    consultationSlotMinutes: 30,
    features: {
      attendance: {
        enabled: true,
      },
      points: {
        enabled: true,
        earnEnabled: true,
        earnRatePercent: 3,
      },
    },
    industrySettings: {
      education: {
        defaultTuitionFee: 180000,
        defaultPaymentDay: 25,
        attendanceAlertEnabled: true,
      },
      booking: {
        depositEnabled: false,
        depositAmount: 0,
      },
      retail: {
        catalog: [{ id: 'p1', name: '상품 A', price: 10000, stock: 5 }],
      },
    },
    bankAccount: {
      bank: '국민은행',
      accountNumber: '111-222-333333',
      holder: '김대표',
    },
  };

  // 1. features 부분 업데이트 시 다른 기능 플래그(attendance) 보존 검증
  const updatedFeatures = mergeOrganizationSettings(baseSettings, {
    features: {
      points: {
        earnRatePercent: 5,
      },
    },
  });
  assert.equal(updatedFeatures.features?.attendance?.enabled, true, 'attendance 플래그가 보존되어야 함');
  assert.equal(updatedFeatures.features?.points?.enabled, true, 'points.enabled가 보존되어야 함');
  assert.equal(updatedFeatures.features?.points?.earnRatePercent, 5, 'points.earnRatePercent가 갱신되어야 함');

  // 2. industrySettings 부분 업데이트 시 타 업종 파티션(education, retail) 보존 검증
  const updatedBooking = mergeOrganizationSettings(baseSettings, {
    industrySettings: {
      booking: {
        depositEnabled: true,
        depositAmount: 20000,
      },
    },
  });
  assert.equal(updatedBooking.industrySettings?.education?.defaultTuitionFee, 180000, 'education 파티션 보존');
  assert.equal(updatedBooking.industrySettings?.education?.attendanceAlertEnabled, true, 'education 파티션 필드 보존');
  assert.equal(updatedBooking.industrySettings?.retail?.catalog?.length, 1, 'retail 카탈로그 보존');
  assert.equal(updatedBooking.industrySettings?.booking?.depositEnabled, true, 'booking depositEnabled 갱신');
  assert.equal(updatedBooking.industrySettings?.booking?.depositAmount, 20000, 'booking depositAmount 갱신');
  // 레거시 단일 필드와 상호 동기화 검증
  assert.equal(updatedBooking.depositEnabled, true, 'depositEnabled 레거시 단일 필드 동기화');

  // 3. bankAccount 부분 갱신 시 기존 은행명 및 예금주 보존 검증
  const updatedBank = mergeOrganizationSettings(baseSettings, {
    bankAccount: {
      bank: '국민은행',
      accountNumber: '999-888-777777',
      holder: '김대표',
    },
  });
  assert.deepEqual(
    updatedBank.bankAccount,
    {
      bank: '국민은행',
      accountNumber: '999-888-777777',
      holder: '김대표',
    },
    '계좌번호 갱신 시 은행 및 예금주 정상 유지'
  );

  // 4. 레거시 defaultTuitionFee 갱신 시 education 파티션 동기화 검증
  const updatedFee = mergeOrganizationSettings(baseSettings, {
    defaultTuitionFee: 220000,
  });
  assert.equal(updatedFee.defaultTuitionFee, 220000);
  assert.equal(updatedFee.industrySettings?.education?.defaultTuitionFee, 220000, 'education 파티션에 fee 동기화');

  console.log('[PASS] settingsStorage: mergeOrganizationSettings & Multi-vertical Partition Tests Passed!');
}

run();
