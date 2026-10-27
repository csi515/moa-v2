/**
 * Passes & Retention Capability Event Listeners Integration Test
 */

import assert from 'node:assert/strict';
import {
  DomainEventBus,
  DOMAIN_EVENT_NAMES,
  type AttendanceCheckedInPayload,
  type PassDeductedPayload,
  type PassLowBalancePayload,
  type PassExhaustedPayload,
  type RetentionTriggerCampaignPayload,
} from '@/core/events';
import type { PassDefinition } from '../domain/passesEngine';
import { registerPassAttendanceListener } from './passAttendanceListener';
import { registerRetentionPassListeners } from '../../retention_marketing/listeners/retentionPassEventListener';

async function runListenerTests(): Promise<void> {
  console.log('🧪 [Test Suite] Capability Event Listeners Integration Test\n');

  // Test 1: 출석 -> 패스 1회 차감 & low_balance 발행 & 리텐션 캠페인 자동 연쇄
  {
    console.log('  ▶ Test 1: 출석 -> 패스 차감(2->1) -> low_balance -> 리텐션 캠페인');
    const bus = new DomainEventBus();

    // 목 패스 데이터 (초기 잔여: 2회)
    let currentPass: PassDefinition = {
      id: 'pass-test-1',
      customerId: 'student-kim',
      passType: 'COUNT_BASED',
      status: 'ACTIVE',
      totalCount: 10,
      remainingCount: 2,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    // 1. Passes 리스너 등록
    const unsubPass = registerPassAttendanceListener(
      {
        findActivePassByStudent: async (studentId) => {
          if (studentId === currentPass.customerId) return currentPass;
          return null;
        },
        savePass: async (updated) => {
          currentPass = updated;
        },
        lowBalanceThreshold: 1,
      },
      bus
    );

    // 2. Retention Marketing 리스너 등록
    const campaigns: RetentionTriggerCampaignPayload[] = [];
    const unsubRetention = registerRetentionPassListeners(
      {
        onTriggerCampaign: async (payload) => {
          campaigns.push(payload);
        },
      },
      bus
    );

    // 3. 출석 체크인 이벤트 발행
    await bus.publish<AttendanceCheckedInPayload>(
      DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
      {
        attendanceId: 'att-1',
        studentId: 'student-kim',
        studentName: '김수강',
        checkInTime: '2026-10-18T10:00:00Z',
      },
      { tenantId: 'tenant-academy' }
    );

    // 검증:
    // - 수강권이 2회 -> 1회로 줄어듦
    assert.equal(currentPass.remainingCount, 1);
    assert.equal(currentPass.status, 'ACTIVE');

    // - 리텐션 캠페인이 1건 생성됨
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].customerId, 'student-kim');
    assert.equal(campaigns[0].campaignType, 'low_balance');
    assert.equal(campaigns[0].context.remainingCount, 1);

    // - 이벤트 히스토리 검증
    const history = bus.getRecentEvents(10).map((e) => e.eventType);
    assert.deepEqual(history, [
      'attendance.checked_in',
      'passes.deducted',
      'passes.low_balance',
      'retention.trigger_campaign',
    ]);

    unsubPass();
    unsubRetention();
    console.log('    ✓ 통과: 패스 차감 및 low_balance 리텐션 캠페인 연쇄 성공');
  }

  // Test 2: 출석 -> 마지막 1회 차감 -> pass_exhausted -> 즉시 재등록 리텐션 캠페인
  {
    console.log('  ▶ Test 2: 출석 -> 마지막 1회 소진 -> pass_exhausted -> 즉시 재등록 캠페인');
    const bus = new DomainEventBus();

    let currentPass: PassDefinition = {
      id: 'pass-test-2',
      customerId: 'student-lee',
      passType: 'COUNT_BASED',
      status: 'ACTIVE',
      totalCount: 10,
      remainingCount: 1,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    registerPassAttendanceListener(
      {
        findActivePassByStudent: async (studentId) => {
          if (studentId === currentPass.customerId) return currentPass;
          return null;
        },
        savePass: async (updated) => {
          currentPass = updated;
        },
      },
      bus
    );

    const campaigns: RetentionTriggerCampaignPayload[] = [];
    registerRetentionPassListeners(
      {
        onTriggerCampaign: async (payload) => {
          campaigns.push(payload);
        },
      },
      bus
    );

    // 마지막 1회 출석
    await bus.publish<AttendanceCheckedInPayload>(
      DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
      {
        attendanceId: 'att-2',
        studentId: 'student-lee',
        studentName: '이수강',
        checkInTime: '2026-10-18T11:00:00Z',
      },
      { tenantId: 'tenant-academy' }
    );

    assert.equal(currentPass.remainingCount, 0);
    assert.equal(currentPass.status, 'EXHAUSTED');

    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].campaignType, 'pass_exhausted');
    assert.equal(campaigns[0].context.remainingCount, 0);

    const history = bus.getRecentEvents(10).map((e) => e.eventType);
    assert.deepEqual(history, [
      'attendance.checked_in',
      'passes.deducted',
      'passes.exhausted',
      'retention.trigger_campaign',
    ]);

    console.log('    ✓ 통과: 소진 처리 및 pass_exhausted 리텐션 캠페인 연쇄 성공');
  }

  console.log('\n✨ All Capability Listener tests passed cleanly!\n');
}

runListenerTests().catch((err) => {
  console.error('❌ Capability Listener test failed:', err);
  process.exit(1);
});
