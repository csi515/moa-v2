/**
 * nps_survey_collector 도메인 비즈니스 엔진
 * 모바일 만족도·NPS(Net Promoter Score) 설문 조사 및 피드백 분석기
 */

export type SentimentCategory = 'promoter' | 'passive' | 'detractor';
export type SurveyCampaignStatus = 'draft' | 'active' | 'closed';
export type FollowUpActionStatus = 'unreviewed' | 'contacted' | 'resolved' | 'ignored';

export interface SurveyCampaignItem {
  id: string;
  organizationId: string;
  title: string;
  targetAudience: string;
  description?: string | null;
  status: SurveyCampaignStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  surveyQuestions?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponseItem {
  id: string;
  organizationId: string;
  campaignId: string;
  respondentName?: string | null;
  respondentPhone?: string | null;
  isAnonymous: boolean;
  npsScore: number; // 0 ~ 10
  sentimentCategory: SentimentCategory;
  instructorRating?: number | null; // 1 ~ 5
  facilityRating?: number | null; // 1 ~ 5
  curriculumRating?: number | null; // 1 ~ 5
  feedbackText?: string | null;
  actionStatus: FollowUpActionStatus;
  actionNote?: string | null;
  createdAt: string;
}

export interface NpsSummaryResult {
  totalResponses: number;
  promoterCount: number;
  passiveCount: number;
  detractorCount: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
  npsScore: number; // -100 ~ 100
  avgInstructorRating: number;
  avgFacilityRating: number;
  avgCurriculumRating: number;
}

/**
 * 0~10점 점수를 Promoter, Passive, Detractor로 분류
 */
export function classifySentiment(score: number): SentimentCategory {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

/**
 * NPS 및 지표 종합 계산
 */
export function calculateNpsSummary(responses: SurveyResponseItem[]): NpsSummaryResult {
  const total = responses.length;
  if (total === 0) {
    return {
      totalResponses: 0,
      promoterCount: 0,
      passiveCount: 0,
      detractorCount: 0,
      promoterPct: 0,
      passivePct: 0,
      detractorPct: 0,
      npsScore: 0,
      avgInstructorRating: 0,
      avgFacilityRating: 0,
      avgCurriculumRating: 0,
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  let sumInst = 0, countInst = 0;
  let sumFac = 0, countFac = 0;
  let sumCurr = 0, countCurr = 0;

  for (const res of responses) {
    const cat = classifySentiment(res.npsScore);
    if (cat === 'promoter') promoters++;
    else if (cat === 'passive') passives++;
    else detractors++;

    if (res.instructorRating) {
      sumInst += res.instructorRating;
      countInst++;
    }
    if (res.facilityRating) {
      sumFac += res.facilityRating;
      countFac++;
    }
    if (res.curriculumRating) {
      sumCurr += res.curriculumRating;
      countCurr++;
    }
  }

  const promoterPct = Math.round((promoters / total) * 100);
  const detractorPct = Math.round((detractors / total) * 100);
  const passivePct = 100 - promoterPct - detractorPct;
  const npsScore = promoterPct - detractorPct;

  return {
    totalResponses: total,
    promoterCount: promoters,
    passiveCount: passives,
    detractorCount: detractors,
    promoterPct,
    passivePct,
    detractorPct,
    npsScore,
    avgInstructorRating: countInst > 0 ? Number((sumInst / countInst).toFixed(1)) : 0,
    avgFacilityRating: countFac > 0 ? Number((sumFac / countFac).toFixed(1)) : 0,
    avgCurriculumRating: countCurr > 0 ? Number((sumCurr / countCurr).toFixed(1)) : 0,
  };
}

/**
 * 불만 고객(Detractor) 중 미확인(unreviewed) 긴급 조치 대상 추출
 */
export function filterUrgentFollowUps(responses: SurveyResponseItem[]): SurveyResponseItem[] {
  return responses.filter(
    (r) => r.npsScore <= 6 && r.actionStatus === 'unreviewed' && !r.isAnonymous && !!r.respondentName
  );
}

/**
 * 0원 W3C SVG NPS 시각화 게이지 및 분포 카드 생성
 */
export function renderNpsGaugeSvg(summary: NpsSummaryResult): string {
  const scoreColor = summary.npsScore > 30 ? '#16a34a' : summary.npsScore >= 0 ? '#0284c7' : '#dc2626';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="100%" height="100%">
  <rect width="500" height="240" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="500" height="46" rx="16" fill="#0f172a"/>
  <rect x="0" y="26" width="500" height="20" fill="#0f172a"/>
  <text x="24" y="29" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">📊 고객 추천 지수 (NPS) 실시간 분석 현황</text>
  
  <!-- NPS 점수 디스플레이 -->
  <text x="75" y="105" fill="#64748b" font-size="12" font-family="sans-serif" text-anchor="middle">Net Promoter Score</text>
  <text x="75" y="150" fill="${scoreColor}" font-size="36" font-weight="bold" font-family="sans-serif" text-anchor="middle">${summary.npsScore > 0 ? '+' : ''}${summary.npsScore}</text>
  <text x="75" y="175" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">응답 수: ${summary.totalResponses}명</text>

  <!-- 수평 분포 바 -->
  <text x="170" y="80" fill="#334155" font-size="13" font-weight="bold" font-family="sans-serif">고객 만족도 감정 분포</text>
  <rect x="170" y="95" width="${Math.max(4, (summary.promoterPct * 300) / 100)}" height="26" rx="4" fill="#16a34a"/>
  <rect x="${170 + (summary.promoterPct * 300) / 100}" y="95" width="${Math.max(0, (summary.passivePct * 300) / 100)}" height="26" fill="#f59e0b"/>
  <rect x="${170 + ((summary.promoterPct + summary.passivePct) * 300) / 100}" y="95" width="${Math.max(0, (summary.detractorPct * 300) / 100)}" height="26" rx="4" fill="#dc2626"/>

  <!-- 범례 -->
  <circle cx="178" cy="140" r="5" fill="#16a34a"/>
  <text x="190" y="144" fill="#334155" font-size="12" font-family="sans-serif">추천 (9-10점): ${summary.promoterPct}%</text>

  <circle cx="288" cy="140" r="5" fill="#f59e0b"/>
  <text x="300" y="144" fill="#334155" font-size="12" font-family="sans-serif">중립 (7-8점): ${summary.passivePct}%</text>

  <circle cx="398" cy="140" r="5" fill="#dc2626"/>
  <text x="410" y="144" fill="#334155" font-size="12" font-family="sans-serif">불만 (0-6점): ${summary.detractorPct}%</text>

  <line x1="24" y1="195" x2="476" y2="195" stroke="#f1f5f9" stroke-width="1.5"/>

  <!-- 하단 세부 평점 -->
  <text x="75" y="220" fill="#475569" font-size="12" font-family="sans-serif" text-anchor="middle">강사: ★ ${summary.avgInstructorRating}</text>
  <text x="250" y="220" fill="#475569" font-size="12" font-family="sans-serif" text-anchor="middle">시설: ★ ${summary.avgFacilityRating}</text>
  <text x="425" y="220" fill="#475569" font-size="12" font-family="sans-serif" text-anchor="middle">프로그램: ★ ${summary.avgCurriculumRating}</text>
</svg>`;
}

/**
 * 0원 카카오톡/문자 설문 참여 링크 텍스트 템플릿
 */
export function formatSurveyInvitationText(campaignTitle: string, orgName: string, campaignId: string): string {
  return `[${orgName}] 소중한 의견을 들려주세요 (만족도 설문)

안녕하세요. ${orgName}입니다.
회원님들께 더 나은 수업과 쾌적한 환경을 제공해 드리고자 짧은 만족도 설문을 진행합니다.

- 설문명: ${campaignTitle}
- 소요 시간: 약 1분 (익명 참여 가능)
- 모바일 참여 링크: https://moa.app/survey/${campaignId}

회원님의 소중한 한마디가 우리 사업장을 더욱 발전시키는 가장 큰 힘이 됩니다. 많은 참여 부탁드립니다. 감사합니다.`;
}
