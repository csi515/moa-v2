import type { CapabilitySetupSchema } from '@/core/presets/types';

export const curriculumProgressSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'curriculum_progress',
  title: '학습 진도 및 성장 리포트 설정',
  description: '교재/단원별 진도 체크, 승급/급수 심사 기준 및 월간 성장 리포트 발행 주기를 구성합니다.',
  fields: [
    {
      id: 'defaultAdvancementPassingRate',
      label: '승급/급수 심사 합격 기준 진도율 (%)',
      type: 'number',
      defaultValue: 80,
      required: true,
    },
    {
      id: 'requireMandatoryItems',
      label: '필수 단원 전체 완료 의무화',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'enableAutoMonthlyReport',
      label: '월말 성장 리포트 자동 초안 생성',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'defaultBadges',
      label: '기본 마스터 뱃지 목록 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['입문 완성', '초급 마스터', '중급 마스터', '심화 마스터', '명예의 전당'],
    },
  ],
};
