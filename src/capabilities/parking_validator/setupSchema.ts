import type { CapabilitySetupSchema } from '@/core/presets/types';

export const parking_validatorSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'parking_validator',
  title: '고객 무료 주차 등록 및 정산 설정',
  description: '방문 고객 기본 무료 주차 제공 시간 및 상가 관리소 주차권 권종을 설정합니다.',
  fields: [
    {
      id: 'default_free_minutes',
      label: '기본 무료 제공 시간 (분)',
      type: 'number',
      defaultValue: 60,
      description: '방문 시 기본으로 제공되는 무료 주차 시간입니다 (예: 60분, 120분).',
    },
    {
      id: 'parking_building_name',
      label: '주차 빌딩/상가 명칭',
      description: '주차 안내 시 표기될 상가 또는 지하 주차장 명칭입니다.',
      type: 'text',
      defaultValue: '상가 지하 주차장',
    },
    {
      id: 'auto_copy_notification',
      label: '주차 등록 완료 시 안내 텍스트 자동 복사',
      type: 'boolean',
      defaultValue: true,
      description: '차량 번호 등록 즉시 고객에게 전달할 확인 문구를 클립보드에 복사합니다.',
    },
  ],
};

export const parkingValidatorSetupSchema = parking_validatorSetupSchema;
