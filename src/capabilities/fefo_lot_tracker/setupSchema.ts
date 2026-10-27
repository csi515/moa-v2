import type { CapabilitySetupSchema } from '@/core/presets/types';

export const fefoLotTrackerSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'fefo_lot_tracker',
  title: 'FEFO 유통기한 선출 및 로트 추적 설정',
  description: '원자재 및 약제의 유통기한 임박 사전 알림 기준일과 폐기 잠금 정책을 설정합니다.',
  fields: [
    {
      id: 'expiry_warning_days',
      label: '유통기한 임박 경고 일수 (D-Day)',
      type: 'number',
      defaultValue: 30,
      description: '유통기한 만료 며칠 전부터 임박(Expiring Soon) 경고로 분류할지 지정합니다.',
    },
    {
      id: 'auto_lock_on_expiry',
      label: '유통기한 경과 시 불출/판매 자동 차단',
      type: 'boolean',
      defaultValue: true,
      description: '만료일이 지난 로트의 출고를 시스템에서 강제 차단합니다.',
    },
  ],
};
