import assert from 'node:assert/strict';
import {
  isPromotionActive,
  getPromotionStatus,
  resolveCurrentPrice,
  validatePromoDraft,
  calculateRemainingQuantity,
  type PromotionalDeal,
  type PromoDraft,
} from './promoEngine';

function run() {
  const basePromo: PromotionalDeal = {
    id: 'deal-001',
    tenant_id: 'tenant-abc',
    title: '봄맞이 필라테스 3개월권 한정 특가',
    target_type: 'PASS',
    target_id: 'pass-pilates-3m',
    original_price: 300000,
    special_price: 210000, // 30% 할인
    start_at: '2026-10-18T10:00:00Z',
    end_at: '2026-10-25T10:00:00Z',
    limited_quantity: 20,
    sold_quantity: 5,
    is_active: true,
  };

  // 1. 시작 전 대기 (UPCOMING)
  {
    const beforeStart = new Date('2026-10-18T09:59:59Z');
    assert.equal(isPromotionActive(basePromo, beforeStart), false);
    assert.equal(getPromotionStatus(basePromo, beforeStart), 'UPCOMING');

    const result = resolveCurrentPrice(basePromo.original_price, basePromo, beforeStart);
    assert.equal(result.currentPrice, 300000);
    assert.equal(result.isDiscounted, false);
    assert.equal(result.discountRate, 0);
    assert.equal(result.status, 'UPCOMING');
  }

  // 2. 진행 중 특가 적용 (ACTIVE)
  {
    const duringPromo = new Date('2026-10-20T12:00:00Z');
    assert.equal(isPromotionActive(basePromo, duringPromo), true);
    assert.equal(getPromotionStatus(basePromo, duringPromo), 'ACTIVE');

    const result = resolveCurrentPrice(basePromo.original_price, basePromo, duringPromo);
    assert.equal(result.currentPrice, 210000);
    assert.equal(result.isDiscounted, true);
    assert.equal(result.discountRate, 30); // 90000 / 300000 = 30%
    assert.equal(result.status, 'ACTIVE');
    assert.equal(result.activeDeal?.id, 'deal-001');
  }

  // 3. 기간 종료 후 정가 복귀 (EXPIRED)
  {
    const afterEnd = new Date('2026-10-25T10:00:01Z');
    assert.equal(isPromotionActive(basePromo, afterEnd), false);
    assert.equal(getPromotionStatus(basePromo, afterEnd), 'EXPIRED');

    const result = resolveCurrentPrice(basePromo.original_price, basePromo, afterEnd);
    assert.equal(result.currentPrice, 300000);
    assert.equal(result.isDiscounted, false);
    assert.equal(result.status, 'EXPIRED');
  }

  // 4. 한정 수량 완판 후 정가 복귀 (SOLD_OUT)
  {
    const soldOutPromo: PromotionalDeal = {
      ...basePromo,
      sold_quantity: 20, // 20 / 20 완판
    };
    const duringPromo = new Date('2026-10-20T12:00:00Z');
    assert.equal(isPromotionActive(soldOutPromo, duringPromo), false);
    assert.equal(getPromotionStatus(soldOutPromo, duringPromo), 'SOLD_OUT');

    const result = resolveCurrentPrice(soldOutPromo.original_price, soldOutPromo, duringPromo);
    assert.equal(result.currentPrice, 300000);
    assert.equal(result.isDiscounted, false);
    assert.equal(result.status, 'SOLD_OUT');
  }

  // 5. 사업주 조기 마감 (INACTIVE)
  {
    const closedPromo: PromotionalDeal = {
      ...basePromo,
      is_active: false,
    };
    const duringPromo = new Date('2026-10-20T12:00:00Z');
    assert.equal(isPromotionActive(closedPromo, duringPromo), false);
    assert.equal(getPromotionStatus(closedPromo, duringPromo), 'INACTIVE');

    const result = resolveCurrentPrice(closedPromo.original_price, closedPromo, duringPromo);
    assert.equal(result.currentPrice, 300000);
    assert.equal(result.isDiscounted, false);
    assert.equal(result.status, 'INACTIVE');
  }

  // 6. 특가 정책 없음 (NO_DEAL)
  {
    const result = resolveCurrentPrice(150000, null, new Date());
    assert.equal(result.currentPrice, 150000);
    assert.equal(result.isDiscounted, false);
    assert.equal(result.status, 'NO_DEAL');
  }

  // 7. validatePromoDraft 유효성 검증
  {
    const validDraft: PromoDraft = {
      title: '개점 1주년 전품목 20% 세일',
      target_type: 'RETAIL',
      target_id: 'item-yoga-mat',
      original_price: 50000,
      special_price: 40000,
      start_at: '2026-11-01T00:00:00Z',
      end_at: '2026-11-07T23:59:59Z',
      limited_quantity: 50,
    };
    assert.equal(validatePromoDraft(validDraft).isValid, true);

    // 제목 누락
    assert.equal(validatePromoDraft({ ...validDraft, title: '   ' }).isValid, false);

    // 잘못된 타겟 타입
    // @ts-expect-error 잘못된 타겟 타입 테스트
    assert.equal(validatePromoDraft({ ...validDraft, target_type: 'UNKNOWN' }).isValid, false);

    // 타겟 ID 누락
    assert.equal(validatePromoDraft({ ...validDraft, target_id: '' }).isValid, false);

    // 특가가 정가 초과
    assert.equal(validatePromoDraft({ ...validDraft, special_price: 60000 }).isValid, false);

    // 종료 일시가 시작 일시보다 앞섬
    assert.equal(
      validatePromoDraft({
        ...validDraft,
        start_at: '2026-11-10T00:00:00Z',
        end_at: '2026-11-01T00:00:00Z',
      }).isValid,
      false
    );

    // 한정 수량 0 이하
    assert.equal(validatePromoDraft({ ...validDraft, limited_quantity: 0 }).isValid, false);
  }

  // 8. calculateRemainingQuantity 잔여 수량 및 소진율 계산
  {
    // 무제한
    const unlimitedPromo: PromotionalDeal = {
      ...basePromo,
      limited_quantity: null,
      sold_quantity: 42,
    };
    const resUnlimited = calculateRemainingQuantity(unlimitedPromo);
    assert.equal(resUnlimited.remaining, null);
    assert.equal(resUnlimited.isSoldOut, false);
    assert.equal(resUnlimited.percentSold, 0);

    // 한정 수량 20개 중 5개 판매 (25% 소진)
    const resLimited = calculateRemainingQuantity(basePromo);
    assert.equal(resLimited.remaining, 15);
    assert.equal(resLimited.isSoldOut, false);
    assert.equal(resLimited.percentSold, 25);

    // 완판 (20개 중 20개 판매)
    const resSoldOut = calculateRemainingQuantity({ ...basePromo, sold_quantity: 20 });
    assert.equal(resSoldOut.remaining, 0);
    assert.equal(resSoldOut.isSoldOut, true);
    assert.equal(resSoldOut.percentSold, 100);
  }

  console.log('✅ promotional_deal promoEngine tests passed!');
}

run();
