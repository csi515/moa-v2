import assert from 'node:assert/strict';
import {
  normalizeRouteStops,
  evaluateUpcomingArrivalNotice,
  summarizeRouteOperation,
  type ShuttleStop,
  type BoardingCheckRecord,
} from './vehicleShuttleEngine';

function run() {
  const dummyStops: ShuttleStop[] = [
    {
      id: 'stop-3',
      name: '아이파크 후문',
      sequenceOrder: 3,
      scheduledMinutesFromStart: 15,
      assignedStudentIds: ['std-5', 'std-6'],
    },
    {
      id: 'stop-1',
      name: '학원 출발점',
      sequenceOrder: 1,
      scheduledMinutesFromStart: 0,
      assignedStudentIds: [],
    },
    {
      id: 'stop-2',
      name: '푸르지오 정문',
      sequenceOrder: 2,
      scheduledMinutesFromStart: 7,
      assignedStudentIds: ['std-1', 'std-2', 'std-3'],
    },
  ];

  // 1. normalizeRouteStops (순서 오름차순 정렬)
  const sorted = normalizeRouteStops(dummyStops);
  assert.equal(sorted[0].id, 'stop-1');
  assert.equal(sorted[1].id, 'stop-2');
  assert.equal(sorted[2].id, 'stop-3');

  // 2. evaluateUpcomingArrivalNotice
  // 출발 후 5분 경과, 현재 정류장 1번(출발점) 완료 상태 -> 다음 2번 정류장(7분 예정)까지 2분 남음 (<= 3분 전)
  const noticeResult = evaluateUpcomingArrivalNotice({
    stops: dummyStops,
    currentStopIndex: 0,
    elapsedMinutesSinceDeparture: 5,
    noticeThresholdMinutes: 3,
  });

  assert.equal(noticeResult.shouldNotify, true);
  assert.equal(noticeResult.nextStop?.id, 'stop-2');
  assert.equal(noticeResult.minutesRemainingToNextStop, 2);
  assert.deepEqual(noticeResult.targetStudentIds, ['std-1', 'std-2', 'std-3']);

  // 출발 후 1분 경과 -> 6분 남음 (3분 전 조건 불만족)
  const notYet = evaluateUpcomingArrivalNotice({
    stops: dummyStops,
    currentStopIndex: 0,
    elapsedMinutesSinceDeparture: 1,
    noticeThresholdMinutes: 3,
  });
  assert.equal(notYet.shouldNotify, false);
  assert.equal(notYet.targetStudentIds.length, 0);

  // 3. summarizeRouteOperation
  const logs: BoardingCheckRecord[] = [
    { studentId: 'std-1', stopId: 'stop-2', status: 'BOARDED', timestamp: '2026-10-15T14:37:00Z' },
    { studentId: 'std-2', stopId: 'stop-2', status: 'BOARDED', timestamp: '2026-10-15T14:37:30Z' },
    { studentId: 'std-3', stopId: 'stop-2', status: 'ABSENT', timestamp: '2026-10-15T14:38:00Z' },
  ];

  const summary = summarizeRouteOperation({
    stops: dummyStops,
    boardingLogs: logs,
    currentStopIndex: 1,
  });

  assert.equal(summary.totalAssignedStudents, 5); // std-1,2,3,5,6
  assert.equal(summary.boardedCount, 2);
  assert.equal(summary.absentCount, 1);
  assert.equal(summary.isCompleted, false);

  console.log('✅ vehicleShuttleEngine tests all passed!');
}

run();
