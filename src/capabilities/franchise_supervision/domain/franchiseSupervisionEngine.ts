/**
 * 가맹 본사 QSC 점검 및 정기 슈퍼바이징 도메인 엔진 (Pure Functions)
 */

export type QscGrade = 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'GRADE_F';

export interface SupervisionAuditRecord {
  id: string;
  tenant_id: string;
  store_name: string;
  supervisor_name: string;
  quality_score: number;    // 만점 35점
  service_score: number;    // 만점 35점
  cleanliness_score: number;// 만점 30점
  total_score: number;      // 만점 100점
  grade: QscGrade;
  deficiencies_summary?: string;
  action_required: boolean;
  action_deadline?: string;
  audit_date: string;
}

export function calculateQscScoreAndGrade(
  quality: number,
  service: number,
  cleanliness: number,
  thresholdA = 90
): { totalScore: number; grade: QscGrade; actionRequired: boolean } {
  const q = Math.min(35, Math.max(0, quality));
  const s = Math.min(35, Math.max(0, service));
  const c = Math.min(30, Math.max(0, cleanliness));
  const total = q + s + c;

  let grade: QscGrade;
  if (total >= thresholdA) {
    grade = 'GRADE_A';
  } else if (total >= 80) {
    grade = 'GRADE_B';
  } else if (total >= 70) {
    grade = 'GRADE_C';
  } else {
    grade = 'GRADE_F';
  }

  const actionRequired = grade === 'GRADE_C' || grade === 'GRADE_F';

  return { totalScore: total, grade, actionRequired };
}

export function validateAuditInput(
  storeName: string,
  supervisorName: string
): { isValid: boolean; error?: string } {
  if (!storeName || storeName.trim().length === 0) {
    return { isValid: false, error: '점검 대상 매장/가맹점명을 입력해 주세요.' };
  }
  if (!supervisorName || supervisorName.trim().length === 0) {
    return { isValid: false, error: '슈퍼바이저 성명을 입력해 주세요.' };
  }
  return { isValid: true };
}
