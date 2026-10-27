import type { CapabilitySetupSchema } from '@/core/presets/types';

export const passesSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'passes',
  title: '수강권·회원권 기본 정책',
  description: '회원권 유형(횟수제/기간제)과 유효기간 및 양도/정지 규칙을 설정합니다.',
  fields: [
    {
      id: 'defaultPassType',
      label: '기본 회원권 유형',
      type: 'select',
      defaultValue: 'COUNT_BASED',
      options: [
        { label: '횟수 차감제 (10회, 20회 등)', value: 'COUNT_BASED' },
        { label: '기간제 (1개월, 3개월 무제한)', value: 'PERIOD_BASED' },
        { label: '하이브리드 (기간 내 횟수 제한)', value: 'HYBRID' },
      ],
      required: true,
    },
    {
      id: 'defaultValidityDays',
      label: '기본 유효기간 (일)',
      type: 'number',
      defaultValue: 90,
      required: true,
    },
    {
      id: 'allowPause',
      label: '이용권 일시정지(홀딩) 허용',
      type: 'boolean',
      defaultValue: true,
      description: '회원의 사정으로 인한 일시정지를 허용합니다.',
    },
    {
      id: 'maxPauseDays',
      label: '최대 정지 가능 일수 (일)',
      type: 'number',
      defaultValue: 30,
    },
  ],
};
