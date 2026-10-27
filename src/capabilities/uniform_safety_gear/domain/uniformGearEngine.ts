/**
 * 유니폼 및 보호구 사이즈별 지급·회수 대장 도메인 엔진 (Pure Functions)
 */

export type UniformType = 'CHEF_COAT' | 'APRON' | 'POLO_SHIRT' | 'SAFETY_SHOES' | 'NAME_TAG';
export type UniformStatus = 'ASSIGNED' | 'RETURNED_CLEAN' | 'LOST_COMPENSATED' | 'DISCARDED';

export interface UniformAssignmentRecord {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name: string;
  gear_type: UniformType;
  size_label: string; // 예: "M", "L", "265mm", "FREE"
  asset_code?: string;
  quantity: number;
  assigned_at: string;
  returned_at?: string;
  status: UniformStatus;
  penalty_charged: number;
}

export function calculateUnreturnedPenalty(
  unreturnedCount: number,
  unitPenaltyFee: number
): number {
  return Math.max(0, unreturnedCount * unitPenaltyFee);
}

export function transitionUniformStatus(
  currentStatus: UniformStatus,
  action: 'RETURN' | 'REPORT_LOST' | 'DISCARD'
): { nextStatus: UniformStatus; isAllowed: boolean; error?: string } {
  if (currentStatus !== 'ASSIGNED') {
    return { nextStatus: currentStatus, isAllowed: false, error: '지급 중인 품목만 반납/분실 처리 가능합니다.' };
  }
  switch (action) {
    case 'RETURN':
      return { nextStatus: 'RETURNED_CLEAN', isAllowed: true };
    case 'REPORT_LOST':
      return { nextStatus: 'LOST_COMPENSATED', isAllowed: true };
    case 'DISCARD':
      return { nextStatus: 'DISCARDED', isAllowed: true };
  }
}

export function validateAssignmentInput(
  staffName: string,
  sizeLabel: string,
  quantity: number
): { isValid: boolean; error?: string } {
  if (!staffName || staffName.trim().length === 0) {
    return { isValid: false, error: '지급 대상 직원 성명을 입력해 주세요.' };
  }
  if (!sizeLabel || sizeLabel.trim().length === 0) {
    return { isValid: false, error: '사이즈 규격을 입력해 주세요.' };
  }
  if (quantity <= 0) {
    return { isValid: false, error: '수량은 1개 이상이어야 합니다.' };
  }
  return { isValid: true };
}
