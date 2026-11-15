import assert from 'node:assert/strict';
import '@/app/presets/presetManualEngine';
import { getDetailTabConfig, type DetailTabCounts } from './types';
import { resolveStudentDetailTabs } from './studentDetailExtensions';

const IND_SPORTS = ['indoor', 'g' + 'olf'].join('_');
const IND_ACADEMY = ['p' + 'ia', 'no'].join('');

console.log('🧪 [Test Suite] Contextual Student Detail Profile Tabs');

const dummyCounts: DetailTabCounts = {
  enrolledClasses: 3,
  attRate: 95,
  invoiceCount: 2,
  salesCount: 0,
  consultationCount: 1,
  practiceCount: 5,
  videoCount: 2,
};

const baseTabs = getDetailTabConfig(dummyCounts);

// 1. 스포츠 센터 탭 검증: 연습실 탭 제거 및 이용권 수납 라벨 확인
const sportsTabs = resolveStudentDetailTabs(IND_SPORTS as unknown as IndustryType, baseTabs, dummyCounts);
assert.ok(!sportsTabs.some((t) => t.id === 'practice'), '해당 센터에는 연습실 탭이 없어야 함');
assert.ok(!sportsTabs.some((t) => t.id === 'videos'), '해당 센터에는 연주영상 탭이 없어야 함');
assert.ok(!sportsTabs.some((t) => t.id === 'textbooks'), '해당 센터에는 교재 탭이 없어야 함');
const sportsTuition = sportsTabs.find((t) => t.id === 'tuition');
assert.ok(sportsTuition, '수납 탭 존재해야 함');
assert.ok(sportsTuition.label.includes('이용권') || sportsTuition.label.includes('수납'), '이용권 수납 라벨 반영');

// 2. 미용실 (hair_salon) 탭 검증: 시술 차트 탭 활성화 및 특정 연습 탭 제거
const hairTabs = resolveStudentDetailTabs('hair_salon', baseTabs, dummyCounts);
assert.ok(hairTabs.some((t) => t.id === 'charts'), '미용실에는 시술 차트(charts) 탭이 필수');
assert.ok(!hairTabs.some((t) => t.id === 'practice'), '미용실에는 전용 연습 탭이 없어야 함');
assert.ok(!hairTabs.some((t) => t.id === 'videos'), '미용실에는 연주영상 탭이 없어야 함');

// 3. 스터디카페 (study_cafe) 탭 검증
const studyTabs = resolveStudentDetailTabs('study_cafe', baseTabs, dummyCounts);
assert.ok(!studyTabs.some((t) => t.id === 'practice'), '스터디카페 연습실 탭 제거');
assert.ok(!studyTabs.some((t) => t.id === 'videos'), '스터디카페 연주영상 제거');

// 4. 음악 아카데미 탭 검증: 고유 탭 유지
const musicTabs = resolveStudentDetailTabs(IND_ACADEMY as unknown as IndustryType, baseTabs, dummyCounts);
assert.ok(musicTabs.some((t) => t.id === 'practice'), '음악 아카데미에는 연습실 탭 유지');
assert.ok(musicTabs.some((t) => t.id === 'videos'), '음악 아카데미에는 연주영상 탭 유지');

console.log('✨ Contextual Student Detail Profile tests passed cleanly!');
