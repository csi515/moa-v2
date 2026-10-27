import {
  PortfolioStyleItem,
  calculateStyleQuotation,
  filterPortfolio,
} from './treatmentPortfolioEngine';

function runTests() {
  console.log('--- Testing treatmentPortfolioEngine ---');

  // Test 1: 스타일 기본가 + 업셀링 옵션 합산 견적
  const buildPerm: PortfolioStyleItem = {
    id: 'style-1',
    title: '시그니처 빌드펌 & 사이드뱅',
    category: 'hair_perm',
    designerName: '차홍 실장',
    basePrice: 180000,
    estimatedMinutes: 120,
    description: '자연스러운 C컬과 S컬의 조화',
    upsellOptions: [
      {
        id: 'opt-clinic',
        name: '단백질 수분 영양 케어',
        price: 40000,
        additionalMinutes: 20,
      },
      {
        id: 'opt-scalp',
        name: '두피 쿨링 스파',
        price: 30000,
        additionalMinutes: 15,
      },
    ],
  };

  // 단백질 클리닉만 추가 선택 시
  const quote1 = calculateStyleQuotation(buildPerm, ['opt-clinic']);
  if (quote1.totalUpsellAmount !== 40000) {
    throw new Error(`Expected upsell 40,000, got ${quote1.totalUpsellAmount}`);
  }
  if (quote1.finalEstimatedPrice !== 220000) {
    throw new Error(`Expected total 220,000, got ${quote1.finalEstimatedPrice}`);
  }
  if (quote1.totalEstimatedMinutes !== 140) {
    throw new Error(`Expected 140 minutes, got ${quote1.totalEstimatedMinutes}`);
  }
  console.log('✅ Test 1 passed: Single upsell quotation calculation');

  // 2가지 옵션 모두 추가 선택 시
  const quote2 = calculateStyleQuotation(buildPerm, ['opt-clinic', 'opt-scalp']);
  if (quote2.totalUpsellAmount !== 70000) {
    throw new Error(`Expected upsell 70,000, got ${quote2.totalUpsellAmount}`);
  }
  if (quote2.finalEstimatedPrice !== 250000) {
    throw new Error(`Expected total 250,000, got ${quote2.finalEstimatedPrice}`);
  }
  if (quote2.totalEstimatedMinutes !== 155) {
    throw new Error(`Expected 155 minutes, got ${quote2.totalEstimatedMinutes}`);
  }
  console.log('✅ Test 2 passed: Multiple upsell options calculation');

  // Test 3: 카테고리 필터링
  const nailArt: PortfolioStyleItem = {
    id: 'style-2',
    title: '자석 젤 그라데이션 아트',
    category: 'nail_art',
    designerName: '유리 실장',
    basePrice: 70000,
    estimatedMinutes: 60,
    description: '오묘한 펄감의 자석 젤네일',
    upsellOptions: [],
  };

  const filtered = filterPortfolio([buildPerm, nailArt], 'nail_art');
  if (filtered.length !== 1 || filtered[0].id !== 'style-2') {
    throw new Error('Expected 1 nail art item');
  }
  console.log('✅ Test 3 passed: Portfolio category filtering');

  console.log('🎉 All treatmentPortfolioEngine tests passed!');
}

runTests();
