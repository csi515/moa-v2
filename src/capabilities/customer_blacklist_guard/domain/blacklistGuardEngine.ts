/**
 * 악성 민원 및 출입제한 통제 도메인 엔진 (Pure Functions)
 */

export type RestrictionSeverity = 'PERMANENT_EXPULSION' | 'TEMPORARY_SUSPENSION' | 'CAUTION_MONITORING';
export type IncidentReason = 'VIOLENCE_VERBAL' | 'PROPERTY_DAMAGE' | 'SEXUAL_HARASSMENT' | 'NON_PAYMENT' | 'OTHER';

export interface BlacklistRecord {
  id: string;
  tenant_id: string;
  target_name: string;
  target_phone: string; // 마스킹 대조용 (끝 4자리 또는 해시)
  severity: RestrictionSeverity;
  reason: IncidentReason;
  incident_summary: string;
  restricted_until?: string; // 일시 정지인 경우 만료일
  is_active: boolean;
  registered_by: string;
  created_at: string;
}

export interface AccessAttemptResult {
  isBlocked: boolean;
  severity?: RestrictionSeverity;
  reasonMessage?: string;
}

export function evaluateAccessAttempt(
  blacklist: BlacklistRecord[],
  targetPhone: string,
  currentTime: Date = new Date()
): AccessAttemptResult {
  const cleanedTarget = targetPhone.replace(/[^0-9]/g, '');
  const matched = blacklist.find((b) => {
    if (!b.is_active) return false;
    const cleanedB = b.target_phone.replace(/[^0-9]/g, '');
    return cleanedTarget.endsWith(cleanedB) || cleanedB.endsWith(cleanedTarget);
  });

  if (!matched) {
    return { isBlocked: false };
  }

  // 기한부 정지인 경우 만료일 대조
  if (matched.severity === 'TEMPORARY_SUSPENSION' && matched.restricted_until) {
    const until = new Date(matched.restricted_until);
    if (currentTime.getTime() > until.getTime()) {
      return { isBlocked: false }; // 기한 만료로 자동 해제
    }
  }

  if (matched.severity === 'CAUTION_MONITORING') {
    return {
      isBlocked: false,
      severity: 'CAUTION_MONITORING',
      reasonMessage: `주의 요망 대상 회원입니다 (${matched.incident_summary}).`,
    };
  }

  return {
    isBlocked: true,
    severity: matched.severity,
    reasonMessage: `출입이 제한된 회원입니다 (${matched.incident_summary}).`,
  };
}

export function validateBlacklistInput(
  name: string,
  phone: string,
  summary: string
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '대상자 성명을 입력해 주세요.' };
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 4) {
    return { isValid: false, error: '식별을 위해 전화번호는 최소 4자리 이상 입력해 주세요.' };
  }
  if (!summary || summary.trim().length === 0) {
    return { isValid: false, error: '제한 사유 및 경위를 상세히 기재해 주세요.' };
  }
  return { isValid: true };
}
