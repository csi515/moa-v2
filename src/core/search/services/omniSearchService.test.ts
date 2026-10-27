import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  searchOmni,
  filterMockOmniResults,
} from './omniSearchService';

describe('OmniSearch Engine Service (Phase 5)', () => {
  it('빈 검색어인 경우 빈 결과를 즉시 반환한다', async () => {
    const res = await searchOmni('org-test', '');
    assert.equal(res.length, 0);

    const resSpaces = await searchOmni('org-test', '   ');
    assert.equal(resSpaces.length, 0);
  });

  it('오프라인/폴백 환경에서 고객, 상품, 사규를 다형성 통합 검색한다', async () => {
    // 1. 고객명 검색
    const customerHit = filterMockOmniResults('모아');
    assert.ok(customerHit.length >= 1);
    assert.equal(customerHit[0].category, 'customer');
    assert.equal(customerHit[0].title, '김모아');

    // 2. 상품명 검색
    const productHit = filterMockOmniResults('원두');
    assert.ok(productHit.length >= 1);
    assert.equal(productHit[0].category, 'product');
    assert.ok(productHit[0].title.includes('에스프레소 원두'));

    // 3. 사규/규정 검색
    const policyHit = filterMockOmniResults('복무');
    assert.ok(policyHit.length >= 1);
    assert.equal(policyHit[0].category, 'policy');
    assert.ok(policyHit[0].title.includes('복무 규정'));
  });

  it('모의 Supabase 클라이언트가 주어지면 다중 테이블 쿼리를 수행하여 병합한다', async () => {
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              limit: async () => {
                if (table === 'customers') {
                  return { data: [{ id: 'c-10', name: '테스트고객', phone: '010-0000-0000' }] };
                }
                if (table === 'products') {
                  return { data: [{ id: 'p-10', name: '테스트상품', sku: 'SKU-10', price: 15000 }] };
                }
                return { data: [] };
              },
            }),
          }),
        }),
      }),
    };

    const results = await searchOmni('org-123', '테스트', mockSupabase);
    assert.equal(results.length, 2);
    assert.equal(results[0].category, 'customer');
    assert.equal(results[0].title, '테스트고객');
    assert.equal(results[1].category, 'product');
    assert.equal(results[1].title, '테스트상품');
  });
});
