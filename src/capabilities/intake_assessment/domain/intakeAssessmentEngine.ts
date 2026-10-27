/**
 * 사전 문진표 & 첫 방문 맞춤 진단서 도메인 엔진
 *
 * 비용 0원 원칙: 고객 모바일 작성 & 위험 플래그(디스크, 알레르기 등) 자동 감지 엔진
 */

export interface IntakeQuestion {
  id: string;
  label: string;
  type: 'text' | 'choice' | 'multi_choice' | 'boolean';
  options?: string[];
  required: boolean;
  isRiskFlag?: boolean; // 해당 질문의 특정 답변이 주의 플래그를 유발하는지 여부
  criticalValue?: string | boolean; // 심각 위험 조건 값
}

export interface IntakeSection {
  id: string;
  title: string;
  questions: IntakeQuestion[];
}

export interface IntakeTemplate {
  id: string;
  organizationId: string;
  title: string;
  industryTarget: 'fitness' | 'pilates' | 'beauty' | 'counseling' | 'pet' | 'general';
  questionSections: IntakeSection[];
  isActive: boolean;
}

export interface IntakeSubmission {
  id: string;
  organizationId: string;
  templateId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  answers: Record<string, any>;
  riskFlags: string[];
  hasCriticalCondition: boolean;
  summaryNotes?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

/**
 * 1. 문진표 답변 제출 시 위험 플래그 자동 감지 및 심각도 판정
 */
export function analyzeIntakeSubmission(params: {
  template: IntakeTemplate;
  answers: Record<string, any>;
  customerName: string;
  customerPhone?: string | null;
  submissionId: string;
}): IntakeSubmission {
  const riskFlags: string[] = [];
  let hasCriticalCondition = false;

  for (const section of params.template.questionSections) {
    for (const q of section.questions) {
      const answer = params.answers[q.id];
      if (answer === undefined || answer === null || answer === '') continue;

      if (q.isRiskFlag) {
        if (typeof answer === 'boolean' && answer === true) {
          riskFlags.push(`${section.title}: ${q.label}`);
          if (q.criticalValue === true) {
            hasCriticalCondition = true;
          }
        } else if (typeof answer === 'string' && q.criticalValue && answer.includes(String(q.criticalValue))) {
          riskFlags.push(`${section.title}: ${q.label} (${answer})`);
          hasCriticalCondition = true;
        } else if (Array.isArray(answer) && answer.length > 0) {
          riskFlags.push(`${section.title}: ${answer.join(', ')}`);
        }
      }
    }
  }

  return {
    id: params.submissionId,
    organizationId: params.template.organizationId,
    templateId: params.template.id,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    answers: params.answers,
    riskFlags,
    hasCriticalCondition,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 2. 강사/상담사용 원터치 진단 요약 텍스트 조립
 */
export function assembleIntakeSummaryCard(submission: IntakeSubmission): string {
  const riskSection =
    submission.riskFlags.length > 0
      ? `⚠️ [주의 요망 이력]\n${submission.riskFlags.map((f) => ` - ${f}`).join('\n')}`
      : `✅ 특이 위험 이력 없음 (정상 수련 가능)`;

  return [
    `========================================`,
    `📋 [사전 문진 요약] ${submission.customerName} 고객님`,
    `========================================`,
    riskSection,
    `----------------------------------------`,
    `심각 위험 주의 여부: ${submission.hasCriticalCondition ? '🚨 집중 관리 대상' : '일반'}`,
    `작성 일시: ${submission.createdAt.slice(0, 10)}`,
    `========================================`,
  ].join('\n');
}
