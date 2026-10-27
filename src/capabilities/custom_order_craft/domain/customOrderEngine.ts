/**
 * 주문 제작 맞춤 사양서 및 단계별 공정 트래커 도메인 엔진 (Pure Functions)
 */

export type CraftStage =
  | 'ORDER_RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_INSPECTED'
  | 'READY_FOR_PICKUP'
  | 'FULFILLED';

export interface CustomCraftOrderRecord {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  item_title: string; // 예: "수제 레터링 2단 생화 케이크", "맞춤 원목 서재 테이블"
  spec_custom_text?: string; // 각인 문구, 레터링 텍스트
  spec_dimensions?: string; // 사이즈 (가로x세로x높이)
  spec_color_palette?: string; // 지정 색상/가죽톤
  total_price: number;
  down_payment_paid: number;
  balance_due: number;
  stage: CraftStage;
  target_delivery_date: string;
  created_at: string;
}

export function computeOrderPayments(
  totalPrice: number,
  downPaymentRate = 50
): { requiredDownPayment: number; balanceDue: number } {
  const requiredDownPayment = Math.round((totalPrice * downPaymentRate) / 100);
  const balanceDue = totalPrice - requiredDownPayment;
  return { requiredDownPayment, balanceDue };
}

export function advanceCraftStage(currentStage: CraftStage): { nextStage: CraftStage; isComplete: boolean } {
  switch (currentStage) {
    case 'ORDER_RECEIVED':
      return { nextStage: 'IN_PRODUCTION', isComplete: false };
    case 'IN_PRODUCTION':
      return { nextStage: 'QUALITY_INSPECTED', isComplete: false };
    case 'QUALITY_INSPECTED':
      return { nextStage: 'READY_FOR_PICKUP', isComplete: false };
    case 'READY_FOR_PICKUP':
      return { nextStage: 'FULFILLED', isComplete: true };
    case 'FULFILLED':
      return { nextStage: 'FULFILLED', isComplete: true };
  }
}

export function validateCustomOrderInput(
  customerName: string,
  itemTitle: string,
  totalPrice: number
): { isValid: boolean; error?: string } {
  if (!customerName || customerName.trim().length === 0) {
    return { isValid: false, error: '고객명을 입력해 주세요.' };
  }
  if (!itemTitle || itemTitle.trim().length === 0) {
    return { isValid: false, error: '주문 제작 품목명을 입력해 주세요.' };
  }
  if (totalPrice <= 0) {
    return { isValid: false, error: '주문 제작 금액은 0원보다 커야 합니다.' };
  }
  return { isValid: true };
}
