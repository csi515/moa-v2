import assert from 'node:assert/strict';
import {
  normalizeCustomerTimeline,
  evaluateReEnrollmentDDay,
  type ConsultationRecord,
} from './consultationCrmEngine';

function run() {
  const records: ConsultationRecord[] = [
    {
      id: 'cr-1',
      customerId: 'cust-1',
      counselorId: 'staff-1',
      content: '기초 입학 상담. 체르니 100 수준.',
      category: 'REGISTRATION',
      tags: ['신규', '체르니', '초등부'],
      createdAt: '2026-03-01T10:00:00Z',
    },
    {
      id: 'cr-2',
      customerId: 'cust-1',
      counselorId: 'staff-2',
      content: '학부모 진도 상담. 왼손 타건 교정 집중 요청.',
      category: 'PROGRESS',
      tags: ['진도상담', '자세교정', '초등부'], // '초등부' 중복 태그
      createdAt: '2026-05-15T15:00:00Z',
    },
    {
      id: 'cr-3',
      customerId: 'cust-1',
      counselorId: 'staff-1',
      content: '여름방학 특강 재등록 안내.',
      category: 'RE_ENROLLMENT',
      tags: ['재등록', '방학특강'],
      createdAt: '2026-06-01T11:00:00Z',
    },
  ];

  // 1. 타임라인 정규화 (최신순 정렬 및 태그 중복 제거)
  const timeline = normalizeCustomerTimeline(records);
  assert.equal(timeline.customerId, 'cust-1');
  assert.equal(timeline.totalConsultations, 3);
  // 최신 레코드는 2026-06-01
  assert.equal(timeline.sortedRecords[0].id, 'cr-3');
  assert.equal(timeline.latestCategory, 'RE_ENROLLMENT');
  assert.equal(timeline.lastContactDate, '2026-06-01');
  // 고유 태그 목록
  assert.deepEqual(
    timeline.distinctTags,
    ['방학특강', '신규', '재등록', '자세교정', '초등부', '체르니', '진도상담'].sort()
  );

  // 2. 재등록 D-Day 판정식 (만료일 2026-06-10)
  // 2-1. D-2일 전 (임박 -> HIGH)
  const dDay2 = evaluateReEnrollmentDDay({
    membershipEndDate: '2026-06-10',
    currentDate: '2026-06-08',
    leadNoticeDays: 7,
  });
  assert.equal(dDay2.dDay, 2);
  assert.equal(dDay2.isExpired, false);
  assert.equal(dDay2.requiresAction, true);
  assert.equal(dDay2.urgencyLevel, 'HIGH');

  // 2-2. D-15일 전 (알림 기간 외 -> NONE)
  const dDay15 = evaluateReEnrollmentDDay({
    membershipEndDate: '2026-06-10',
    currentDate: '2026-05-26',
    leadNoticeDays: 7,
  });
  assert.equal(dDay15.requiresAction, false);
  assert.equal(dDay15.urgencyLevel, 'NONE');

  // 2-3. 만료 당일 (D-0 -> CRITICAL)
  const dDay0 = evaluateReEnrollmentDDay({
    membershipEndDate: '2026-06-10',
    currentDate: '2026-06-10',
    leadNoticeDays: 7,
  });
  assert.equal(dDay0.dDay, 0);
  assert.equal(dDay0.requiresAction, true);
  assert.equal(dDay0.urgencyLevel, 'CRITICAL');

  console.log('consultationCrmEngine.test.ts: ok');
}

run();
