import type { CapabilitySetupSchema } from '@/core/presets/types';

export const rentalEquipmentSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'rental_equipment',
  title: '기구·비품 대여 및 회수 정책',
  description: '대여 식별자 방식(바코드/관리번호), 기본 대여 시간 및 시간당 연체료 정책을 설정합니다.',
  fields: [
    {
      id: 'taggingMethod',
      label: '비품 식별자 관리 방식',
      type: 'select',
      defaultValue: 'ASSET_NUMBER',
      options: [
        { label: '관리 번호 스티커/라벨', value: 'ASSET_NUMBER' },
        { label: '바코드 / QR 라벨 스캔', value: 'BARCODE' },
        { label: 'RFID 태그', value: 'RFID' },
      ],
      required: true,
    },
    {
      id: 'defaultRentalHours',
      label: '기본 대여 허용 시간 (시간)',
      type: 'number',
      defaultValue: 2,
      required: true,
    },
    {
      id: 'lateFeePerHour',
      label: '시간당 반납 지연금 (원)',
      type: 'number',
      defaultValue: 5000,
    },
    {
      id: 'requireDamageCheck',
      label: '반납 시 상태 점검 필수 여부',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
