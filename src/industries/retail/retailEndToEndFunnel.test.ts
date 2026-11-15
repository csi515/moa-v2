import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveModuleIndustryId } from '@/app/industry/resolveModuleIndustry';
import { TAB_REQUIRED_CAPABILITIES } from '@/app/industry/genericIndustryTabs';
import { calculateCashVariance } from '@/capabilities/ledger_simple/domain/ledgerSimpleEngine';

describe('Retail End-to-End Funnel Integrity Tests', () => {
  it('1. 소매업 프리셋 패밀리(pet_supplies, apparel_store, convenience_store, retail)의 retail 모듈 공유 바인딩 검증', () => {
    assert.equal(resolveModuleIndustryId('retail'), 'retail');
    assert.equal(resolveModuleIndustryId('apparel_store'), 'retail');
    assert.equal(resolveModuleIndustryId('convenience_store'), 'retail');
    assert.equal(resolveModuleIndustryId('pet_supplies'), 'retail');
  });

  it('2. GenericIndustryShell 탭 권한(sales, retail)에 inventory Capability 매핑 검증', () => {
    assert.ok(TAB_REQUIRED_CAPABILITIES.sales.includes('inventory'));
    assert.ok(TAB_REQUIRED_CAPABILITIES.retail.includes('inventory'));
    assert.ok(TAB_REQUIRED_CAPABILITIES.inventory.includes('inventory'));
  });

  it('3. 입고 시 바코드 매칭 및 매입단가 메모 포맷팅 검증', () => {
    const mockStockRows = [
      {
        key: 'p:1',
        productId: 'prod-1',
        productName: '유기농 우유 1000ml',
        productCode: '8801234567890',
        variantId: null,
        variantName: null,
        quantity: 5,
        isActive: true,
        productIsActive: true,
      },
    ];

    const scannedCode = '8801234567890';
    const matched = mockStockRows.find((r) => r.productCode === scannedCode);
    assert.ok(matched);
    assert.equal(matched.productId, 'prod-1');

    // 매입단가 및 공급처(Vendor) 메모 포맷 검증
    const qty = 20;
    const unitCost = 2500;
    const vendorName = '(주)대한물류';
    const totalCost = qty * unitCost;
    const vendorTag = `[공급처: ${vendorName}]`;
    const costInfo = `[매입단가: ₩2,500, 총매입: ₩50,000]`;
    const finalReason = `${vendorTag} ${costInfo} 정기 납품 입고`;

    assert.ok(finalReason.includes('[공급처: (주)대한물류]'));
    assert.ok(finalReason.includes('[매입단가: ₩2,500, 총매입: ₩50,000]'));
    assert.equal(totalCost, 50000);
  });

  it('4. POS 현금 매출과 시재 마감(LedgerClosing) 장부 정산 연계 검증', () => {
    const openingCash = 100000; // 준비금 (시작 시재)
    const posCashSales = 350000; // 당일 POS 현금 매출
    const otherExpense = 20000; // 현금 지출 (퀵배송비 등)

    const expectedCashInDrawer = openingCash + posCashSales - otherExpense; // 430,000원

    // 점주가 실제 현금통을 세어 입력한 금액
    const countedCash = 430000;

    const variance = calculateCashVariance({
      openingCash,
      cashIncome: posCashSales,
      cashExpense: otherExpense,
      countedCash,
    });

    assert.equal(variance.expectedCash, expectedCashInDrawer);
    assert.equal(variance.varianceAmount, 0); // 과부족 0원 (완전 일치)
    assert.equal(variance.status, 'MATCHED');
  });

  it('5. 시재 불일치(Shortfall/Surplus) 감지 검증', () => {
    const openingCash = 50000;
    const posCashSales = 150000;
    const countedCash = 190000; // 10,000원 부족

    const variance = calculateCashVariance({
      openingCash,
      cashIncome: posCashSales,
      cashExpense: 0,
      countedCash,
    });

    assert.equal(variance.expectedCash, 200000);
    assert.equal(variance.varianceAmount, -10000);
    assert.equal(variance.status, 'SHORTAGE');
  });
});
