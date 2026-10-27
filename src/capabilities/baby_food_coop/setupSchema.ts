import type { CapabilitySetupSchema } from '@/core/presets/types';

export const babyFoodCoopSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'baby_food_coop',
  title: '이유식 품앗이 모임',
  description: '월령별 맞춤 추천 및 1/N 재료비 자동 정산 설정',
  fields: [
    {
      id: 'defaultMeetingCycle',
      label: '품앗이 모임 기본 주기',
      type: 'select',
      defaultValue: '주 1회 (화요일)',
      options: [
        { label: '주 1회 (화요일)', value: '주 1회 (화요일)' },
        { label: '주 1회 (목요일)', value: '주 1회 (목요일)' },
        { label: '주 2회 (화/금)', value: '주 2회 (화/금)' },
        { label: '격주 1회', value: '격주 1회' },
        { label: '월 1회', value: '월 1회' },
        { label: '비정기 품앗이', value: '비정기 품앗이' },
      ],
    },
    {
      id: 'settlementRule',
      label: '재료비 분할 원칙',
      type: 'text',
      defaultValue: '1/N 원단위 절사 분담 (잔여금 모임 적립)',
    },
    {
      id: 'allergyCheckMandatory',
      label: '알레르기 사전 검증 필수 여부',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
