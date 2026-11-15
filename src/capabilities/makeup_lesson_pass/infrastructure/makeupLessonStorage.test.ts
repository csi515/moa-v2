import assert from 'node:assert/strict';
import {
  loadMakeupTokens,
  saveMakeupTokens,
  issueAndSaveMakeupToken,
  findActiveMakeupTokenForAbsence,
  getAvailableMakeupTokensForStudent,
  createMakeupRequest,
  getPendingMakeupRequests,
  getMakeupRequestsForStudent,
  approveMakeupRequest,
  rejectMakeupRequest,
} from './makeupLessonStorage.js';

// Node 환경에서 localStorage mock 구성
const mockStorage: Record<string, string> = {};
globalThis.window = {
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
  },
} as unknown as Window & typeof globalThis;

console.log('[test:makeupLessonStorage] starting tests...');

// 1. 초기 로드 빈 배열 검증
const initial = loadMakeupTokens();
assert.deepEqual(initial, []);
console.log('✓ 1. 빈 스토리지 초기 로드 통과');

// 2. 보강 토큰 발급 및 멀티 테넌트(organizationId) 격리 검증
const tokenMusic = issueAndSaveMakeupToken({
  organizationId: 'org_music_center',
  studentId: 'st-101',
  studentName: '홍길동',
  originReason: 'advance_request',
  originDate: '2026-11-10',
  validityDays: 30,
});

const tokenArt = issueAndSaveMakeupToken({
  organizationId: 'org_art',
  studentId: 'st-101', // 동일 학생이 미술센터에도 다님
  studentName: '홍길동',
  originReason: 'absence',
  originDate: '2026-11-12',
  validityDays: 30,
});

assert.equal(tokenMusic.organizationId, 'org_music_center');
assert.equal(tokenArt.organizationId, 'org_art');

// 음악 센터(org_music_center) 조회 시 음악 보강권만 조회되어야 함!
const musicTokens = getAvailableMakeupTokensForStudent('st-101', 'org_music_center', '2026-11-15');
assert.equal(musicTokens.length, 1);
assert.equal(musicTokens[0].id, tokenMusic.id);
assert.equal(musicTokens[0].organizationId, 'org_music_center');

// 미술 센터(org_art) 조회 시 미술 보강권만 조회되어야 함!
const artTokens = getAvailableMakeupTokensForStudent('st-101', 'org_art', '2026-11-15');
assert.equal(artTokens.length, 1);
assert.equal(artTokens[0].id, tokenArt.id);
assert.equal(artTokens[0].organizationId, 'org_art');
console.log('✓ 2. 멀티 테넌트(organizationId) 센터별 보강권 격리 조회 통과');

// 3. 결석 일자에 따른 활성 토큰 매칭
const active = findActiveMakeupTokenForAbsence('st-101', '2026-11-10', 'org_music_center', '2026-11-15');
assert.ok(active);
assert.equal(active?.token.id, tokenMusic.id);
assert.equal(active?.daysRemaining, 25);
console.log('✓ 3. 결석 일자 기준 활성 토큰 매칭 통과');

// 4. 학부모의 보강 신청(createMakeupRequest) 흐름 검증
const request = createMakeupRequest({
  organizationId: 'org_music_center',
  tokenId: tokenMusic.id,
  studentId: 'st-101',
  studentName: '홍길동',
  originDate: tokenMusic.originDate,
  preferredDate: '2026-11-18',
  preferredTime: '16:00',
  memo: '차량 탑승 가능한지 문의드립니다.',
});

assert.equal(request.status, 'pending');
assert.equal(request.preferredDate, '2026-11-18');
assert.equal(request.preferredTime, '16:00');

// 원장님 화면: 음악 센터의 대기 중 보강 신청 조회
const pendingRequests = getPendingMakeupRequests('org_music_center');
assert.equal(pendingRequests.length, 1);
assert.equal(pendingRequests[0].id, request.id);

// 미술 센터에는 신청 건이 없어야 함
const pendingArtRequests = getPendingMakeupRequests('org_art');
assert.equal(pendingArtRequests.length, 0);
console.log('✓ 4. 학부모 보강 신청 생성 및 원장님 센터별 대기 목록 격리 통과');

// 5. 원장님의 보강 승인(approveMakeupRequest) 및 토큰 상태 자동 전이 검증
const approveResult = approveMakeupRequest(request.id, '음악원장님');
assert.ok(approveResult);
assert.equal(approveResult?.request.status, 'approved');
assert.equal(approveResult?.request.reviewedBy, '음악원장님');
assert.equal(approveResult?.token.status, 'reserved');

// 승인 후 원장님 대기 목록에서 제외되는지 확인
const remainingPending = getPendingMakeupRequests('org_music_center');
assert.equal(remainingPending.length, 0);

// 학부모 학생 내역에서 approved 상태 확인
const studentHistory = getMakeupRequestsForStudent('org_music_center', 'st-101');
assert.equal(studentHistory.length, 1);
assert.equal(studentHistory[0].status, 'approved');
console.log('✓ 5. 원장님 보강 승인 및 토큰 reserved 자동 전이 통과');

console.log('[test:makeupLessonStorage] ALL TESTS PASSED! (100%)');
