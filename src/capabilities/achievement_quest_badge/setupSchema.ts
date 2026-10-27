import type { CapabilitySetupSchema } from '@/core/presets/types';

export const achievement_quest_badgeSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'achievement_quest_badge',
  title: '원생 성취 퀘스트 및 디지털 뱃지 설정',
  description: '퀘스트 달성 시 포인트 자동 지급 및 학부모 포털 노출 설정을 관리합니다.',
  fields: [
    {
      id: 'enableAutoPointReward',
      type: 'boolean',
      label: '퀘스트 완료 시 적립금 포인트 자동 지급',
      description: '목표 달성 시 설정된 rewardPoints를 학생 포인트 계정에 자동 적립합니다.',
      defaultValue: true,
      required: false,
    },
    {
      id: 'defaultCelebrationMessage',
      type: 'text',
      label: '기본 축하 안내 문구',
      description: '뱃지 수여 시 학부모에게 자동 발송될 축하 인사말 템플릿',
      defaultValue: '오늘도 한 걸음 더 성장한 멋진 도전을 축하합니다!',
      required: false,
    },
    {
      id: 'showBadgeOnParentApp',
      type: 'boolean',
      label: '학부모 포털 뱃지 진열장 공개',
      description: '학부모 앱 메인 화면에 학생이 획득한 뱃지 트로피 룸을 표시합니다.',
      defaultValue: true,
      required: false,
    },
  ],
};

export const achievementQuestBadgeSetupSchema = achievement_quest_badgeSetupSchema;
