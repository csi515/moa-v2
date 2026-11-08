import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateRecitalBoardStats,
  buildRecitalQuickEntries,
  filterRecitalEntries,
  saveRecitalQuickEntry,
  loadRecitalStoredMap,
  RecitalQuickEntry,
  STORAGE_KEY_RECITAL_BOARD_PREFIX,
} from './recitalQuickBoardHelpers';

// Node 환경에서 window.localStorage mock
const mockStorage: Record<string, string> = {};
(global as unknown as { window: { localStorage: Storage } }).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
    length: 0,
    key: () => null,
  } as unknown as Storage,
};

test('calculateRecitalBoardStats: 빈 배열 처리', () => {
  const stats = calculateRecitalBoardStats([]);
  assert.equal(stats.totalCount, 0);
  assert.equal(stats.participatingCount, 0);
  assert.equal(stats.declinedCount, 0);
  assert.equal(stats.pendingCount, 0);
  assert.equal(stats.participationRate, 0);
  assert.equal(stats.feePaidCount, 0);
});

test('calculateRecitalBoardStats: 정상 집계 및 참가율 계산', () => {
  const entries: RecitalQuickEntry[] = [
    { studentId: 's1', studentName: '김지민', status: 'participating', pieceTitle: '인형의 춤', feePaid: true },
    { studentId: 's2', studentName: '박서준', status: 'participating', pieceTitle: '엘리제를 위하여', feePaid: false },
    { studentId: 's3', studentName: '이지은', status: 'pending', pieceTitle: '', feePaid: false },
    { studentId: 's4', studentName: '최우식', status: 'declined', pieceTitle: '', feePaid: false },
  ];

  const stats = calculateRecitalBoardStats(entries);
  assert.equal(stats.totalCount, 4);
  assert.equal(stats.participatingCount, 2);
  assert.equal(stats.pendingCount, 1);
  assert.equal(stats.declinedCount, 1);
  assert.equal(stats.participationRate, 50); // 2 / 4 * 100
  assert.equal(stats.feePaidCount, 1);
});

test('buildRecitalQuickEntries: 저장된 데이터 및 기존 참가자 매핑', () => {
  const eventId = 'recital-2026-spring';
  const students = [
    { id: 's1', name: '김하늘', grade: '초3', level: '체르니 30' },
    { id: 's2', name: '윤도현', grade: '초1', level: '바이엘 2' },
    { id: 's3', name: '강민우', grade: '초4', level: '소나티네' },
  ];

  // s1은 이미 로컬스토리지에 저장되어 있다고 가정
  saveRecitalQuickEntry(eventId, {
    studentId: 's1',
    studentName: '김하늘',
    status: 'declined',
    pieceTitle: '',
    feePaid: false,
  });

  // s2는 행사 참가자 목록(knownParticipantIds)에 포함되어 있다고 가정
  const entries = buildRecitalQuickEntries(eventId, students, ['s2']);

  assert.equal(entries.length, 3);
  // s1: 저장된 'declined' 우선
  const s1 = entries.find((e) => e.studentId === 's1');
  assert.equal(s1?.status, 'declined');

  // s2: knownParticipantIds에 있으므로 'participating'
  const s2 = entries.find((e) => e.studentId === 's2');
  assert.equal(s2?.status, 'participating');

  // s3: 둘 다 없으므로 기본 'pending'
  const s3 = entries.find((e) => e.studentId === 's3');
  assert.equal(s3?.status, 'pending');
});

test('saveRecitalQuickEntry & loadRecitalStoredMap: 변경 사항 저장 및 조회', () => {
  const eventId = 'competition-2026';
  const entry: RecitalQuickEntry = {
    studentId: 's99',
    studentName: '홍길동',
    status: 'participating',
    pieceTitle: '쇼팽 즉흥환상곡',
    feePaid: true,
  };

  saveRecitalQuickEntry(eventId, entry);

  const stored = loadRecitalStoredMap(eventId);
  assert.ok(stored['s99']);
  assert.equal(stored['s99'].status, 'participating');
  assert.equal(stored['s99'].pieceTitle, '쇼팽 즉흥환상곡');
  assert.equal(stored['s99'].feePaid, true);
  assert.ok(stored['s99'].updatedAt);
});

test('filterRecitalEntries: 상태 및 검색어 필터링', () => {
  const entries: RecitalQuickEntry[] = [
    { studentId: 's1', studentName: '김지민', grade: '초2', status: 'participating', pieceTitle: '인형의 춤', feePaid: true },
    { studentId: 's2', studentName: '박서준', grade: '초3', status: 'participating', pieceTitle: '엘리제를 위하여', feePaid: false },
    { studentId: 's3', studentName: '김민재', grade: '초2', status: 'pending', pieceTitle: '', feePaid: false },
    { studentId: 's4', studentName: '최우식', grade: '중1', status: 'declined', pieceTitle: '', feePaid: false },
  ];

  // 1. 상태 필터: participating
  const participating = filterRecitalEntries(entries, 'participating', '');
  assert.equal(participating.length, 2);

  // 2. 검색어: 학생 이름
  const searchName = filterRecitalEntries(entries, 'all', '민재');
  assert.equal(searchName.length, 1);
  assert.equal(searchName[0].studentName, '김민재');

  // 3. 검색어: 곡명
  const searchSong = filterRecitalEntries(entries, 'all', '엘리제');
  assert.equal(searchSong.length, 1);
  assert.equal(searchSong[0].studentName, '박서준');

  // 4. 복합 필터: 초2 + participating
  const filterCombined = filterRecitalEntries(entries, 'participating', '초2');
  assert.equal(filterCombined.length, 1);
  assert.equal(filterCombined[0].studentName, '김지민');
});
