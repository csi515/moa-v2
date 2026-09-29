/**
 * TextbookSale ↔ Core Sale 연결·상태 분리 단위 테스트
 * 실행: npx tsx src/industries/piano/services/textbookCoreSaleLink.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildLinkedTextbookSaleIds,
  CORE_SALE_STATUSES,
  resolveTextbookCoreSaleId,
  TEXTBOOK_PAYMENT_STATUSES,
  toCoreSalePaymentMethod,
} from './textbookCoreSaleLink';

// ── Core Sale ↔ TextbookSale id 연결 ──────────────────────────────
{
  const linked = buildLinkedTextbookSaleIds('11111111-1111-4111-8111-111111111111');
  assert.equal(linked.id, linked.coreSaleId);
  assert.equal(
    resolveTextbookCoreSaleId({ id: linked.id, coreSaleId: linked.coreSaleId }),
    linked.coreSaleId
  );
}

// ── legacy fallback: coreSaleId 없으면 미연결 ─────────────────────
{
  assert.equal(
    resolveTextbookCoreSaleId({
      id: 'legacy-sale-id',
      coreSaleId: null,
    }),
    null
  );
  assert.equal(resolveTextbookCoreSaleId({ id: 'only-local' }), null);
}

// ── 납부상태 ≠ Core SaleStatus ────────────────────────────────────
{
  for (const s of TEXTBOOK_PAYMENT_STATUSES) {
    assert.ok(!(CORE_SALE_STATUSES as readonly string[]).includes(s));
  }
  for (const s of CORE_SALE_STATUSES) {
    assert.ok(!(TEXTBOOK_PAYMENT_STATUSES as readonly string[]).includes(s));
  }
}

// ── 무납/부분/전액 납부용 paymentMethod 매핑 ───────────────────────
{
  assert.equal(toCoreSalePaymentMethod(null), 'other'); // 무납
  assert.equal(toCoreSalePaymentMethod('card'), 'card'); // 전액·부분 현장
  assert.equal(toCoreSalePaymentMethod('cash'), 'cash');
  assert.equal(toCoreSalePaymentMethod('transfer'), 'transfer');
}

// ── Product 1:1 키 관례 (textbook.productId || textbook.id) ────────
{
  const textbookId = 'tb-1';
  const missingProductId: string | null | undefined = undefined;
  const explicitProductId: string | null | undefined = 'prod-x';
  assert.equal(missingProductId || textbookId, textbookId);
  assert.equal(explicitProductId || textbookId, 'prod-x');
}

console.log('textbookCoreSaleLink.test.ts: ok');
