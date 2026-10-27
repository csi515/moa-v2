/** 수강 형태 — 월회비 청구 vs 회차권 차감 */
export type StudentBillingMode = 'monthly' | 'session_pass';

export const STUDENT_BILLING_MODE_LABEL: Record<StudentBillingMode, string> = {
  monthly: '월회비',
  session_pass: '회차권',
};

export function normalizeBillingMode(
  mode?: StudentBillingMode | string | null
): StudentBillingMode {
  return mode === 'session_pass' ? 'session_pass' : 'monthly';
}

/** 월회비 청구 대상인지 */
export function isMonthlyBillingStudent(student: { billingMode?: StudentBillingMode | string | null }): boolean {
  return normalizeBillingMode(student.billingMode) === 'monthly';
}

/** 회차권 차감 대상인지 */
export function isSessionPassBillingStudent(student: { billingMode?: StudentBillingMode | string | null }): boolean {
  return normalizeBillingMode(student.billingMode) === 'session_pass';
}

export function resolveDefaultBillingMode(
  settingsMode?: StudentBillingMode | string | null
): StudentBillingMode {
  return normalizeBillingMode(settingsMode);
}

