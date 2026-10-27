import assert from 'node:assert/strict';
import {
  applyStockMovement,
  checkSafetyStockWarning,
  generatePurchaseOrderRecommendations,
  convertPurchaseOrderToApInvoicePayload,
  deductBundleStock,
  scanBarcodeAndFindItem,
  calculateEan13CheckDigit,
  isValidEan13,
  generateItemBarcode,
  generatePrintLabelItems,
  formatLabelSheetPages,
  allocateStockLotsFefo,
  validateStockInLot,
  evaluateInventoryExpiryStatus,
  formatPickingLocation,
  calculateStockAuditDiscrepancy,
  createStockAuditSlip,
  type InventoryItem,
  type BundleProduct,
  type StockAuditItem,
} from './inventoryEngine';


function run() {
  const item: InventoryItem = {
    id: 'inv-1',
    name: '골프공 세트',
    sku: 'GOLF-BALL-01',
    currentStock: 20,
    safetyStock: 5,
    unitPrice: 15000,
  };

  // 1. 입고
  const inMovement = applyStockMovement(item, {
    itemId: 'inv-1',
    type: 'IN',
    quantity: 10,
    timestamp: '2026-06-01T10:00:00Z',
  });
  assert.equal(inMovement.success, true);
  assert.equal(inMovement.updatedItem.currentStock, 30);

  // 2. 출고
  const outMovement = applyStockMovement(inMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 26,
    timestamp: '2026-06-01T11:00:00Z',
  });
  assert.equal(outMovement.success, true);
  assert.equal(outMovement.updatedItem.currentStock, 4);

  // 3. 재고 부족 시 출고 차단
  const overOut = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 10,
    timestamp: '2026-06-01T12:00:00Z',
  });
  assert.equal(overOut.success, false);

  // 4. 안전재고 경고 판정 (현재고 4 <= 안전재고 5)
  const warn = checkSafetyStockWarning(outMovement.updatedItem);
  assert.equal(warn.isLowStock, true);
  assert.equal(warn.shortageQuantity, 1);

  // 5. 실사 조정
  const adjust = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'ADJUST',
    quantity: 15,
    timestamp: '2026-06-01T13:00:00Z',
  });
  assert.equal(adjust.success, true);
  assert.equal(adjust.updatedItem.currentStock, 15);
  assert.equal(checkSafetyStockWarning(adjust.updatedItem).isLowStock, false);

  // 6. 안전재고 미달 품목 기반 자동 발주서(Auto-PO) 권고 생성
  const inventoryList: InventoryItem[] = [
    {
      id: 'bean-1',
      name: '원두 1kg',
      sku: 'BEAN-01',
      currentStock: 2,
      safetyStock: 10,
      unitPrice: 25000,
      vendorId: 'vend-1',
      vendorName: '(주)대한원두',
      minOrderQuantity: 10, // MOQ 10
      packUnit: 5, // 5개 단위 포장
    },
    {
      id: 'milk-1',
      name: '우유 1L',
      sku: 'MILK-01',
      currentStock: 3,
      safetyStock: 15,
      unitPrice: 2600,
      vendorId: 'vend-1',
      vendorName: '(주)대한원두',
      minOrderQuantity: 10,
      packUnit: 6, // 1박스 6개 단위
    },
    {
      id: 'cup-1',
      name: '종이컵 1000개입',
      sku: 'CUP-01',
      currentStock: 20, // 정상 재고 (발주 대상 아님)
      safetyStock: 5,
      unitPrice: 30000,
      vendorId: 'vend-2',
      vendorName: '삼양패키징',
    },
  ];

  const poList = generatePurchaseOrderRecommendations(inventoryList, '2026-10-15');
  assert.equal(poList.length, 1, '부족 품목이 있는 vend-1에 대한 발주서 1건만 생성되어야 합니다.');

  const po = poList[0];
  assert.equal(po.vendorId, 'vend-1');
  assert.equal(po.items.length, 2);

  // 원두: 부족 8개, MOQ 10개, 5개 단위 배수 -> 10개 발주
  const beanPoItem = po.items.find((it) => it.sku === 'BEAN-01')!;
  assert.equal(beanPoItem.recommendedOrderQuantity, 10);
  assert.equal(beanPoItem.estimatedSupplyAmount, 250000);

  // 우유: 부족 12개, 6개 배수 -> 12개 발주
  const milkPoItem = po.items.find((it) => it.sku === 'MILK-01')!;
  assert.equal(milkPoItem.recommendedOrderQuantity, 12);
  assert.equal(milkPoItem.estimatedSupplyAmount, 31200);

  // 8. 번들 세트(조합형 SKU) 원자적 재고 동시 차감 테스트
  const bundleProduct: BundleProduct = {
    id: 'bundle-plant-kit',
    bundleSku: 'KIT-GARDEN-01',
    name: '화원 초보자 가드닝 세트',
    barcode: '8801234567890',
    sellingPrice: 45000,
    components: [
      { itemId: 'pot-1', componentSku: 'POT-CERAMIC', componentName: '도자기 화분', quantityPerBundle: 1 },
      { itemId: 'soil-1', componentSku: 'SOIL-5L', componentName: '배양토 5L', quantityPerBundle: 2 },
    ],
  };

  const gardenInventory: InventoryItem[] = [
    { id: 'pot-1', name: '도자기 화분', sku: 'POT-CERAMIC', barcode: '880001', currentStock: 10, safetyStock: 2, unitPrice: 12000 },
    { id: 'soil-1', name: '배양토 5L', sku: 'SOIL-5L', barcode: '880002', currentStock: 5, safetyStock: 2, unitPrice: 3000 },
  ];

  // 8-1. 세트 3개 판매 시도 -> 배양토가 6포 필요하지만 현재고 5포뿐이라 실패해야 함
  const overBundle = deductBundleStock({
    bundle: bundleProduct,
    sellQuantity: 3,
    currentInventory: gardenInventory,
  });
  assert.equal(overBundle.success, false);
  assert.equal(overBundle.shortages?.length, 1);
  assert.equal(overBundle.shortages?.[0].itemId, 'soil-1');
  assert.equal(overBundle.shortages?.[0].required, 6);

  // 8-2. 세트 2개 판매 -> 화분 2개, 배양토 4개 정상 차감
  const validBundle = deductBundleStock({
    bundle: bundleProduct,
    sellQuantity: 2,
    currentInventory: gardenInventory,
  });
  assert.equal(validBundle.success, true);
  const updatedPot = validBundle.updatedInventory.find((it) => it.id === 'pot-1')!;
  const updatedSoil = validBundle.updatedInventory.find((it) => it.id === 'soil-1')!;
  assert.equal(updatedPot.currentStock, 8); // 10 - 2
  assert.equal(updatedSoil.currentStock, 1); // 5 - 4

  // 9. 바코드 스캔 파싱 & 아이템/번들 즉시 매칭
  // 9-1. 단품 바코드 매칭
  const scanSingle = scanBarcodeAndFindItem({
    barcodeRaw: '880001\n',
    items: gardenInventory,
    bundles: [bundleProduct],
  });
  assert.equal(scanSingle.success, true);
  assert.equal(scanSingle.foundType, 'single');
  assert.equal(scanSingle.item?.id, 'pot-1');

  // 9-2. 번들 바코드 매칭
  const scanBundle = scanBarcodeAndFindItem({
    barcodeRaw: '8801234567890',
    items: gardenInventory,
    bundles: [bundleProduct],
  });
  assert.equal(scanBundle.success, true);
  assert.equal(scanBundle.foundType, 'bundle');
  assert.equal(scanBundle.bundle?.id, 'bundle-plant-kit');

  // 10. EAN-13 체크섬 계산 및 유효성 검증
  const sample12 = '880123456789';
  const checkDigit = calculateEan13CheckDigit(sample12);
  assert.equal(typeof checkDigit, 'number');
  assert.equal(checkDigit >= 0 && checkDigit <= 9, true);

  const fullBarcode = `${sample12}${checkDigit}`;
  assert.equal(isValidEan13(fullBarcode), true);
  assert.equal(isValidEan13('8801234567899' === fullBarcode ? '8801234567890' : '8801234567899'), false);

  // 11. 자동 채번 함수 generateItemBarcode
  const generated1 = generateItemBarcode('ORG-SEOUL', 1);
  assert.equal(generated1.length, 13);
  assert.equal(generated1.startsWith('880'), true);
  assert.equal(isValidEan13(generated1), true);

  const generated2 = generateItemBarcode('ORG-SEOUL', 2);
  assert.equal(generated2.length, 13);
  assert.notEqual(generated1, generated2);
  assert.equal(isValidEan13(generated2), true);

  // 12. 라벨 인쇄 아이템 생성 및 시트 페이지 분할
  const printItem: InventoryItem = {
    id: 'item-coffee-01',
    name: '에티오피아 예가체프 원두 200g',
    sku: 'COFFEE-ETH-01',
    barcode: generated1,
    currentStock: 50,
    safetyStock: 10,
    unitPrice: 18000,
    vendorName: '모아 로스터리',
  };

  const labels = generatePrintLabelItems({
    item: printItem,
    quantity: 50,
  });
  assert.equal(labels.length, 50);
  assert.equal(labels[0].barcode, generated1);
  assert.equal(labels[0].printSequence, 1);
  assert.equal(labels[49].printSequence, 50);
  assert.equal(labels[0].qrCodeValue, `https://moa.app/i/${generated1}`);

  // A4 24칸 분할 (50장 = 24 + 24 + 2 = 3페이지)
  const a4Pages = formatLabelSheetPages(labels, 'A4_24_FORMTEC');
  assert.equal(a4Pages.length, 3);
  assert.equal(a4Pages[0].length, 24);
  assert.equal(a4Pages[1].length, 24);
  assert.equal(a4Pages[2].length, 2);

  // 감열식 라벨프린터 분할 (50장 = 50페이지)
  const thermalPages = formatLabelSheetPages(labels, 'THERMAL_50_30');
  assert.equal(thermalPages.length, 50);
  assert.equal(thermalPages[0].length, 1);

  // 13. 유효기간 우선 출고(FEFO) 로트 자동 배분 검증
  const lots = [
    { id: 'l1', itemId: 'item-1', lotNumber: 'LOT-2026-A', expiryDate: '2026-10-30', quantity: 10 },
    { id: 'l2', itemId: 'item-1', lotNumber: 'LOT-2026-B', expiryDate: '2026-08-15', quantity: 15 }, // 가장 빠른 유효기간
    { id: 'l3', itemId: 'item-1', lotNumber: 'LOT-2026-C', expiryDate: '2026-12-31', quantity: 20 },
  ];

  // 20개 출고 요청 시: LOT-2026-B에서 15개 전량 소진, LOT-2026-A에서 5개 소진
  const fefoRes = allocateStockLotsFefo(lots, 20);
  assert.equal(fefoRes.isFullyAllocated, true);
  assert.equal(fefoRes.totalAllocated, 20);
  assert.equal(fefoRes.allocatedLots.length, 2);
  assert.equal(fefoRes.allocatedLots[0].lotNumber, 'LOT-2026-B');
  assert.equal(fefoRes.allocatedLots[0].allocatedQuantity, 15);
  assert.equal(fefoRes.allocatedLots[1].lotNumber, 'LOT-2026-A');
  assert.equal(fefoRes.allocatedLots[1].allocatedQuantity, 5);

  // 14. 입고 시 로트 번호 및 유효기간 필수 검증
  const invalidLot1 = validateStockInLot({
    lotNumber: '',
    expiryDate: '2026-12-31',
    quantity: 10,
  });
  assert.equal(invalidLot1.isValid, false);
  assert.match(invalidLot1.error || '', /로트 번호/);

  const invalidLot2 = validateStockInLot({
    lotNumber: 'LOT-999',
    expiryDate: 'invalid-date',
    quantity: 10,
  });
  assert.equal(invalidLot2.isValid, false);
  assert.match(invalidLot2.error || '', /유효기간/);

  const validLot = validateStockInLot({
    lotNumber: 'LOT-2026-X1',
    expiryDate: '2027-01-31',
    quantity: 50,
  });
  assert.equal(validLot.isValid, true);

  // 15. 유효기간 임박/만료 상태 판정 검증
  const refDate = '2026-10-18';
  assert.equal(evaluateInventoryExpiryStatus('2026-10-15', refDate), 'EXPIRED'); // 이미 만료
  assert.equal(evaluateInventoryExpiryStatus('2026-10-18', refDate), 'EXPIRED'); // 당일 만료
  assert.equal(evaluateInventoryExpiryStatus('2026-10-22', refDate), 'CRITICAL_7_DAYS'); // 4일 남음
  assert.equal(evaluateInventoryExpiryStatus('2026-11-05', refDate), 'WARNING_30_DAYS'); // 18일 남음
  assert.equal(evaluateInventoryExpiryStatus('2026-12-31', refDate), 'NORMAL'); // 74일 남음

  // 16. 물리적 랙/빈 위치 및 정기 재고 실사 대사표/감모 전표 생성 검증
  const locStr = formatPickingLocation({ zoneId: 'ZONE-A', rackNo: 'RACK-02', binNo: 'BIN-08' });
  assert.equal(locStr, 'ZONE-A / RACK-02 / BIN-08');

  const auditItems: StockAuditItem[] = [
    { itemId: 'item-1', itemName: '에스프레소 원두', sku: 'COF-01', bookQuantity: 50, actualQuantity: 50, unitPrice: 20000 },
    { itemId: 'item-2', itemName: '생크림 1L', sku: 'DAIRY-01', bookQuantity: 20, actualQuantity: 15, unitPrice: 8000 }, // 5개 부족 (감모 40,000원)
    { itemId: 'item-3', itemName: '바닐라 시럽', sku: 'SYR-01', bookQuantity: 10, actualQuantity: 12, unitPrice: 15000 }, // 2개 초과 (잉여 30,000원)
    { itemId: 'item-4', itemName: '고급 와규 패티', sku: 'MEAT-01', bookQuantity: 30, actualQuantity: 20, unitPrice: 25000 }, // 10개 부족 (감모 250,000원)
  ];

  const auditAnalysis = calculateStockAuditDiscrepancy(auditItems);
  assert.equal(auditAnalysis.hasDiscrepancies, true);
  assert.equal(auditAnalysis.totalShortageAmount, 290000); // 4만 + 25만
  assert.equal(auditAnalysis.totalSurplusAmount, 30000); // 3만
  assert.equal(auditAnalysis.netVarianceAmount, -260000);

  // 감모손실 29만 원으로 10만 원 초과 -> 승인 특약 필요(approvalRequired: true)
  const auditSlip = createStockAuditSlip('AUDIT-2026-Q4', auditAnalysis.discrepancies, '홍길동 점장', {
    auditDate: '2026-10-18',
    approvalThreshold: 100000,
  });
  assert.equal(auditSlip.approvalRequired, true);
  assert.equal(auditSlip.totalShortageAmount, 290000);
  assert.equal(auditSlip.status, 'DRAFT');
  assert.match(auditSlip.slipNumber, /AUDIT-SLIP-20261018/);

  // 17. itemType 및 JSONB 메타데이터(교재 등) 지원 검증
  const textbookItem: InventoryItem = {
    id: 'bk-1',
    name: '체르니 30',
    sku: 'BK-CZERNY-30',
    itemType: 'textbook',
    currentStock: 12,
    safetyStock: 3,
    unitPrice: 10000,
    metadata: { publisher: '세광', level: '체르니 30', author: 'Czerny' },
  };
  assert.equal(textbookItem.itemType, 'textbook');
  assert.equal(textbookItem.metadata?.publisher, '세광');

  console.log('inventoryEngine.test.ts: ok (with Auto-PO, Bundle, Barcode Gen, Label Print, FEFO Lot, Expiry & Stock Audit)');
}

run();

