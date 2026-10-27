import assert from 'node:assert/strict';
import {
  type VipConciergeProfile,
  hasAllergyRisk,
  getRecommendedBeverage,
  filterVipByTier,
} from './vipConciergeEngine';

function run() {
  const profile1: VipConciergeProfile = {
    id: '1',
    customerId: 'c1',
    customerName: '김대표',
    vipTier: 'black',
    allergies: ['견과류', '갑각류', '라텍스'],
    dietaryPreferences: ['디카페인', '비건'],
    roomTemperaturePreference: 21,
    musicGenrePreference: '조용한 클래식',
    doNotDiscussTopics: ['자녀 입시', '정치'],
    protocolNotes: '입장 시 정중히 룸으로 즉시 안내, 실온수 먼저 서빙',
    updatedAt: '2026-03-01T10:00:00Z',
  };

  const profile2: VipConciergeProfile = {
    id: '2',
    customerId: 'c2',
    customerName: '박원장',
    vipTier: 'diamond',
    allergies: ['알코올'],
    dietaryPreferences: ['디카페인'],
    roomTemperaturePreference: 24,
    musicGenrePreference: '재즈',
    doNotDiscussTopics: [],
    protocolNotes: '예약 시간보다 10분 일찍 도착하시는 편임',
    updatedAt: '2026-03-02T10:00:00Z',
  };

  const list = [profile1, profile2];

  // 1. hasAllergyRisk
  assert.equal(hasAllergyRisk(profile1, '견과류'), true);
  assert.equal(hasAllergyRisk(profile1, '복숭아'), false);
  assert.equal(hasAllergyRisk(profile2, '알코올'), true);

  // 2. getRecommendedBeverage
  assert.equal(getRecommendedBeverage(profile1), '유기농 루이보스 티 (온음료)');
  assert.equal(getRecommendedBeverage(profile2), '디카페인 아메리카노 (온음료)');

  // 3. filterVipByTier
  const blackTier = filterVipByTier(list, 'black');
  assert.equal(blackTier.length, 1);
  assert.equal(blackTier[0].customerName, '김대표');

  console.log('vipConciergeEngine tests passed!');
}

run();
