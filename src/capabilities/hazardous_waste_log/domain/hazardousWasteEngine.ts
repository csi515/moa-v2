/**
 * 의료·유해 폐기물 및 폐약제 배출 대장 도메인 엔진 (Pure Functions)
 */

export type WasteCategory =
  | 'INFECTIOUS_NEEDLE'  // 손상성 폐기물 (주사바늘, 침)
  | 'INFECTIOUS_GENERAL' // 일반 의료폐기물 (거즈, 붕대)
  | 'CHEMICAL_REAGENT'   // 폐유기용제, 염색약 잔여액
  | 'MEDICATION_EXPIRED';// 폐의약품

export type WasteContainerStatus = 'STORING' | 'SEALED' | 'HANDED_OVER';

export interface WasteDischargeRecord {
  id: string;
  tenant_id: string;
  container_code: string; // 전용 용기 일련번호 (예: "BOX-2026-088")
  category: WasteCategory;
  weight_kg: number;
  first_discharge_date: string; // 최초 투입일 (보관 기한 기산점)
  sealed_date?: string;
  handed_over_date?: string;
  status: WasteContainerStatus;
  collector_name?: string;
  manifest_number?: string; // 인계서 번호
}

export function calculateStorageLimitDday(
  firstDischargeDate: string,
  maxStorageDays = 15,
  now: Date = new Date()
): { deadlineDate: string; daysRemaining: number; isOverdue: boolean } {
  const startDate = new Date(firstDischargeDate);
  const deadline = new Date(startDate);
  deadline.setDate(deadline.getDate() + maxStorageDays);

  const deadlineDate = deadline.toISOString().split('T')[0];
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  return { deadlineDate, daysRemaining, isOverdue };
}

export function validateDischargeInput(
  containerCode: string,
  weightKg: number
): { isValid: boolean; error?: string } {
  if (!containerCode || containerCode.trim().length === 0) {
    return { isValid: false, error: '전용 용기 바코드/식별 코드를 입력해 주세요.' };
  }
  if (weightKg <= 0) {
    return { isValid: false, error: '배출 중량(kg)은 0보다 커야 합니다.' };
  }
  return { isValid: true };
}
