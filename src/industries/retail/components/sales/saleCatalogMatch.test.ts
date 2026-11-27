import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchCatalogItem } from './saleCatalogMatch';
import type { SaleCatalogItem } from '../../types/sale';

const mockCatalog: SaleCatalogItem[] = [
  {
    key: 'p:prod-1',
    productId: 'prod-1',
    productName: '아메리카노',
    productCode: '8801234567890',
    variantId: null,
    variantName: null,
    unitPrice: 3500,
  },
  {
    key: 'v:var-red-m',
    productId: 'prod-2',
    productName: '모아 오가닉 티셔츠',
    productCode: 'TSHIRT-001',
    variantId: 'var-red-m',
    variantName: 'Red / M',
    unitPrice: 29000,
  },
  {
    key: 'v:var-blue-l',
    productId: 'prod-2',
    productName: '모아 오가닉 티셔츠',
    productCode: 'TSHIRT-001',
    variantId: 'var-blue-l',
    variantName: 'Blue / L',
    unitPrice: 29000,
  },
];

test('matchCatalogItem: 1D 바코드 번호 완전 일치 매칭', () => {
  const matched = matchCatalogItem('8801234567890', mockCatalog);
  assert.ok(matched);
  assert.equal(matched.productId, 'prod-1');
  assert.equal(matched.unitPrice, 3500);
});

test('matchCatalogItem: v: 접두사 QR key 매칭', () => {
  const matched = matchCatalogItem('v:var-red-m', mockCatalog);
  assert.ok(matched);
  assert.equal(matched.variantId, 'var-red-m');
  assert.equal(matched.variantName, 'Red / M');
});

test('matchCatalogItem: variantId 단독 매칭', () => {
  const matched = matchCatalogItem('var-blue-l', mockCatalog);
  assert.ok(matched);
  assert.equal(matched.variantId, 'var-blue-l');
});

test('matchCatalogItem: URL 파라미터형 QR 매칭', () => {
  const matched = matchCatalogItem('https://moa.app/pos?code=8801234567890', mockCatalog);
  assert.ok(matched);
  assert.equal(matched.productId, 'prod-1');
});

test('matchCatalogItem: 미등록 바코드는 null 반환', () => {
  const matched = matchCatalogItem('9999999999999', mockCatalog);
  assert.equal(matched, null);
});
