/**
 * 개인정보 열람 감사 로그 및 파기 관리 도메인 엔진 (Pure Functions)
 */

export type AccessPurpose = 'TAX_WITHHOLDING' | 'LEGAL_DISPUTE' | 'INSURANCE_CLAIM' | 'CONSULTATION_SERVICE';

export interface PrivacyAuditLogRecord {
  id: string;
  tenant_id: string;
  accessor_id: string;
  accessor_name: string;
  subject_member_id: string;
  subject_member_name: string;
  target_field: string; // 예: "resident_registration_number", "bank_account"
  purpose: AccessPurpose;
  purpose_detail?: string;
  accessed_at: string;
}

export function maskSensitiveData(data: string, fieldType: 'RRN' | 'PHONE' | 'ACCOUNT'): string {
  if (!data) return '';
  switch (fieldType) {
    case 'RRN': // 주민등록번호 (900101-1******)
      return data.replace(/^(\d{6})-?(\d{1})\d{6}$/, '$1-$2******');
    case 'PHONE': // 010-****-5678
      return data.replace(/^(\d{2,3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3');
    case 'ACCOUNT': // 계좌번호 뒤 4자리 외 마스킹
      return data.length > 4 ? '*'.repeat(data.length - 4) + data.slice(-4) : '****';
  }
}

export function validateAuditReason(
  enforceReason: boolean,
  purpose: AccessPurpose,
  detail?: string
): { isValid: boolean; error?: string } {
  if (!purpose) {
    return { isValid: false, error: '열람 목적을 선택해 주세요.' };
  }
  if (enforceReason && (!detail || detail.trim().length < 5)) {
    return { isValid: false, error: '개인정보보호법 준수를 위해 열람 사유를 최소 5자 이상 상세히 기재해 주세요.' };
  }
  return { isValid: true };
}

export function isEligibleForPurge(withdrawnAt: string, retentionYears: number, now: Date = new Date()): boolean {
  const withdrawnDate = new Date(withdrawnAt);
  const cutoffDate = new Date(withdrawnDate);
  cutoffDate.setFullYear(cutoffDate.getFullYear() + retentionYears);
  return now.getTime() >= cutoffDate.getTime();
}
