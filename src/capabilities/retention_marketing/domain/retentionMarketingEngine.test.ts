import assert from 'node:assert/strict';
import {
  scanExpiringPasses,
  scanDueTreatments,
  interpolateTemplate,
  generateMarketingDispatchQueue,
  type MessageTemplate,
  type DispatchHistoryItem,
} from './retentionMarketingEngine';

function run() {
  const currentDate = '2026-10-15';

  // 1. scanExpiringPasses
  const dummyPasses = [
    {
      id: 'p-1',
      customerId: 'c-1',
      customerName: '김철수',
      customerPhone: '010-1111-2222',
      endDate: '2026-10-22', // 7일 남음 (D-7)
      status: 'active',
    },
    {
      id: 'p-2',
      customerId: 'c-2',
      customerName: '이영희',
      endDate: '2026-10-18', // 3일 남음 (D-3)
      status: 'active',
    },
    {
      id: 'p-3',
      customerId: 'c-3',
      customerName: '박지민',
      endDate: '2026-11-15', // 31일 남음 (윈도우 외)
      status: 'active',
    },
    {
      id: 'p-4',
      customerId: 'c-4',
      customerName: '최동욱',
      endDate: '2026-10-15', // 0일 남음 (D-Day)
      status: 'active',
    },
  ];

  const expiring = scanExpiringPasses({
    passes: dummyPasses,
    currentDate,
    targetDaysWindow: [7, 3, 0],
  });

  assert.equal(expiring.length, 3);
  assert.equal(expiring[0].customerName, '김철수');
  assert.equal(expiring[0].daysRemaining, 7);
  assert.equal(expiring[1].customerName, '이영희');
  assert.equal(expiring[1].daysRemaining, 3);
  assert.equal(expiring[2].customerName, '최동욱');
  assert.equal(expiring[2].daysRemaining, 0);

  // 2. scanDueTreatments
  // 4주 = 28일 주기
  // 2026-09-19 + 28일 = 2026-10-17 (D-2) -> 도래
  // 2026-10-01 + 28일 = 2026-10-29 (D-14) -> 미도래
  const dummyTreatments = [
    {
      id: 't-1',
      customerId: 'c-10',
      customerName: '정수민',
      lastPerformedDate: '2026-09-19',
      cycleWeeks: 4,
    },
    {
      id: 't-2',
      customerId: 'c-11',
      customerName: '강태양',
      lastPerformedDate: '2026-10-01',
      cycleWeeks: 4,
    },
  ];

  const dueTreatments = scanDueTreatments({
    treatments: dummyTreatments,
    currentDate,
  });

  assert.equal(dueTreatments.length, 1);
  assert.equal(dueTreatments[0].customerName, '정수민');
  assert.equal(dueTreatments[0].daysRemaining, 2);

  // 3. interpolateTemplate
  const tpl = '안녕하세요 {고객명}님, {사업장명}입니다. 수강권 만료 {남은일수}일 전입니다.';
  const interpolated = interpolateTemplate(tpl, {
    customerName: '김철수',
    workplaceName: '모아 필라테스',
    daysRemaining: 7,
    referenceDate: '2026-10-22',
  });
  assert.equal(interpolated, '안녕하세요 김철수님, 모아 필라테스입니다. 수강권 만료 7일 전입니다.');

  // 4. generateMarketingDispatchQueue (쿨다운 중복 방지 포함)
  const templates: MessageTemplate[] = [
    {
      triggerType: 'PASS_EXPIRING',
      title: '수강권 만료 안내',
      body: '[{사업장명}] {고객명}님, 수강권이 {남은일수}일 후 만료됩니다. 재등록 시 10% 혜택!',
    },
  ];

  // 최근 2일 전에 김철수에게 PASS_EXPIRING 발송 이력 존재 -> 7일 쿨다운 대상이므로 큐에서 제외되어야 함
  const recentHistory: DispatchHistoryItem[] = [
    {
      customerId: 'c-1',
      triggerType: 'PASS_EXPIRING',
      sentAt: '2026-10-13T10:00:00Z',
    },
  ];

  const queue = generateMarketingDispatchQueue({
    candidates: expiring,
    templates,
    history: recentHistory,
    currentDate,
    workplaceName: '모아 짐',
    cooldownDays: 7,
  });

  // c-1(김철수)는 제외되고 c-2, c-4 총 2명만 큐에 들어가야 함
  assert.equal(queue.length, 2);
  assert.equal(queue[0].customerName, '이영희');
  assert.ok(queue[0].messageText.includes('3일 후 만료'));
  assert.equal(queue[1].customerName, '최동욱');
  assert.ok(queue[1].messageText.includes('0일 후 만료'));

  console.log('✅ retentionMarketingEngine tests all passed!');
}

run();
