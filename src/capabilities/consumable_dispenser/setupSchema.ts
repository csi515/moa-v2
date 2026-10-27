import type { CapabilitySetupSchema } from '@/core/presets/types';

export const consumableDispenserSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'consumable_dispenser',
  title: '사내 소모품 불출 관리 설정',
  description: '직원 자율 불출 시 부서별 월간 소모품 예산 한도를 설정합니다.',
  fields: [
    {
      id: 'default_department_monthly_cap',
      label: '부서별 월간 소모품 한도액(원)',
      type: 'number',
      defaultValue: 300000,
      description: '부서별 과도한 소모품 소진 방지를 위한 알림 기준 금액입니다.',
    },
    {
      id: 'require_staff_pin',
      label: '불출 시 직원 PIN 번호 인증 요구',
      type: 'boolean',
      defaultValue: false,
      description: '사내 태블릿에서 소모품을 가져갈 때 직원 고유 번호 인증 여부입니다.',
    },
  ],
};
