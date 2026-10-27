import type { CapabilitySetupSchema } from '@/core/presets/types';

export const calibrationMeteringSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'calibration_metering',
  title: '정밀 계측기 검교정 주기 설정',
  description: '체성분 분석기, 정밀 저울, 레이저 기기의 정기 검교정 도래 알림 기준일을 설정합니다.',
  fields: [
    {
      id: 'default_cycle_months',
      label: '기본 교정 주기(개월)',
      type: 'number',
      defaultValue: 12,
      description: '장비 등록 시 기본으로 권장되는 정기 교정 유효 기간(월)입니다.',
    },
    {
      id: 'advance_warning_days',
      label: '만료 사전 경고 일수(일)',
      type: 'number',
      defaultValue: 30,
      description: '교정 만료 며칠 전부터 대시보드에 사전 경고 배지를 노출할지 설정합니다.',
    },
  ],
};
