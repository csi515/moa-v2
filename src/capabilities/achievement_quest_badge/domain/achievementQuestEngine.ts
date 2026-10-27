/**
 * achievement_quest_badge 도메인 비즈니스 엔진
 * 원생 성취 퀘스트 & 0원 W3C SVG 디지털 뱃지 수여 엔진
 */

export type QuestCategory = 'attendance' | 'skill' | 'challenge' | 'habit' | 'event';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type BadgeIconName = 'star' | 'trophy' | 'flame' | 'medal' | 'crown';

export interface AchievementQuestItem {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  category: QuestCategory;
  targetCount: number;
  unit: string;
  badgeTier: BadgeTier;
  badgeIconName: BadgeIconName;
  rewardPoints: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementQuestMemberItem {
  id: string;
  organizationId: string;
  questId: string;
  memberName: string;
  memberIdentifier?: string | null;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: string | null;
  badgeIssued: boolean;
  badgeIssuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 회원 퀘스트 진척도 갱신 및 완료 판정
 */
export function recordQuestProgress(
  currentProgress: number,
  addedValue: number,
  targetCount: number
): { newProgress: number; isCompleted: boolean; justCompleted: boolean } {
  const newProgress = Math.max(0, currentProgress + addedValue);
  const wasCompleted = currentProgress >= targetCount;
  const isCompleted = newProgress >= targetCount;
  const justCompleted = !wasCompleted && isCompleted;

  return {
    newProgress,
    isCompleted,
    justCompleted,
  };
}

/**
 * 티어별 대표 색상 반환
 */
export function getTierColors(tier: BadgeTier): { bgGradient: string; stroke: string; textColor: string } {
  switch (tier) {
    case 'diamond':
      return { bgGradient: 'url(#diamondGrad)', stroke: '#38bdf8', textColor: '#0284c7' };
    case 'platinum':
      return { bgGradient: 'url(#platinumGrad)', stroke: '#94a3b8', textColor: '#475569' };
    case 'gold':
      return { bgGradient: 'url(#goldGrad)', stroke: '#f59e0b', textColor: '#b45309' };
    case 'silver':
      return { bgGradient: 'url(#silverGrad)', stroke: '#cbd5e1', textColor: '#64748b' };
    case 'bronze':
    default:
      return { bgGradient: 'url(#bronzeGrad)', stroke: '#d97706', textColor: '#78350f' };
  }
}

/**
 * 0원 W3C SVG 디지털 메달/뱃지 그래픽 생성
 */
export function renderAchievementBadgeSvg(
  quest: AchievementQuestItem,
  member: AchievementQuestMemberItem
): string {
  const safeTitle = (quest.title || '성취 퀘스트')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeName = (member.memberName || '도전자')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const colors = getTierColors(quest.badgeTier);

  // 중앙 심볼 이모지/기호
  const iconEmoji =
    quest.badgeIconName === 'trophy'
      ? '🏆'
      : quest.badgeIconName === 'crown'
      ? '👑'
      : quest.badgeIconName === 'flame'
      ? '🔥'
      : quest.badgeIconName === 'medal'
      ? '🎖️'
      : '⭐';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" width="100%" height="100%">
  <defs>
    <radialGradient id="goldGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <radialGradient id="silverGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="70%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </radialGradient>
    <radialGradient id="bronzeGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="70%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#7c2d12"/>
    </radialGradient>
    <radialGradient id="diamondGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="70%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </radialGradient>
    <radialGradient id="platinumGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </radialGradient>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.2"/>
    </filter>
  </defs>

  <rect width="360" height="420" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- 상단 헤더 -->
  <rect x="0" y="0" width="360" height="48" rx="20" fill="#0f172a"/>
  <rect x="0" y="24" width="360" height="24" fill="#0f172a"/>
  <text x="180" y="30" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">🎖️ MOA OFFICIAL BADGE</text>

  <!-- 뱃지 메달 본체 -->
  <circle cx="180" cy="160" r="80" fill="${colors.bgGradient}" stroke="${colors.stroke}" stroke-width="6" filter="url(#badgeShadow)"/>
  <circle cx="180" cy="160" r="68" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,4" opacity="0.8"/>
  <text x="180" y="180" font-size="52" text-anchor="middle">${iconEmoji}</text>

  <!-- 리본 티어 라벨 -->
  <rect x="110" y="225" width="140" height="30" rx="15" fill="#1e293b"/>
  <text x="180" y="245" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">${quest.badgeTier.toUpperCase()} BADGE</text>

  <!-- 수여자 및 퀘스트 명칭 -->
  <text x="180" y="295" fill="#0f172a" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">${safeName} 원생</text>
  <text x="180" y="325" fill="#334155" font-size="15" font-weight="600" text-anchor="middle" font-family="sans-serif">${safeTitle}</text>
  
  <!-- 달성 정보 -->
  <rect x="50" y="345" width="260" height="32" rx="8" fill="#f1f5f9"/>
  <text x="180" y="366" fill="#475569" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">목표 ${quest.targetCount}${quest.unit} 전원 완료 (+${quest.rewardPoints}P)</text>

  <!-- 하단 워터마크 -->
  <text x="180" y="402" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">Moa Gamification Quest Network • 디지털 인증</text>
</svg>`;
}

/**
 * 0원 학부모 카톡/SNS 축하 공유 텍스트 템플릿
 */
export function formatAchievementShareText(
  quest: AchievementQuestItem,
  member: AchievementQuestMemberItem
): string {
  return `🎉 [축 달성] ${member.memberName} 원생이 '${quest.title}' 퀘스트를 완료했습니다!

열심히 땀 흘리며 도전한 끝에 공식 [${quest.badgeTier.toUpperCase()}] 뱃지를 획득하였습니다.

- 퀘스트: ${quest.title}
- 달성 수치: ${quest.targetCount} ${quest.unit}
- 획득 보상: 디지털 뱃지 +${quest.rewardPoints} 포인트 적립

앞으로도 ${member.memberName} 원생의 빛나는 성장과 도전을 큰 박수로 응원합니다! 👏`;
}
