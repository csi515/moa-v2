import type { CapabilitySetupSchema } from '@/core/presets/types';

export const exhibitionArtCurationSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'exhibition_art_curation',
  title: '원내 아트 전시 및 렌탈 설정',
  description: '시설 내 전시 작품의 보험 가액 한도 및 전시 만료 사전 알림 주기를 설정합니다.',
  fields: [
    {
      id: 'max_insurance_limit',
      label: '시설 총 보험 담보 한도액(원)',
      type: 'number',
      defaultValue: 50000000,
      description: '보관 및 전시 중인 예술품의 손망실 보험 한도액입니다.',
    },
    {
      id: 'expiry_alert_days',
      label: '전시 만료 사전 알림 일수',
      type: 'number',
      defaultValue: 14,
      description: '렌탈 및 전시 계약 종료 며칠 전부터 알림을 표시할지 지정합니다.',
    },
  ],
};
