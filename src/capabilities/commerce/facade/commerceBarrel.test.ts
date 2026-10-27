/**
 * Commerce 배럴이 capability SoT를 재export하고, Retail은 Commerce facade를 가리키는지 확인.
 * 실행: npm run test:commerce-barrel
 *
 * 서비스 모듈을 로드하지 않는다 (tsx에서 import.meta.env 미주입).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSaleNumber } from './sale/saleQuery';
import {
  buildCommerceRevenueSummary,
  buildRetailRevenueSummary,
} from './sale/revenueAggregate';
import { SALE_PAYMENT_METHODS } from '@/capabilities/commerce/saleLedger/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const productBarrel = readSrc('src/capabilities/commerce/facade/product/index.ts');
assert.match(productBarrel, /from '@\/capabilities\/commerce\/catalog'/);
assert.doesNotMatch(productBarrel, /from '@\/core\/product'/);
assert.doesNotMatch(productBarrel, /from '@\/modules\//);

const inventoryBarrel = readSrc('src/capabilities/commerce/facade/inventory/index.ts');
assert.match(inventoryBarrel, /from '@\/capabilities\/commerce\/stock'/);
assert.match(inventoryBarrel, /callApplyStockMovement/);
assert.doesNotMatch(inventoryBarrel, /from '@\/core\/inventory'/);
assert.doesNotMatch(inventoryBarrel, /from '@\/modules\//);

const saleBarrel = readSrc('src/capabilities/commerce/facade/sale/index.ts');
assert.match(saleBarrel, /from '@\/capabilities\/commerce\/saleLedger'/);
assert.match(saleBarrel, /saleHistoryService/);
assert.match(saleBarrel, /customerPurchaseService/);
assert.match(saleBarrel, /revenueService/);
assert.doesNotMatch(saleBarrel, /pointEarnService/);
assert.doesNotMatch(saleBarrel, /from '@\/core\/sales'/);

const returnBarrel = readSrc('src/capabilities/commerce/facade/return/index.ts');
assert.match(returnBarrel, /from '@\/capabilities\/commerce\/saleLedger'/);
assert.match(returnBarrel, /saleReturnService/);
assert.doesNotMatch(returnBarrel, /pointReturnService/);
assert.doesNotMatch(returnBarrel, /from '@\/core\/sales'/);

const paymentBarrel = readSrc('src/capabilities/commerce/facade/payment/index.ts');
assert.match(paymentBarrel, /SALE_PAYMENT_METHODS/);
assert.match(paymentBarrel, /from '@\/capabilities\/commerce\/saleLedger'/);
assert.doesNotMatch(paymentBarrel, /from '@\/core\/sales'/);

const commerceIndex = readSrc('src/capabilities/commerce/facade/index.ts');
assert.match(commerceIndex, /productService/);
assert.match(commerceIndex, /inventoryService/);
assert.match(commerceIndex, /saleService/);
assert.match(commerceIndex, /saleReturnService/);
assert.match(commerceIndex, /SALE_PAYMENT_METHODS/);
assert.match(commerceIndex, /storeCapability/);
assert.doesNotMatch(commerceIndex, /from '@\/modules\//);

const commerceRoot = readSrc('src/capabilities/commerce/index.ts');
assert.match(commerceRoot, /commerceCapability/);
assert.match(commerceRoot, /from '\.\/facade'/);
assert.match(commerceRoot, /from '\.\/loyalty'/);
assert.doesNotMatch(commerceRoot, /createCommerceCapabilityStorage/);
assert.doesNotMatch(commerceRoot, /from '@\/modules\//);

assert.match(
  readSrc('src/industries/retail/services/productService.ts'),
  /from '@\/capabilities\/commerce'/
);
assert.match(
  readSrc('src/industries/retail/services/inventoryService.ts'),
  /from '@\/capabilities\/commerce'/
);
assert.match(
  readSrc('src/industries/retail/services/saleHistoryService.ts'),
  /from '@\/capabilities\/commerce'/
);
assert.match(
  readSrc('src/industries/retail/services/customerPurchaseService.ts'),
  /from '@\/capabilities\/commerce'/
);
assert.match(
  readSrc('src/industries/retail/services/retailRevenueService.ts'),
  /from '@\/capabilities\/commerce'/
);
assert.match(
  readSrc('src/industries/retail/services/retailRevenueAggregate.ts'),
  /from '@\/capabilities\/commerce'/
);

const retailSale = readSrc('src/industries/retail/services/saleService.ts');
assert.match(retailSale, /from '@\/capabilities\/commerce'/);
assert.match(retailSale, /pointEarnService\.earnForSale/);
assert.doesNotMatch(retailSale, /from '@\/core\/sales'/);
assert.doesNotMatch(retailSale, /from '@\/core\/commerce/);
assert.doesNotMatch(retailSale, /pointRedeemService/);

const retailReturn = readSrc('src/industries/retail/services/saleReturnService.ts');
assert.match(retailReturn, /from '@\/capabilities\/commerce'/);
assert.match(retailReturn, /pointReturnService\.reverseForSaleReturn/);
assert.doesNotMatch(retailReturn, /from '@\/core\/sales'/);
assert.doesNotMatch(retailReturn, /from '@\/core\/commerce/);

const retailServiceAndTypeFiles = [
  'src/industries/retail/services/productService.ts',
  'src/industries/retail/services/inventoryService.ts',
  'src/industries/retail/services/saleService.ts',
  'src/industries/retail/services/saleReturnService.ts',
  'src/industries/retail/services/saleHistoryService.ts',
  'src/industries/retail/services/customerPurchaseService.ts',
  'src/industries/retail/services/retailRevenueService.ts',
  'src/industries/retail/services/retailRevenueAggregate.ts',
  'src/industries/retail/types/product.ts',
  'src/industries/retail/types/inventory.ts',
  'src/industries/retail/types/sale.ts',
  'src/industries/retail/types/saleReturn.ts',
  'src/industries/retail/types/revenue.ts',
];
for (const rel of retailServiceAndTypeFiles) {
  const src = readSrc(rel);
  assert.doesNotMatch(
    src,
    /from '@\/core\/(product|inventory|sales|loyalty)(?:\/[^']*)?'/,
    `${rel} must depend on @/capabilities/commerce, not Core product/inventory/sales/loyalty`
  );
  assert.doesNotMatch(
    src,
    /from '@\/core\/commerce(?:\/[^']*)?'/,
    `${rel} must use @/capabilities/commerce, not @/core/commerce`
  );
}

assert.ok(SALE_PAYMENT_METHODS.includes('cash'));
assert.equal(formatSaleNumber('aabbccdd-1111-2222-3333-444444444444'), 'AABBCCDD');
assert.equal(buildRetailRevenueSummary, buildCommerceRevenueSummary);

console.log('commerceBarrel.test.ts: ok');
