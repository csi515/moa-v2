import assert from 'node:assert/strict';
import {
  calculateChecklistProgress,
  evaluateChecklistUrgency,
  type ChecklistItem,
} from './maintenanceChecklistEngine';

function run() {
  const items: ChecklistItem[] = [
    {
      id: 'chk-1',
      title: '온탕 수온 점검 (38~42도)',
      isRequired: true,
      isCompleted: true,
      numericValue: 40.5,
      minThreshold: 38.0,
      maxThreshold: 42.0,
    },
    {
      id: 'chk-2',
      title: '남성/여성 탈의실 바닥 소독',
      isRequired: true,
      isCompleted: false,
    },
    {
      id: 'chk-3',
      title: '음료 자판기 잔돈 보충',
      isRequired: false,
      isCompleted: false,
    },
    {
      id: 'chk-4',
      title: '출입문 키오스크 영수증 용지 점검',
      isRequired: false,
      isCompleted: true,
    },
  ];

  // 1. 진행률 계산 (총 4개 중 2개 완료 = 50%, 필수 2개 중 1개 완료 = 미충족)
  const progress = calculateChecklistProgress(items);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.requiredCount, 2);
  assert.equal(progress.requiredCompletedCount, 1);
  assert.equal(progress.ratePercent, 50);
  assert.equal(progress.isRequiredFulfilled, false);

  // 2. 마감 전 긴급도 평가 (아직 마감 전이지만 필수 누락 존재 -> WARNING)
  const beforeDeadline = evaluateChecklistUrgency({
    items,
    deadlineTime: '12:00',
    currentTime: '10:00',
  });
  assert.equal(beforeDeadline.hasMissingRequired, true);
  assert.deepEqual(beforeDeadline.missingRequiredItemIds, ['chk-2']);
  assert.equal(beforeDeadline.isDeadlinePassed, false);
  assert.equal(beforeDeadline.hasOutOfRangeValues, false);
  assert.equal(beforeDeadline.alertLevel, 'WARNING');

  // 3. 마감 초과 시 평가 (마감 지났는데 필수 누락 -> CRITICAL)
  const afterDeadline = evaluateChecklistUrgency({
    items,
    deadlineTime: '12:00',
    currentTime: '12:30',
  });
  assert.equal(afterDeadline.isDeadlinePassed, true);
  assert.equal(afterDeadline.alertLevel, 'CRITICAL');

  // 4. 수온 이상치 (임계 범위 38~42 벗어남)
  const abnormalItems: ChecklistItem[] = [
    {
      ...items[0],
      numericValue: 45.0, // 초과!
    },
    {
      ...items[1],
      isCompleted: true,
    },
  ];
  const outOfRangeCheck = evaluateChecklistUrgency({
    items: abnormalItems,
    deadlineTime: '12:00',
    currentTime: '10:00',
  });
  assert.equal(outOfRangeCheck.hasOutOfRangeValues, true);
  assert.deepEqual(outOfRangeCheck.outOfRangeItemIds, ['chk-1']);
  assert.equal(outOfRangeCheck.alertLevel, 'CRITICAL');

  console.log('maintenanceChecklistEngine.test.ts: ok');
}

run();
