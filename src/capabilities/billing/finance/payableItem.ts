/**
 * Moa-v2 Polymorphic Payable Item Abstraction
 * 
 * 헌법 및 아키텍처 규칙:
 * - 수납(Billing) 기능이 피아노 학원의 '교재(Textbook)'에만 종속되지 않고,
 *   수강권(Pass), 리테일 상품(Retail Item), 서비스 이용료(Service) 등
 *   다양한 업종의 유상 품목을 결합 결제할 수 있도록 다형적 품목(PayableItem)으로 추상화합니다.
 */

export type PayableItemType = 'tuition' | 'retail_item' | 'pass' | 'service';

export interface PayableItem {
  id: string;
  type: PayableItemType;
  title: string;
  amount: number;
  quantity?: number;
  metadata?: Record<string, unknown>;
}

export interface UnifiedPaymentRequest {
  organizationId: string;
  customerId: string;
  items: PayableItem[];
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other' | 'onsite_card' | 'local_currency';
  paidAt?: string;
  memo?: string;
  cashReceiptIssued?: boolean;
}

/**
 * 범용 PayableItem 배열을 레거시 RPC(record_combined_payment) 인자로 분배/매핑
 */
export function partitionPayableItems(items: PayableItem[]): {
  tuitionItemIds: string[];
  retailItemIds: string[];
} {
  const tuitionItemIds: string[] = [];
  const retailItemIds: string[] = [];

  for (const item of items) {
    if (item.type === 'tuition' || item.type === 'pass') {
      tuitionItemIds.push(item.id);
    } else {
      retailItemIds.push(item.id);
    }
  }

  return { tuitionItemIds, retailItemIds };
}
