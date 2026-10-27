/**
 * 돌봄/활동 일일 알림장 & 타임라인 피드 도메인 엔진
 *
 * 비용 0원 원칙: 순수 문자열 및 W3C SVG 안심 알림장 카드 생성
 */

export type MealStatus = 'all' | 'half' | 'little' | 'none';
export type PottyStatus = 'normal' | 'soft' | 'constipation' | 'none';
export type SubjectType = 'student' | 'pet' | 'child';

export interface DailyCareLog {
  id: string;
  organizationId: string;
  subjectId: string;
  subjectName: string;
  subjectType: SubjectType;
  logDate: string; // YYYY-MM-DD
  mealStatus: MealStatus;
  pottyStatus: PottyStatus;
  napMinutes: number;
  medicationGiven: boolean;
  conditionRating: number; // 1..5
  summaryComment: string;
  dispatchStatus: 'draft' | 'dispatched';
  dispatchedAt?: string | null;
}

export interface CareTimelineEntry {
  id: string;
  careLogId: string;
  entryTime: string; // HH:MM
  category: 'meal' | 'potty' | 'activity' | 'nap' | 'medication' | 'safety';
  note: string;
  imageUrl?: string | null;
}

export function formatMealLabel(status: MealStatus): string {
  switch (status) {
    case 'all': return '🥣 완식 (아주 잘 먹음)';
    case 'half': return '🥣 절반 먹음';
    case 'little': return '🥣 조금 먹음';
    case 'none': return '⚠️ 식사 거부 (안 먹음)';
  }
}

export function formatPottyLabel(status: PottyStatus): string {
  switch (status) {
    case 'normal': return '✨ 정상 배변 (좋음)';
    case 'soft': return '💧 묽은 변/설사 주의';
    case 'constipation': return '🧱 변비/배변 어려움';
    case 'none': return '⏳ 배변 없음';
  }
}

/**
 * 1. 알림장 보호자 발송용 텍스트 조립 (카톡/문자 0원 공유)
 */
export function assembleCareReportMessage(log: DailyCareLog): string {
  const stars = '★'.repeat(log.conditionRating) + '☆'.repeat(5 - log.conditionRating);
  const medicationText = log.medicationGiven ? '💊 투약 완료' : '해당 없음';

  return [
    `[오늘의 안심 돌봄 알림장]`,
    `안녕하세요, ${log.subjectName} 보호자님! 오늘 하루 소식 전해드립니다.`,
    ``,
    `📅 일자: ${log.logDate}`,
    `⭐ 컨디션: ${stars} (${log.conditionRating}/5점)`,
    `식사: ${formatMealLabel(log.mealStatus)}`,
    `배변: ${formatPottyLabel(log.pottyStatus)}`,
    `낮잠/휴식: ${log.napMinutes}분`,
    `투약 관리: ${medicationText}`,
    ``,
    `📝 선생님 한줄 메모:`,
    `${log.summaryComment || '오늘 하루도 밝고 건강하게 잘 지냈습니다.'}`,
    ``,
    `* 항상 믿고 맡겨주셔서 감사합니다.`,
  ].join('\n');
}

/**
 * 2. W3C SVG 0원 모바일 안심 카드 렌더링
 */
export function renderCareReportSvgCard(log: DailyCareLog): string {
  const stars = '★'.repeat(log.conditionRating);
  const mealDesc = formatMealLabel(log.mealStatus);
  const pottyDesc = formatPottyLabel(log.pottyStatus);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EFF6FF" />
      <stop offset="100%" stop-color="#DBEAFE" />
    </linearGradient>
  </defs>
  <rect width="480" height="320" rx="16" fill="url(#bgGrad)" stroke="#93C5FD" stroke-width="2" />
  
  <text x="24" y="44" font-family="sans-serif" font-size="20" font-weight="bold" fill="#1E3A8A">
    🐾 ${log.subjectName} 안심 돌봄 리포트
  </text>
  <text x="24" y="68" font-family="sans-serif" font-size="12" fill="#6B7280">
    일자: ${log.logDate} | 컨디션: ${stars}
  </text>

  <!-- 지표 박스 -->
  <rect x="24" y="88" width="208" height="70" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
  <text x="36" y="112" font-family="sans-serif" font-size="12" font-weight="bold" fill="#374151">식사 상태</text>
  <text x="36" y="136" font-family="sans-serif" font-size="13" fill="#1D4ED8">${mealDesc}</text>

  <rect x="248" y="88" width="208" height="70" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
  <text x="260" y="112" font-family="sans-serif" font-size="12" font-weight="bold" fill="#374151">배변 상태</text>
  <text x="260" y="136" font-family="sans-serif" font-size="13" fill="#047857">${pottyDesc}</text>

  <rect x="24" y="170" width="208" height="60" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
  <text x="36" y="194" font-family="sans-serif" font-size="12" font-weight="bold" fill="#374151">휴식/낮잠</text>
  <text x="36" y="216" font-family="sans-serif" font-size="13" fill="#4B5563">${log.napMinutes}분 숙면</text>

  <rect x="248" y="170" width="208" height="60" rx="8" fill="#FFFFFF" stroke="#E5E7EB" />
  <text x="260" y="194" font-family="sans-serif" font-size="12" font-weight="bold" fill="#374151">투약 여부</text>
  <text x="260" y="216" font-family="sans-serif" font-size="13" fill="#D97706">${log.medicationGiven ? '투약 완료' : '해당 없음'}</text>

  <!-- 하단 메모 -->
  <rect x="24" y="242" width="432" height="58" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
  <text x="36" y="264" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B">선생님 한줄 메모</text>
  <text x="36" y="284" font-family="sans-serif" font-size="12" fill="#334155">${log.summaryComment || '오늘 하루도 친구들과 즐겁게 잘 보냈습니다.'}</text>
</svg>
  `.trim();
}
