import type { CapabilitySetupSchema } from '@/core/presets/types';

export const lostCardRfidSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'lost_card_rfid',
  title: 'RF/NFC 출입 카드 관리 설정',
  description: '실물 카드 분실 시 재발급 수수료 및 보증금 반환 정책을 설정합니다.',
  fields: [
    {
      id: 'card_reissue_fee',
      label: '카드 분실 재발급 수수료(원)',
      type: 'number',
      defaultValue: 5000,
      description: '회원이 카드를 분실하여 신규 발급할 때 부과하는 기본 수수료입니다.',
    },
    {
      id: 'initial_deposit_required',
      label: '최초 발급 카드 보증금 여부',
      type: 'boolean',
      defaultValue: false,
      description: '카드 최초 발급 시 보증금을 부과하고 반납 시 환급할지 여부입니다.',
    },
  ],
};
