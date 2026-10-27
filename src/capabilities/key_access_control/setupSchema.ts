import type { CapabilitySetupSchema } from '@/core/presets/types';

export const keyAccessControlSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'key_access_control',
  title: '열쇠 및 도어락 출입 보안 설정',
  description: '도어락 비밀번호 정기 교체 권고 주기(일) 및 열쇠 미반납 경고 기준을 설정합니다.',
  fields: [
    {
      id: 'pin_rotation_cycle_days',
      label: '도어락 비밀번호 교체 주기(일)',
      type: 'number',
      defaultValue: 90,
      description: '각 실별 디지털 도어락 비밀번호 정기 교체 권장 주기(일)입니다.',
    },
    {
      id: 'enforce_checkout_purpose',
      label: '물리 열쇠 불출 시 사용 사유 필수 입력',
      type: 'boolean',
      defaultValue: true,
      description: '마스터키나 비품실 열쇠 대여 시 용도 기재를 강제합니다.',
    },
  ],
};
