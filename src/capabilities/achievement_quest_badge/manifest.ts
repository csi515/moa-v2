import { defineCapability } from '../_shared/capabilityTypes';

export const achievement_quest_badgeCapability = defineCapability({
  id: 'achievement_quest_badge',
  displayName: '원생 성취 퀘스트 & 0원 W3C SVG 뱃지 수여 엔진',
  dependencies: ['curriculum_progress'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['curriculum.manage'],
});

export const achievementQuestBadgeCapability = achievement_quest_badgeCapability;
