import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIANO_INVOICE_BUNDLE_PRESETS,
  appendBundleItemToMemo,
  calculateBundledTotal,
} from './invoiceBundleHelpers';

describe('invoiceBundleHelpers', () => {
  it('피아노 대표 부대비용 프리셋 4종이 올바르게 정의되어 있어야 한다', () => {
    assert.equal(PIANO_INVOICE_BUNDLE_PRESETS.length, 4);
    assert.deepEqual(
      PIANO_INVOICE_BUNDLE_PRESETS.map((p) => p.amount),
      [15000, 18000, 30000, 50000]
    );
  });

  it('appendBundleItemToMemo: 빈 메모에 부대비용 항목을 올바르게 추가해야 한다', () => {
    const res = appendBundleItemToMemo('', '바이엘 교재비', 15000);
    assert.equal(res, '바이엘 교재비 (15,000원)');
  });

  it('appendBundleItemToMemo: 기존 메모가 있는 경우 쉼표로 연결해야 한다', () => {
    const res = appendBundleItemToMemo('11월 수강료', '체르니 교재비', 18000);
    assert.equal(res, '11월 수강료, 체르니 교재비 (18,000원)');
  });

  it('appendBundleItemToMemo: 이미 같은 항목이 포함되어 있으면 중복 추가하지 않아야 한다', () => {
    const init = '11월 수강료, 바이엘 교재 (15,000원)';
    const res = appendBundleItemToMemo(init, '바이엘 교재', 15000);
    assert.equal(res, init);
  });

  it('calculateBundledTotal: 기본 수강료와 부대비용을 정확히 합산해야 한다', () => {
    assert.equal(calculateBundledTotal(180000, [15000]), 195000);
    assert.equal(calculateBundledTotal(180000, [15000, 50000]), 245000);
    assert.equal(calculateBundledTotal(0, [18000]), 18000);
  });
});
