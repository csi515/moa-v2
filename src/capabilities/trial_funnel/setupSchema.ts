import type { CapabilitySetupSchema } from '@/core/presets/types';

export const trial_funnelSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'trial_funnel',
  title: '체험 및 상담 파이프라인 설정',
  description: 'SNS·포털 유입 상담 리드부터 1회 무료 체험, 정규 수강권 등록까지 단계별 전환 설정',
  fields: [
    {
      id: 'enable_instagram_tracking',
      label: '인스타그램/SNS 유입 추적',
      type: 'boolean',
      defaultValue: true,
      description: '인스타그램 및 SNS 광고 유입 경로를 추적합니다.',
    },
    {
      id: 'enable_naver_place_tracking',
      label: '네이버 플레이스/검색 유입 추적',
      type: 'boolean',
      defaultValue: true,
      description: '네이버 스마트플레이스 및 지도 검색 유입을 추적합니다.',
    },
  ],
};
