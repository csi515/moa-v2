/**
 * 시술·서비스 하자 무상보증(A/S) 및 리터치 대장 도메인 엔진 (Pure Functions)
 */

export type DefectType =
  | 'PERM_CURL_LOOSE'
  | 'COLOR_FADING'
  | 'GEL_NAIL_LIFTING'
  | 'PIGMENT_DROPOUT'
  | 'CUSTOM_FIT_ISSUE';

export type ClaimDecision = 'FREE_RETOUCH_APPROVED' | 'PAID_RETOUCH_OFFERED' | 'REJECTED';

export interface WarrantyClaimRecord {
  id: string;
  tenant_id: string;
  customer_name: string;
  original_service_name: string;
  original_practitioner_name: string;
  original_service_date: string;
  claim_date: string;
  defect_type: DefectType;
  defect_description: string;
  photo_evidence_url?: string;
  is_eligible_for_free: boolean;
  decision: ClaimDecision;
  rework_completed_at?: string;
}

export function evaluateWarrantyEligibility(
  originalServiceDate: string,
  claimDate: string,
  warrantyDays = 7
): { isEligible: boolean; daysElapsed: number; deadlineDate: string } {
  const serviceDate = new Date(originalServiceDate);
  const claim = new Date(claimDate);

  const deadline = new Date(serviceDate);
  deadline.setDate(deadline.getDate() + warrantyDays);
  const deadlineDate = deadline.toISOString().split('T')[0];

  const diffMs = claim.getTime() - serviceDate.getTime();
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isEligible = daysElapsed <= warrantyDays && daysElapsed >= 0;
  return { isEligible, daysElapsed, deadlineDate };
}

export function validateClaimInput(
  customerName: string,
  serviceName: string,
  defectDesc: string
): { isValid: boolean; error?: string } {
  if (!customerName || customerName.trim().length === 0) {
    return { isValid: false, error: '고객명을 입력해 주세요.' };
  }
  if (!serviceName || serviceName.trim().length === 0) {
    return { isValid: false, error: '원 시술/서비스명을 입력해 주세요.' };
  }
  if (!defectDesc || defectDesc.trim().length === 0) {
    return { isValid: false, error: '하자 및 불편 사항을 상세히 기재해 주세요.' };
  }
  return { isValid: true };
}
