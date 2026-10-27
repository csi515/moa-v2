/**
 * 사내 소모품 자율 불출 및 부서별 비용 배부 도메인 엔진 (Pure Functions)
 */

export interface ConsumableItem {
  id: string;
  name: string; // 예: "복사용지 A4 (Box)", "원두커피 (1kg)", "소독용 에탄올"
  unit: string;
  unit_cost: number;
}

export interface ConsumableDispenseRecord {
  id: string;
  tenant_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  department: string; // 예: "입시수학부", "피트니스 코치진", "운영지원팀"
  staff_name: string;
  dispensed_at: string;
}

export function computeDispenseCost(unitCost: number, quantity: number): number {
  return Math.max(0, unitCost * quantity);
}

export function isBudgetExceeded(
  currentMonthSpent: number,
  additionalCost: number,
  monthlyBudgetCap: number
): boolean {
  return currentMonthSpent + additionalCost > monthlyBudgetCap;
}

export function validateDispenseInput(
  itemName: string,
  quantity: number,
  department: string,
  staffName: string
): { isValid: boolean; error?: string } {
  if (!itemName || itemName.trim().length === 0) {
    return { isValid: false, error: '소모품명을 입력해 주세요.' };
  }
  if (quantity <= 0) {
    return { isValid: false, error: '불출 수량은 1 이상이어야 합니다.' };
  }
  if (!department || department.trim().length === 0) {
    return { isValid: false, error: '비용을 귀속할 부서명을 입력해 주세요.' };
  }
  if (!staffName || staffName.trim().length === 0) {
    return { isValid: false, error: '불출 직원 성명을 입력해 주세요.' };
  }
  return { isValid: true };
}
