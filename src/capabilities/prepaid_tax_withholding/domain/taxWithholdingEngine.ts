/**
 * 강사·프리랜서 3.3% 사업소득세 원천징수 원장 도메인 엔진 (Pure Functions)
 */

export interface WithholdingTaxRecord {
  id: string;
  tenant_id: string;
  freelancer_id: string;
  freelancer_name: string;
  resident_number_masked?: string;
  payment_month: string; // "YYYY-MM"
  gross_pay: number; // 지급 총액 (세전)
  income_tax: number; // 소득세 (3.0% 원단위 절사)
  local_tax: number; // 지방소득세 (소득세의 10% 원단위 절사)
  total_tax: number; // 총 원천세액 (3.3%)
  net_pay: number; // 실지급액 (차인지급액)
  paid_at?: string;
  is_remitted: boolean; // 세무서 납부 완료 여부
}

export function calculateWithholdingTax(
  grossPay: number,
  incomeTaxRate = 0.03,
  localTaxRate = 0.003
): { incomeTax: number; localTax: number; totalTax: number; netPay: number } {
  if (grossPay <= 0) {
    return { incomeTax: 0, localTax: 0, totalTax: 0, netPay: 0 };
  }

  // 10원 단위 절사 (국세청 원천징수 계산 규정)
  const rawIncomeTax = grossPay * incomeTaxRate;
  const incomeTax = Math.floor(rawIncomeTax / 10) * 10;

  const rawLocalTax = incomeTax * 0.1;
  const localTax = Math.floor(rawLocalTax / 10) * 10;

  const totalTax = incomeTax + localTax;
  const netPay = grossPay - totalTax;

  return { incomeTax, localTax, totalTax, netPay };
}

export function validatePaymentInput(
  name: string,
  grossPay: number,
  paymentMonth: string
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '프리랜서/강사 성명을 입력해 주세요.' };
  }
  if (grossPay <= 0) {
    return { isValid: false, error: '세전 지급액은 0원보다 커야 합니다.' };
  }
  if (!paymentMonth || !/^\d{4}-\d{2}$/.test(paymentMonth)) {
    return { isValid: false, error: '지급 연월(YYYY-MM)을 올바르게 선택해 주세요.' };
  }
  return { isValid: true };
}
