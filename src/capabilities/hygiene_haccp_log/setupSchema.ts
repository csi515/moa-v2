import type { CapabilitySetupSchema } from '@/core/presets/types';

export const hygieneHaccpLogSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'hygiene_haccp_log',
  title: '위생 HACCP 및 보건증 관리 설정',
  description: '냉장/냉동 적정 온도 임계치 및 보건증 만료 사전 경고 일수를 구성합니다.',
  fields: [
    {
      id: 'refrigerator_max_temp',
      label: '냉장고 상한 기준 온도 (℃)',
      type: 'number',
      defaultValue: 5,
      description: '식품위생법 표준 냉장 보관 온도 상한선입니다.',
    },
    {
      id: 'freezer_max_temp',
      label: '냉동고 상한 기준 온도 (℃)',
      type: 'number',
      defaultValue: -18,
      description: '식품위생법 표준 냉동 보관 온도 상한선입니다.',
    },
    {
      id: 'health_cert_warning_days',
      label: '보건증 만료 사전 경고 일수 (D-Day)',
      type: 'number',
      defaultValue: 14,
      description: '조리/서빙 종사자의 보건증 만료 전 사전 경고를 노출할 일수입니다.',
    },
    {
      id: 'enable_tablet_quick_input',
      label: '주방 태블릿 원터치 온도 입력 모드',
      type: 'boolean',
      defaultValue: true,
      description: '주방 현장 태블릿에서 터치 한 번으로 실측 온도를 입력합니다.',
    },
  ],
};
