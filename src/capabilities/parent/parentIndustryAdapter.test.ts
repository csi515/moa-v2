/**
 * ParentIndustryAdapter Multi-vertical & Fallback Safety Test
 * 실행: npx tsx src/capabilities/parent/parentIndustryAdapter.test.ts
 */
import assert from 'node:assert/strict';
import { ParentIndustryAdapter } from './ParentIndustryAdapter';
import { installIndustryPlugin } from '@/core/industry/pluginHost';

// 테스트용 플러그인 설정 설치
installIndustryPlugin({
  id: 'piano',
  showsMakeupList: true,
  showsPracticeRoomTab: true,
} as any);

installIndustryPlugin({
  id: 'daycare',
  showPickupFields: true,
  showsMakeupList: false,
} as any);

// 1. 기존 업종 정책 검증 (Backward compatibility)
const pianoPolicy = ParentIndustryAdapter.getPolicy('piano');
assert.equal(pianoPolicy.showsMakeupList, true);
assert.equal(pianoPolicy.showsPracticeRoomTab, true);
assert.equal(pianoPolicy.bookingVariant, 'standard');

const daycarePolicy = ParentIndustryAdapter.getPolicy('daycare');
assert.equal(daycarePolicy.showPickupFields, true);
assert.equal(daycarePolicy.showsMakeupList, false);

const skinPolicy = ParentIndustryAdapter.getPolicy('skin_clinic');
assert.equal(skinPolicy.bookingVariant, 'skin');

const pilatesPolicy = ParentIndustryAdapter.getPolicy('pilates');
assert.equal(pilatesPolicy.bookingVariant, 'pilates');

// 2. 신규/미지원 업종 Fallback 안전성 (절대 런타임 크래시 방지)
const futurePolicy = ParentIndustryAdapter.getPolicy('robotics_academy_future');
assert.ok(futurePolicy, 'Future industry policy must be created safely');
assert.equal(futurePolicy.showsPracticeRoomTab, false);
assert.equal(futurePolicy.bookingVariant, 'standard');

const nullPolicy = ParentIndustryAdapter.getPolicy(null);
assert.ok(nullPolicy, 'Null industry policy must be created safely');

// 3. 신규/미지원 업종 네비게이션 생성 검증
const futureNav = ParentIndustryAdapter.getNav('robotics_academy_future');
assert.ok(Array.isArray(futureNav), 'Future industry nav must be an array');
assert.ok(futureNav.length >= 4, 'Future industry nav must include base items');
const navIds = futureNav.map((n) => n.id);
assert.ok(navIds.includes('home'), 'Must include home');
assert.ok(navIds.includes('attendance'), 'Must include attendance');
assert.ok(navIds.includes('tuition'), 'Must include tuition');
assert.ok(navIds.includes('more'), 'Must include more');

// 4. Role 및 Fee Title 안전 조회
assert.equal(ParentIndustryAdapter.getRoleLabel('daycare'), '보호자 포털');
assert.equal(ParentIndustryAdapter.getRoleLabel('skin_clinic'), '고객 포털');
assert.equal(ParentIndustryAdapter.getRoleLabel('robotics_academy_future'), '학부모 포털');

assert.equal(ParentIndustryAdapter.getFeeTitle('daycare'), '보호자 결제/보육료');
assert.equal(typeof ParentIndustryAdapter.getFeeTitle('robotics_academy_future'), 'string');

console.log('parentIndustryAdapter.test.ts OK');
