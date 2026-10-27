import type { CapabilitySetupSchema } from '@/core/presets/types';

export const promotionalDealSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'promotional_deal',
  title: '기간 한정 특가 및 이벤트 설정',
  description: '사업주가 원하는 기간 동안 이용권 및 소매 상품의 특별 할인가와 한정 수량을 설정합니다.',
  fields: [
    {
      id: 'allow_overlapping_promotions',
      label: '동일 품목 중복 특가 허용 여부',
      type: 'boolean',
      defaultValue: false,
      description: '동일한 상품/수강권에 진행 기간이 겹치는 특가 이벤트 중복 등록을 제한합니다.',
    },
    {
      id: 'default_discount_banner_text',
      label: '기본 특가 배너 안내 문구',
      type: 'text',
      defaultValue: '[기간 한정 특가] 지금 구매 시 특별 혜택이 적용됩니다.',
      description: '고객 대면 화면 및 키오스크/포털에 표기될 기본 이벤트 안내 문구입니다.',
    },
  ],
};
