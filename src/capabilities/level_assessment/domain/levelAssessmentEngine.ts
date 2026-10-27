/**
 * 정기 승급·승품 심사 및 모바일 합격증 발급 순수 도메인 엔진 (Pure Domain Functions)
 * 루브릭 가중치 채점, 합격 판정, W3C SVG 기반 0원 모바일 전자 합격증 생성
 */

export interface RubricItem {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // 가중치 백분율 (합 100)
}

export interface AssessmentResultInput {
  scores: Record<string, number>; // rubricId -> rawScore
  rubrics: RubricItem[];
  passingScore: number;
}

export interface EvaluationResult {
  totalScore: number;
  isPassed: boolean;
  scoreBreakdown: Record<string, { rawScore: number; weightedScore: number; maxScore: number }>;
}

/**
 * 루브릭별 가중치 환산 총점 계산 및 합격 판정
 */
export function evaluateAssessment(input: AssessmentResultInput): EvaluationResult {
  const { scores, rubrics, passingScore } = input;
  let totalScore = 0;
  const scoreBreakdown: Record<string, { rawScore: number; weightedScore: number; maxScore: number }> = {};

  rubrics.forEach((rubric) => {
    const raw = Math.min(Math.max(0, scores[rubric.id] ?? 0), rubric.maxScore);
    const weighted = rubric.maxScore > 0 ? (raw / rubric.maxScore) * rubric.weight : 0;
    totalScore += weighted;

    scoreBreakdown[rubric.id] = {
      rawScore: raw,
      weightedScore: Math.round(weighted * 10) / 10,
      maxScore: rubric.maxScore,
    };
  });

  const roundedTotal = Math.round(totalScore * 10) / 10;
  const isPassed = roundedTotal >= passingScore;

  return {
    totalScore: roundedTotal,
    isPassed,
    scoreBreakdown,
  };
}

/**
 * 고유 모바일 합격증 일련번호 생성 (예: MOA-CERT-2026-00042)
 */
export function generateCertificateNumber(year: number, sequenceNumber: number): string {
  const seqStr = String(sequenceNumber).padStart(5, '0');
  return `MOA-CERT-${year}-${seqStr}`;
}

export interface CertificateMetadata {
  studentName: string;
  targetLevel: string; // 예: "태권도 1품", "체르니 100", "수영 중급반"
  certificateNumber: string;
  issueDate: string; // YYYY-MM-DD
  organizationName: string;
}

/**
 * 비용 0원 순수 W3C SVG 모바일 전자 합격증 생성기
 */
export function generateCertificateSvg(meta: CertificateMetadata): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="50%" stop-color="#F3E5AB"/>
      <stop offset="100%" stop-color="#AA771C"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="#FCFCFA"/>
  <rect x="25" y="25" width="750" height="550" fill="none" stroke="url(#goldBorder)" stroke-width="8" rx="16"/>
  <rect x="40" y="40" width="720" height="520" fill="none" stroke="#2D3748" stroke-width="1.5" rx="8"/>
  <text x="400" y="110" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="#1A202C" text-anchor="middle" letter-spacing="4">
    승 급 · 합 격 증 서
  </text>
  <text x="400" y="145" font-family="'Pretendard', sans-serif" font-size="13" font-weight="600" fill="#718096" text-anchor="middle" letter-spacing="1">
    CERTIFICATE OF ADVANCEMENT
  </text>
  <text x="400" y="230" font-family="'Pretendard', sans-serif" font-size="28" font-weight="800" fill="#2B6CB0" text-anchor="middle">
    ${meta.studentName}
  </text>
  <text x="400" y="280" font-family="'Pretendard', sans-serif" font-size="18" font-weight="700" fill="#2D3748" text-anchor="middle">
    취득 등급: ${meta.targetLevel}
  </text>
  <text x="400" y="340" font-family="'Pretendard', sans-serif" font-size="15" fill="#4A5568" text-anchor="middle" line-height="1.6">
    위 사람은 정기 승급 심사에서 우수한 기량과 성실한 수련 태도로
  </text>
  <text x="400" y="370" font-family="'Pretendard', sans-serif" font-size="15" fill="#4A5568" text-anchor="middle">
    소정의 평가 기준을 당당히 통과하였으므로 본 증서를 수여합니다.
  </text>
  <text x="400" y="450" font-family="'Pretendard', sans-serif" font-size="14" font-weight="600" fill="#718096" text-anchor="middle">
    발행일자: ${meta.issueDate}
  </text>
  <text x="400" y="500" font-family="'Pretendard', sans-serif" font-size="20" font-weight="800" fill="#1A202C" text-anchor="middle">
    ${meta.organizationName}
  </text>
  <text x="400" y="535" font-family="monospace" font-size="11" fill="#A0AEC0" text-anchor="middle">
    증서번호: ${meta.certificateNumber}
  </text>
</svg>`;
}
