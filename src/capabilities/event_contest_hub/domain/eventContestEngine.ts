/**
 * 원내 발표회·대회 참가 접수 및 큐시트/심사 도메인 엔진
 *
 * 비용 0원 원칙: 순수 W3C SVG 전자 상장 생성 및 무대 큐시트 조립
 */

export interface EventContest {
  id: string;
  organizationId: string;
  title: string;
  eventCategory: 'concert' | 'contest' | 'exhibition' | 'tournament';
  eventDate: string; // YYYY-MM-DD
  venueName: string;
  entryFee: number;
  registrationDeadline: string;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'archived';
}

export interface ContestEntry {
  id: string;
  organizationId: string;
  contestId: string;
  participantId?: string | null;
  participantName: string;
  performancePiece: string; // 연주곡 / 발표작 / 품새명
  entryOrder: number; // 등번호 & 큐시트 순번
  scoreDetails: Record<string, number>;
  finalScore: number;
  awardTitle?: string | null; // "대상 (Grand Prize)", "금상", "특별상"
  certificateIssued: boolean;
  status: 'registered' | 'confirmed' | 'performed' | 'absent';
}

/**
 * 1. 발표회/대회 참가자 접수 및 등번호(순번) 자동 채번
 */
export function registerContestParticipant(params: {
  id: string;
  organizationId: string;
  contestId: string;
  participantName: string;
  performancePiece: string;
  existingCount: number;
}): ContestEntry {
  const entryOrder = params.existingCount + 1;

  return {
    id: params.id,
    organizationId: params.organizationId,
    contestId: params.contestId,
    participantName: params.participantName,
    performancePiece: params.performancePiece,
    entryOrder,
    scoreDetails: {},
    finalScore: 0,
    certificateIssued: false,
    status: 'registered',
  };
}

/**
 * 2. 무대 진행용 프로그램 순서표(큐시트) 조립
 */
export function assembleContestCueSheet(contest: EventContest, entries: ContestEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.entryOrder - b.entryOrder);

  const lines = [
    `==================================================`,
    `🎼 [무대 프로그램 큐시트] ${contest.title}`,
    `일시: ${contest.eventDate} | 장소: ${contest.venueName}`,
    `==================================================`,
    `순번 | 참가자명 | 연주곡 / 발표작`,
    `--------------------------------------------------`,
  ];

  for (const item of sorted) {
    const padOrder = String(item.entryOrder).padStart(2, '0');
    lines.push(`No.${padOrder} | ${item.participantName} | ${item.performancePiece}`);
  }

  lines.push(`==================================================`);
  lines.push(`총 참가 인원: ${sorted.length}명`);

  return lines.join('\n');
}

/**
 * 3. 심사 점수 입력 및 수상 타이틀 확정
 */
export function awardContestEntry(
  entry: ContestEntry,
  scores: Record<string, number>,
  awardTitle?: string
): ContestEntry {
  const values = Object.values(scores);
  const total = values.length > 0 ? values.reduce((acc, cur) => acc + cur, 0) / values.length : 0;
  const finalScore = Math.round(total * 10) / 10;

  let resolvedAward = awardTitle;
  if (!resolvedAward) {
    if (finalScore >= 95) resolvedAward = '대상 (Grand Prize)';
    else if (finalScore >= 90) resolvedAward = '최우수상';
    else if (finalScore >= 80) resolvedAward = '우수상';
    else resolvedAward = '참가 특별상';
  }

  return {
    ...entry,
    scoreDetails: scores,
    finalScore,
    awardTitle: resolvedAward,
    certificateIssued: true,
    status: 'performed',
  };
}

/**
 * 4. W3C SVG 0원 모바일 공식 상장/참가증 렌더링
 */
export function renderContestSvgAward(contest: EventContest, entry: ContestEntry): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 840" width="100%" height="100%">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D97706" />
      <stop offset="50%" stop-color="#FCD34D" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
  </defs>

  <!-- 외곽 보더 -->
  <rect x="20" y="20" width="560" height="800" rx="16" fill="#FFFDF8" stroke="url(#goldBorder)" stroke-width="8" />
  <rect x="36" y="36" width="528" height="768" rx="8" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,4" />

  <!-- 상단 타이틀 -->
  <text x="300" y="130" text-anchor="middle" font-family="serif" font-size="34" font-weight="bold" fill="#78350F" letter-spacing="8">
    상  장
  </text>
  <text x="300" y="175" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#B45309">
    ${entry.awardTitle ?? '우수상'}
  </text>

  <!-- 본문 인적사항 -->
  <text x="100" y="260" font-family="sans-serif" font-size="16" fill="#4B5563">성 명 :</text>
  <text x="170" y="260" font-family="sans-serif" font-size="20" font-weight="bold" fill="#111827">
    ${entry.participantName}
  </text>

  <text x="100" y="300" font-family="sans-serif" font-size="16" fill="#4B5563">부 문 :</text>
  <text x="170" y="300" font-family="sans-serif" font-size="16" fill="#111827">
    ${entry.performancePiece}
  </text>

  <!-- 표창 문안 -->
  <text x="300" y="400" text-anchor="middle" font-family="serif" font-size="16" fill="#1F2937" line-height="1.8">
    위 사람은 [${contest.title}]에 참가하여
  </text>
  <text x="300" y="435" text-anchor="middle" font-family="serif" font-size="16" fill="#1F2937">
    우수한 실력과 열정으로 기량을 발휘하였으므로
  </text>
  <text x="300" y="470" text-anchor="middle" font-family="serif" font-size="16" fill="#1F2937">
    그 결실을 높이 치하하며 이 상장을 수여합니다.
  </text>

  <!-- 하단 일자 및 발급처 -->
  <text x="300" y="580" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#4B5563">
    ${contest.eventDate}
  </text>

  <text x="300" y="650" text-anchor="middle" font-family="serif" font-size="22" font-weight="bold" fill="#78350F">
    ${contest.venueName} 원장
  </text>

  <!-- 인장 심볼 -->
  <circle cx="430" cy="640" r="32" fill="none" stroke="#DC2626" stroke-width="3" />
  <text x="430" y="646" text-anchor="middle" font-family="serif" font-size="13" font-weight="bold" fill="#DC2626">
    원장인
  </text>
</svg>
  `.trim();
}
