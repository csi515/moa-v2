import type { CapabilitySetupSchema } from '@/core/presets/types';

export const fixedAssetDepreciationSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'fixed_asset_depreciation',
  title: '고정자산 및 감가상각 설정',
  description: '매장 설비/비품의 기본 세법상 내용연수와 정기 실사 주기를 설정합니다.',
  fields: [
    {
      id: 'default_useful_life_years',
      label: '기본 내용연수 (년)',
      type: 'number',
      defaultValue: 5,
      description: '별도 지정이 없는 고정자산 비품의 기본 감가상각 기간(연)입니다.',
    },
    {
      id: 'memorandum_value',
      label: '상각 완료 후 비망가액 (원)',
      type: 'number',
      defaultValue: 1000,
      description: '감가상각이 100% 완료된 자산의 장부상 비망가액입니다.',
    },
  ],
};
