/**
 * 소모품/비품 안전재고 감지 및 간이 발주서(PO) 조립 엔진 (Pure Domain Functions)
 * 안전재고 미달 품목 실시간 감지, 공급처별 발주서 텍스트 조립 (Web Share API 지원)
 */

export interface RestockItem {
  id: string;
  itemName: string;
  category: string;
  currentQuantity: number;
  safetyThreshold: number;
  optimalOrderQuantity: number;
  unit: string;
  unitCost: number;
  vendorName: string;
  vendorContact?: string | null;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  orderQuantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
}

export interface GeneratedPurchaseOrder {
  poNumber: string;
  vendorName: string;
  vendorContact?: string;
  orderItems: PurchaseOrderItem[];
  totalAmount: number;
  orderSummaryText: string; // 카카오톡/문자 원터치 복사 및 공유용 텍스트
}

/**
 * 안전재고 이하로 떨어진 발주 필요 품목 자동 감지
 */
export function detectRestockNeeded(items: RestockItem[]): RestockItem[] {
  return items.filter((item) => item.currentQuantity <= item.safetyThreshold);
}

/**
 * 공급처(거래처)별로 발주 필요 품목 그룹화
 */
export function groupRestockItemsByVendor(items: RestockItem[]): Record<string, RestockItem[]> {
  const grouped: Record<string, RestockItem[]> = {};

  items.forEach((item) => {
    const vendor = item.vendorName || '기타 공급처';
    if (!grouped[vendor]) {
      grouped[vendor] = [];
    }
    grouped[vendor].push(item);
  });

  return grouped;
}

/**
 * 공급처별 간이 발주서(PO) 자동 조립 및 원터치 공유 텍스트 생성
 */
export function assemblePurchaseOrder(
  vendorName: string,
  items: RestockItem[],
  orgName: string = '우리 매장',
  sequenceNumber: number = 1
): GeneratedPurchaseOrder {
  const dateStr = new Date(Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
  const poNumber = `PO-${dateStr}-${String(sequenceNumber).padStart(3, '0')}`;

  let totalAmount = 0;
  const orderItems: PurchaseOrderItem[] = items.map((item) => {
    const subtotal = item.optimalOrderQuantity * item.unitCost;
    totalAmount += subtotal;

    return {
      itemId: item.id,
      itemName: item.itemName,
      orderQuantity: item.optimalOrderQuantity,
      unit: item.unit,
      unitCost: item.unitCost,
      subtotal,
    };
  });

  const vendorContact = items[0]?.vendorContact ?? undefined;

  // 원터치 문자/카카오톡 발송용 정갈한 텍스트 포맷
  const lines = [
    `[발주서] ${orgName} ➔ ${vendorName}`,
    `발주번호: ${poNumber}`,
    `발주일자: ${new Date(Date.now()).toISOString().slice(0, 10)}`,
    `-----------------------------`,
    ...orderItems.map(
      (i, idx) => `${idx + 1}. ${i.itemName} : ${i.orderQuantity}${i.unit} (${i.subtotal.toLocaleString()}원)`
    ),
    `-----------------------------`,
    `총 발주금액: ${totalAmount.toLocaleString()}원`,
    `확인 부탁드립니다. 감사합니다.`,
  ];

  return {
    poNumber,
    vendorName,
    vendorContact,
    orderItems,
    totalAmount,
    orderSummaryText: lines.join('\n'),
  };
}

export interface VendorQuoteItem {
  id: string;
  prId: string;
  vendorName: string;
  quotedAmount: number;
  leadTimeDays: number;
  isSelected: boolean;
  notes?: string;
}

/**
 * 복수 공급업체 견적 중 최적 견적 자동 판정 (단가 최저 우선, 동일 시 리드타임 최단 우선)
 */
export function evaluateOptimalVendorQuote(quotes: VendorQuoteItem[]): VendorQuoteItem | null {
  if (quotes.length === 0) return null;
  return [...quotes].sort((a, b) => {
    if (a.quotedAmount !== b.quotedAmount) {
      return a.quotedAmount - b.quotedAmount;
    }
    return a.leadTimeDays - b.leadTimeDays;
  })[0];
}
