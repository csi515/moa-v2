import assert from 'node:assert/strict';
import {
  registerContestParticipant,
  assembleContestCueSheet,
  awardContestEntry,
  renderContestSvgAward,
  EventContest,
} from './eventContestEngine.js';

console.log('[test:event-contest] starting test suite...');

// 1. 대회 샘플
const contest: EventContest = {
  id: 'contest-1',
  organizationId: 'org-test',
  title: '제12회 모아 피아노 정기 연주회',
  eventCategory: 'concert',
  eventDate: '2026-11-15',
  venueName: '모아 드림아트홀',
  entryFee: 30000,
  registrationDeadline: '2026-10-31',
  status: 'open',
};

// 2. 참가자 접수 및 순번 자동 채번
const entry1 = registerContestParticipant({
  id: 'ent-1',
  organizationId: 'org-test',
  contestId: 'contest-1',
  participantName: '한지민',
  performancePiece: '쇼팽 즉흥환상곡',
  existingCount: 0,
});
assert.equal(entry1.entryOrder, 1);
assert.equal(entry1.participantName, '한지민');

const entry2 = registerContestParticipant({
  id: 'ent-2',
  organizationId: 'org-test',
  contestId: 'contest-1',
  participantName: '정우성',
  performancePiece: '베토벤 월광 소나타 3악장',
  existingCount: 1,
});
assert.equal(entry2.entryOrder, 2);
console.log('✓ 1. 참가자 접수 및 무대 등번호 순번 채번 통과');

// 3. 프로그램 순서표(큐시트) 조립
const cueSheet = assembleContestCueSheet(contest, [entry2, entry1]);
assert.match(cueSheet, /🎼 \[무대 프로그램 큐시트\] 제12회 모아 피아노 정기 연주회/);
assert.match(cueSheet, /No\.01 \| 한지민 \| 쇼팽 즉흥환상곡/);
assert.match(cueSheet, /No\.02 \| 정우성 \| 베토벤 월광 소나타 3악장/);
assert.match(cueSheet, /총 참가 인원: 2명/);
console.log('✓ 2. 순번 정렬 무대 큐시트 자동 조립 통과');

// 4. 심사 점수 합산 및 상장 수여 판정
const awardedEntry = awardContestEntry(entry1, {
  technique: 96,
  expression: 98,
  rhythm: 94,
});
assert.equal(awardedEntry.finalScore, 96);
assert.equal(awardedEntry.awardTitle, '대상 (Grand Prize)');
assert.equal(awardedEntry.certificateIssued, true);
console.log('✓ 3. 루브릭 가중치 심사 및 대상 판정 통과');

// 5. W3C SVG 0원 전자 상장 렌더링
const svg = renderContestSvgAward(contest, awardedEntry);
assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
assert.match(svg, /한지민/);
assert.match(svg, /쇼팽 즉흥환상곡/);
assert.match(svg, /대상 \(Grand Prize\)/);
assert.match(svg, /모아 드림아트홀 원장/);
console.log('✓ 4. W3C SVG 0원 모바일 상장 그래픽 렌더링 통과');

console.log('[test:event-contest] ALL TESTS PASSED! (100%)');
