import assert from 'node:assert/strict';
import {
  groupAttendanceRowsByTime,
  isSlotCurrent,
  type DayStatus,
} from './pianoAttendanceTimeline';

interface DummyRow {
  student: { id: string; name: string };
  scheduleTime?: string;
  status: DayStatus;
}

function testTimelineGrouping() {
  const rows: DummyRow[] = [
    { student: { id: '1', name: '김철수' }, scheduleTime: '15:00', status: 'present' },
    { student: { id: '2', name: '이영희' }, scheduleTime: '14:00', status: 'unchecked' },
    { student: { id: '3', name: '박민수' }, scheduleTime: '14:00', status: 'present' },
    { student: { id: '4', name: '강동원' }, scheduleTime: '', status: 'present' },
    { student: { id: '5', name: '홍길동' }, scheduleTime: '14:00', status: 'unchecked' },
  ];

  const groups = groupAttendanceRowsByTime(rows, { isToday: true, nowMinutes: 14 * 60 + 15 });

  // 14:00, 15:00, unscheduled(일정 외) 총 3개 그룹
  assert.equal(groups.length, 3);

  // 첫 번째 그룹은 14:00
  const g14 = groups[0];
  assert.equal(g14.timeKey, '14:00');
  assert.equal(g14.totalCount, 3);
  assert.equal(g14.uncheckedCount, 2);
  assert.equal(g14.presentCount, 1);
  assert.equal(g14.isAllCompleted, false);
  assert.equal(g14.isCurrentSlot, true); // 14:15 기준이므로 14:00 슬롯 활성화

  // 14:00 그룹 내 정렬: 미등원자(홍길동, 이영희)가 앞쪽, 이름 가나다순
  assert.equal(g14.items[0].student.name, '이영희');
  assert.equal(g14.items[1].student.name, '홍길동');
  assert.equal(g14.items[2].student.name, '박민수');

  // 두 번째 그룹은 15:00
  const g15 = groups[1];
  assert.equal(g15.timeKey, '15:00');
  assert.equal(g15.totalCount, 1);
  assert.equal(g15.uncheckedCount, 0);
  assert.equal(g15.presentCount, 1);
  assert.equal(g15.isAllCompleted, true);
  assert.equal(g15.isCurrentSlot, false);

  // 세 번째 그룹은 일정 외
  const gUnscheduled = groups[2];
  assert.equal(gUnscheduled.timeKey, 'unscheduled');
  assert.equal(gUnscheduled.timeLabel, '일정 외');
  assert.equal(gUnscheduled.isUnscheduled, true);
  assert.equal(gUnscheduled.totalCount, 1);
  assert.equal(gUnscheduled.items[0].student.name, '강동원');
}

function testIsSlotCurrent() {
  // 오늘이 아닌 경우 false
  assert.equal(isSlotCurrent('14:00', false, 14 * 60), false);
  // unscheduled인 경우 false
  assert.equal(isSlotCurrent('unscheduled', true, 14 * 60), false);

  // 14:00 수업: 13:50 ~ 14:49까지 current
  assert.equal(isSlotCurrent('14:00', true, 13 * 60 + 49), false);
  assert.equal(isSlotCurrent('14:00', true, 13 * 60 + 50), true);
  assert.equal(isSlotCurrent('14:00', true, 14 * 60 + 20), true);
  assert.equal(isSlotCurrent('14:00', true, 14 * 60 + 49), true);
  assert.equal(isSlotCurrent('14:00', true, 14 * 60 + 50), false);
}

testTimelineGrouping();
testIsSlotCurrent();
console.log('pianoAttendanceTimeline.test.ts: ok');
