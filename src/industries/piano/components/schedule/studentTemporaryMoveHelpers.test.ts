import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTemporaryMoveRecord,
  deleteTemporaryMove,
  findTemporaryMoveForSlot,
  getActiveTemporaryMovesForDate,
  loadTemporaryMoves,
  saveTemporaryMove,
  swapTemporaryMoves,
  TemporaryMoveRecord,
} from './studentTemporaryMoveHelpers';

test('createTemporaryMoveRecord: 임시 이동 객체 정상 생성 및 targetDate 바인딩 (엣지 8번)', () => {
  const record = createTemporaryMoveRecord({
    studentId: 'st_123',
    studentName: '김하늘',
    originalDay: '월',
    originalStartTime: '14:00',
    targetDay: '수',
    targetStartTime: '16:00',
    targetDate: '2026-11-09',
    weekStartDate: '2026-11-09',
  });

  assert.equal(record.studentId, 'st_123');
  assert.equal(record.studentName, '김하늘');
  assert.equal(record.originalDay, '월');
  assert.equal(record.targetDay, '수');
  assert.equal(record.targetStartTime, '16:00');
  assert.equal(record.targetDate, '2026-11-09');
  assert.ok(record.id.startsWith('temp_move_'));
});

test('getActiveTemporaryMovesForDate: 특정 날짜에 유효한 이동만 필터링 (엣지 8번)', () => {
  const mockStorage: Record<string, string> = {};
  (globalThis as unknown as { window?: { localStorage?: unknown } }).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
    },
  };

  const testKey = 'test_moves_date_isolation';
  const moveToday = createTemporaryMoveRecord({
    studentId: 'st_1',
    studentName: '김하늘',
    originalDay: '월',
    originalStartTime: '14:00',
    targetDay: '월',
    targetStartTime: '15:00',
    targetDate: '2026-11-10',
  });

  const moveYesterday = createTemporaryMoveRecord({
    studentId: 'st_2',
    studentName: '이도현',
    originalDay: '월',
    originalStartTime: '15:00',
    targetDay: '월',
    targetStartTime: '16:00',
    targetDate: '2026-11-09', // 어제 날짜
  });

  saveTemporaryMove(moveToday, testKey);
  saveTemporaryMove(moveYesterday, testKey);

  const activeToday = getActiveTemporaryMovesForDate('2026-11-10', testKey);
  assert.equal(activeToday.length, 1);
  assert.equal(activeToday[0].studentName, '김하늘');

  const activeNextWeek = getActiveTemporaryMovesForDate('2026-11-17', testKey);
  assert.equal(activeNextWeek.length, 0); // 다음 주 같은 요일에는 누수되지 않음
});

test('saveTemporaryMove: 14:00 -> 15:00 -> 16:00 연쇄 이동 시 최초 originalStartTime 보존 (엣지 7번)', () => {
  const mockStorage: Record<string, string> = {};
  (globalThis as unknown as { window?: { localStorage?: unknown } }).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
    },
  };

  const testKey = 'test_moves_chained';
  // 1차 이동: 14:00 정규 -> 15:00 임시
  const move1 = createTemporaryMoveRecord({
    studentId: 'st_chain',
    studentName: '박서준',
    originalDay: '월',
    originalStartTime: '14:00',
    targetDay: '월',
    targetStartTime: '15:00',
    targetDate: '2026-11-10',
  });
  saveTemporaryMove(move1, testKey);

  // 2차 이동: 15:00에서 다시 16:00으로 연쇄 이동 시도
  const move2 = createTemporaryMoveRecord({
    studentId: 'st_chain',
    studentName: '박서준',
    originalDay: '월',
    originalStartTime: '15:00', // 화면에서는 15:00 슬롯에서 출발한 것처럼 보이지만
    targetDay: '월',
    targetStartTime: '16:00',
    targetDate: '2026-11-10',
  });
  saveTemporaryMove(move2, testKey);

  const loaded = loadTemporaryMoves(testKey);
  assert.equal(loaded.length, 1);
  // 최초의 원래 정규 시간(14:00)이 안전하게 보존되어야 함!
  assert.equal(loaded[0].originalStartTime, '14:00');
  assert.equal(loaded[0].targetStartTime, '16:00');
});

test('swapTemporaryMoves: 두 학생 간 슬롯 맞교환 원자적 생성 (엣지 7번)', () => {
  const mockStorage: Record<string, string> = {};
  (globalThis as unknown as { window?: { localStorage?: unknown } }).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
    },
  };

  const testKey = 'test_moves_swap';
  const { recordA, recordB } = swapTemporaryMoves({
    studentA: { id: 'st_A', name: '학생A' },
    classA: { startTime: '14:00', day: '월' },
    studentB: { id: 'st_B', name: '학생B' },
    classB: { startTime: '15:00', day: '월' },
    targetDate: '2026-11-10',
    storageKey: testKey,
  });

  assert.equal(recordA.studentId, 'st_A');
  assert.equal(recordA.targetStartTime, '15:00');
  assert.equal(recordA.isSwap, true);

  assert.equal(recordB.studentId, 'st_B');
  assert.equal(recordB.targetStartTime, '14:00');
  assert.equal(recordB.isSwap, true);

  const loaded = loadTemporaryMoves(testKey);
  assert.equal(loaded.length, 2);
});

test('findTemporaryMoveForSlot: 대상 슬롯 일치 여부 판별', () => {
  const moves: TemporaryMoveRecord[] = [
    createTemporaryMoveRecord({
      studentId: 'st_1',
      studentName: '윤도현',
      originalDay: '화',
      originalStartTime: '15:00',
      targetDay: '목',
      targetStartTime: '17:00',
      targetDate: '2026-11-10',
    }),
  ];

  // 매칭 성공
  const found = findTemporaryMoveForSlot(moves, 'st_1', '목', '17:00');
  assert.ok(found);
  assert.equal(found.studentName, '윤도현');

  // 매칭 실패 (요일 불일치)
  const notFoundDay = findTemporaryMoveForSlot(moves, 'st_1', '화', '15:00');
  assert.equal(notFoundDay, undefined);

  // 매칭 실패 (시간 불일치)
  const notFoundTime = findTemporaryMoveForSlot(moves, 'st_1', '목', '16:00');
  assert.equal(notFoundTime, undefined);
});

test('saveTemporaryMove / loadTemporaryMoves / deleteTemporaryMove: 스토리지 저장 및 삭제', () => {
  const mockStorage: Record<string, string> = {};
  (globalThis as unknown as { window?: { localStorage?: unknown } }).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
    },
  };

  const testKey = 'test_moves_storage';
  const record1 = createTemporaryMoveRecord({
    studentId: 'st_1',
    studentName: '이지은',
    originalDay: '월',
    originalStartTime: '14:00',
    targetDay: '월',
    targetStartTime: '16:00',
    targetDate: '2026-11-10',
    weekStartDate: '2026-11-09',
  });

  saveTemporaryMove(record1, testKey);
  const loaded = loadTemporaryMoves(testKey);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].studentName, '이지은');

  deleteTemporaryMove(record1.id, testKey);
  const afterDelete = loadTemporaryMoves(testKey);
  assert.equal(afterDelete.length, 0);
});
