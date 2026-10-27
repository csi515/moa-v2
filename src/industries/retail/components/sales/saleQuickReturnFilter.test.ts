import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface ReturnSearchTarget {
  id: string;
  totalAmount: number;
  customerName?: string | null;
  productSummaries: string[];
}

export function matchesReturnSearch(sale: ReturnSearchTarget, rawQuery: string): boolean {
  const raw = rawQuery.trim();
  if (!raw) return true;
  const q = raw.toLowerCase();
  const digitsOnly = raw.replace(/[^\d]/g, '');

  // 1. 종이 영수증 금액 기반 매칭 (23500, 23,500, 23500원)
  if (digitsOnly && String(Math.round(sale.totalAmount)).startsWith(digitsOnly)) {
    return true;
  }
  const formattedAmount = `${Math.round(sale.totalAmount).toLocaleString('ko-KR')}원`.toLowerCase();
  if (formattedAmount.includes(q)) return true;

  // 2. 판매번호, 고객명, 상품 요약 매칭
  const hay = [
    sale.id.toLowerCase(),
    sale.customerName?.toLowerCase() ?? '',
    ...sale.productSummaries.map((p) => p.toLowerCase()),
  ].join(' ');

  return hay.includes(q);
}

describe('Retail POS 스마트 영수증 반품 퀵 검색 엔진', () => {
  const dummySales: ReturnSearchTarget[] = [
    {
      id: 'SALE-20261025-001',
      totalAmount: 23500,
      customerName: '김철수',
      productSummaries: ['신라면 120g 5개', '코카콜라 1.5L 1개'],
    },
    {
      id: 'SALE-20261025-002',
      totalAmount: 8400,
      customerName: null,
      productSummaries: ['삼다수 2L 6개'],
    },
    {
      id: 'SALE-20261025-003',
      totalAmount: 120000,
      customerName: '이영희',
      productSummaries: ['고급 와인 1병'],
    },
  ];

  it('손님이 내민 영수증에 적힌 순수 숫자 금액(23500)으로 즉시 매칭된다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '23500'));
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, 'SALE-20261025-001');
  });

  it('금액에 콤마가 포함된 검색어(23,500)로도 일치 판정된다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '23,500'));
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, 'SALE-20261025-001');
  });

  it('금액 뒤에 "원"이 붙은 검색어(23500원)로도 일치 판정된다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '23500원'));
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, 'SALE-20261025-001');
  });

  it('고객 이름(이영희)으로 검색 시 해당 거래가 정확히 필터링된다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '이영희'));
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, 'SALE-20261025-003');
  });

  it('상품명 키워드(코카콜라)로 검색 시 해당 주문이 필터링된다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '코카콜라'));
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, 'SALE-20261025-001');
  });

  it('일치하지 않는 검색어에는 빈 배열을 반환한다', () => {
    const matched = dummySales.filter((s) => matchesReturnSearch(s, '999999'));
    assert.equal(matched.length, 0);
  });
});
