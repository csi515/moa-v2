import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const achievement_quest_badgeResources: CapabilityResourceDefinition = {
  capabilityId: 'achievement_quest_badge',
  resources: [
    {
      name: 'achievement_quests',
      list: '/achievement-quests',
      create: '/achievement-quests/create',
      show: '/achievement-quests/:id',
      meta: {
        label: '성취 퀘스트·뱃지',
        order: 212,
      },
    },
  ],
};

export const achievementQuestBadgeResources = achievement_quest_badgeResources;
