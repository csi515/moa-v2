import type { CapabilitySetupSchema } from '@/core/presets/types';

export const serviceWarrantyClaimSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'service_warranty_claim',
  title: '시술 무상 A/S 및 리터치 보증 정책',
  description: '펌, 염색, 네일, 반영구, 맞춤수선 등의 시술 후 무상 보증 기간(일)을 설정합니다.',
  fields: [
    {
      id: 'default_warranty_days',
      label: '기본 무상 A/S 보증 기간(일)',
      type: 'number',
      defaultValue: 7,
      description: '시술 완료일로부터 무상 리터치 접수가 가능한 기간입니다 (예: 7일 이내).',
    },
    {
      id: 'require_photo_evidence',
      label: '하자 증빙 사진 첨부 필수 여부',
      type: 'boolean',
      defaultValue: true,
      description: '고객 무상 리터치 접수 시 시술 부위 하자 사진 등록을 필수로 강제합니다.',
    },
  ],
};
