import assert from 'node:assert/strict';
import {
  assembleCareReportMessage,
  renderCareReportSvgCard,
  formatMealLabel,
  formatPottyLabel,
  DailyCareLog,
} from './dailyCareReportEngine.js';

console.log('[test:daily-care-report] starting test suite...');

// 1. 라벨 포맷팅 검증
assert.match(formatMealLabel('all'), /완식/);
assert.match(formatMealLabel('none'), /식사 거부/);
assert.match(formatPottyLabel('normal'), /정상 배변/);
assert.match(formatPottyLabel('soft'), /묽은 변/);
console.log('✓ 1. 식사 및 배변 라벨 매핑 통과');

// 2. 알림장 샘플 로그
const log: DailyCareLog = {
  id: 'care-1',
  organizationId: 'org-test',
  subjectId: 'pet-1',
  subjectName: '초코',
  subjectType: 'pet',
  logDate: '2026-10-17',
  mealStatus: 'all',
  pottyStatus: 'normal',
  napMinutes: 90,
  medicationGiven: true,
  conditionRating: 5,
  summaryComment: '친구들과 마당에서 신나게 뛰어놀고 밥도 깨끗이 비웠습니다!',
  dispatchStatus: 'draft',
};

// 3. 안내 텍스트 조립 검증
const message = assembleCareReportMessage(log);
assert.match(message, /\[오늘의 안심 돌봄 알림장\]/);
assert.match(message, /초코 보호자님/);
assert.match(message, /컨디션: ★★★★★/);
assert.match(message, /투약 관리: 💊 투약 완료/);
assert.match(message, /식사: 🥣 완식/);
console.log('✓ 2. 보호자 안심 알림장 텍스트 조립 통과');

// 4. W3C SVG 0원 카드 렌더링 검증
const svg = renderCareReportSvgCard(log);
assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
assert.match(svg, /초코 안심 돌봄 리포트/);
assert.match(svg, /90분 숙면/);
assert.match(svg, /투약 완료/);
console.log('✓ 3. W3C SVG 모바일 안심 카드 렌더링 통과');

console.log('[test:daily-care-report] ALL TESTS PASSED! (100%)');
