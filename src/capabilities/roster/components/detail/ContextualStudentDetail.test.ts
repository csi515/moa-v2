import assert from 'node:assert/strict';
import { getDetailTabConfig, type DetailTabCounts } from './types';
import { resolveStudentDetailTabs } from './studentDetailExtensions';

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

// 1. 골프장 (indoor_golf) 탭 검증: 피아노 탭 제거 및 이용권 수납 라벨 확인
const golfTabs = resolveStudentDetailTabs('indoor_golf', baseTabs, dummyCounts);
assert.ok(!golfTabs.some((t) => t.id === 'practice'), '골프장에는 연습실(피아노) 탭이 없어야 함');
assert.ok(!golfTabs.some((t) => t.id === 'videos'), '골프장에는 연주영상 탭이 없어야 함');
assert.ok(!golfTabs.some((t) => t.id === 'textbooks'), '골프장에는 교재 탭이 없어야 함');
const golfTuition = golfTabs.find((t) => t.id === 'tuition');
assert.ok(golfTuition, '수납 탭 존재해야 함');
assert.ok(golfTuition.label.includes('이용권') || golfTuition.label.includes('수납'), '골프장 이용권 수납 라벨 반영');

// 2. 미용실 (hair_salon) 탭 검증: 시술 차트 탭 활성화 및 피아노 탭 제거
const hairTabs = resolveStudentDetailTabs('hair_salon', baseTabs, dummyCounts);
assert.ok(hairTabs.some((t) => t.id === 'charts'), '미용실에는 시술 차트(charts) 탭이 필수');
assert.ok(!hairTabs.some((t) => t.id === 'practice'), '미용실에는 피아노 연습 탭이 없어야 함');
assert.ok(!hairTabs.some((t) => t.id === 'videos'), '미용실에는 연주영상 탭이 없어야 함');

// 3. 스터디카페 (study_cafe) 탭 검증
const studyTabs = resolveStudentDetailTabs('study_cafe', baseTabs, dummyCounts);
assert.ok(!studyTabs.some((t) => t.id === 'practice'), '스터디카페 피아노 탭 제거');
assert.ok(!studyTabs.some((t) => t.id === 'videos'), '스터디카페 연주영상 제거');

// 4. 피아노 학원 (piano) 탭 검증: 피아노 고유 탭 유지
const pianoTabs = resolveStudentDetailTabs('piano', baseTabs, dummyCounts);
assert.ok(pianoTabs.some((t) => t.id === 'practice'), '피아노 학원에는 연습실 탭 유지');
assert.ok(pianoTabs.some((t) => t.id === 'videos'), '피아노 학원에는 연주영상 탭 유지');

console.log('✨ Contextual Student Detail Profile tests passed cleanly!');
