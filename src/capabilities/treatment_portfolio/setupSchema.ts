import type { CapabilitySetupSchema } from '@/core/presets/types';

export const treatmentPortfolioSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'treatment_portfolio',
  title: '시술 스타일북 & 객단가 업셀링 갤러리 설정',
  description: '디자이너별 시술 룩북 카테고리, 비포/애프터 비교 뷰 활성화 및 추천 업셀링 옵션을 설정합니다.',
  fields: [
    {
      id: 'enableBeforeAfterComparison',
      label: '시술 전/후 (Before/After) 비교 뷰 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '태블릿 화면에서 시술 전후 사진을 나란히 비교할 수 있습니다.',
    },
    {
      id: 'defaultUpsellDiscountPercent',
      label: '시술 세트 업셀링 옵션 동시 선택 시 기본 할인율 (%)',
      type: 'number',
      defaultValue: 10,
    },
    {
      id: 'categories',
      label: '스타일북 카테고리 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['헤어 컷', '헤어 펌', '헤어 염색', '네일 아트', '스킨 케어'],
    },
  ],
};
