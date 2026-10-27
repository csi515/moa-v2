/**
 * 신규 강사·직원 입문 교육 및 수습 평가 대장 도메인 엔진 (Pure Functions)
 */

export interface OnboardingTask {
  id: string;
  title: string;
  category: 'ORIENTATION' | 'SYSTEM_TRAINING' | 'DEMO_TEACHING' | 'PROBATION_REVIEW';
  is_completed: boolean;
  completed_at?: string;
  verified_by?: string;
}

export type ProbationResult = 'IN_PROGRESS' | 'PASSED' | 'EXTENDED' | 'FAILED';

export interface StaffOnboardingRecord {
  id: string;
  tenant_id: string;
  staff_name: string;
  role_title: string; // 예: "수학 전임강사", "필라테스 주임"
  mentor_name: string;
  hire_date: string;
  probation_end_date: string;
  tasks: OnboardingTask[];
  evaluation_score?: number; // 0~100점
  probation_result: ProbationResult;
  notes?: string;
}

export function calculateOnboardingProgress(tasks: OnboardingTask[]): {
  total: number;
  completed: number;
  percent: number;
} {
  if (!tasks || tasks.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const completed = tasks.filter((t) => t.is_completed).length;
  const percent = Math.round((completed / tasks.length) * 100);
  return { total: tasks.length, completed, percent };
}

export function evaluateProbationPass(
  score: number,
  taskCompletionPercent: number,
  passThreshold = 80
): ProbationResult {
  if (taskCompletionPercent < 100) {
    return 'IN_PROGRESS';
  }
  if (score >= passThreshold) {
    return 'PASSED';
  }
  if (score >= 60) {
    return 'EXTENDED';
  }
  return 'FAILED';
}

export function validateOnboardingInput(
  staffName: string,
  roleTitle: string,
  mentorName: string
): { isValid: boolean; error?: string } {
  if (!staffName || staffName.trim().length === 0) {
    return { isValid: false, error: '입사자 성명을 입력해 주세요.' };
  }
  if (!roleTitle || roleTitle.trim().length === 0) {
    return { isValid: false, error: '직무/직책명을 입력해 주세요.' };
  }
  if (!mentorName || mentorName.trim().length === 0) {
    return { isValid: false, error: '전담 멘토/사수 성명을 입력해 주세요.' };
  }
  return { isValid: true };
}
