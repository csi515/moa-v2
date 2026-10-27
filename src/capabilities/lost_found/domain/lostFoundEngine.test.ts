import {
  LostItem,
  calculateExpiryDate,
  calculateDaysRemaining,
  evaluateLostItemEffectiveStatus,
  filterItemsExpiringSoon,
  summarizeLostAndFound,
} from './lostFoundEngine';

function runTests() {
  console.log('--- Testing lostFoundEngine ---');

  // Test 1: 만료일 및 잔여 일수 계산
  const expiry = calculateExpiryDate('2026-10-01', 30);
  if (expiry !== '2026-10-31') {
    throw new Error(`Expected expiry 2026-10-31, got ${expiry}`);
  }

  // 2026-10-25 기준 잔여일: 31 - 25 = 6일
  const remaining = calculateDaysRemaining('2026-10-31', '2026-10-25');
  if (remaining !== 6) {
    throw new Error(`Expected 6 days remaining, got ${remaining}`);
  }

  // 만료일 경과: 2026-11-02 기준: -2일
  const expiredDays = calculateDaysRemaining('2026-10-31', '2026-11-02');
  if (expiredDays !== -2) {
    throw new Error(`Expected -2 days, got ${expiredDays}`);
  }
  console.log('✅ Test 1 passed: Expiry and D-Day calculations');

  // Test 2: 분실물 상태 전이 평가 (STORED -> EXPIRED / CLAIMED 등)
  const itemStored: LostItem = {
    id: 'lf-1',
    itemCode: 'LF-202610-001',
    title: '애플워치 울트라',
    category: 'electronics',
    foundLocation: '남자 락커룸 32번',
    foundAt: '2026-10-01',
    storageLocation: '데스크 금고',
    retentionDays: 30, // 만료: 2026-10-31
    status: 'STORED',
  };

  // 2026-10-14 기준: 보관 중
  if (evaluateLostItemEffectiveStatus(itemStored, '2026-10-14') !== 'STORED') {
    throw new Error('Expected STORED on 2026-10-14');
  }

  // 2026-11-01 기준: 만료됨
  if (evaluateLostItemEffectiveStatus(itemStored, '2026-11-01') !== 'EXPIRED') {
    throw new Error('Expected EXPIRED on 2026-11-01');
  }

  // 이미 CLAIMED인 경우 날짜와 상관없이 CLAIMED 유지
  const itemClaimed: LostItem = {
    ...itemStored,
    status: 'CLAIMED',
  };
  if (evaluateLostItemEffectiveStatus(itemClaimed, '2026-11-10') !== 'CLAIMED') {
    throw new Error('Expected CLAIMED status to remain');
  }
  console.log('✅ Test 2 passed: Status evaluation and expiry transitions');

  // Test 3: 만료 임박(7일 이하) 필터
  const itemExpiringSoon: LostItem = {
    id: 'lf-2',
    itemCode: 'LF-202610-002',
    title: '나이키 메트콘 운동화',
    category: 'clothing',
    foundLocation: 'GX룸 앞 선반',
    foundAt: '2026-09-20',
    storageLocation: '보관함 B-3',
    retentionDays: 30, // 만료: 2026-10-20
    status: 'STORED',
  };

  const sampleItems = [itemStored, itemExpiringSoon, itemClaimed];
  // 2026-10-15 기준: itemExpiringSoon 만료일은 10-20으로 5일 남음 (<= 7일)
  // itemStored는 10-31로 16일 남음 (> 7일)
  const expiringItems = filterItemsExpiringSoon(sampleItems, 7, '2026-10-15');
  if (expiringItems.length !== 1 || expiringItems[0].id !== 'lf-2') {
    throw new Error(`Expected 1 expiring item (lf-2), got ${expiringItems.length}`);
  }
  console.log('✅ Test 3 passed: Filter expiring soon items');

  // Test 4: 분실물 종합 통계 요약
  const summary = summarizeLostAndFound(sampleItems, '2026-10-15');
  if (summary.totalCount !== 3) {
    throw new Error(`Expected total 3, got ${summary.totalCount}`);
  }
  if (summary.storedCount !== 2) {
    throw new Error(`Expected stored 2, got ${summary.storedCount}`);
  }
  if (summary.expiringSoonCount !== 1) {
    throw new Error(`Expected expiringSoon 1, got ${summary.expiringSoonCount}`);
  }
  if (summary.claimedCount !== 1) {
    throw new Error(`Expected claimed 1, got ${summary.claimedCount}`);
  }
  // 1/3 = 33.3%
  if (summary.claimRate !== 33.3) {
    throw new Error(`Expected claim rate 33.3%, got ${summary.claimRate}%`);
  }
  console.log('✅ Test 4 passed: Comprehensive statistics summary');

  console.log('🎉 All lostFoundEngine tests passed!');
}

runTests();
