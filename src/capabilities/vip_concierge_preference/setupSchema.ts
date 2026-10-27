import type { CapabilitySetupSchema } from '@/core/presets/types';

export const vipConciergePreferenceSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'vip_concierge_preference',
  title: 'VIP 컨시어지 및 의전 설정',
  description: 'VIP 고객 예약 시 알러지 및 주의사항을 담당 직원 화면에 팝업할지 여부를 설정합니다.',
  fields: [
    {
      id: 'auto_alert_allergies_on_checkin',
      label: '체크인/예약 시 알러지 경고 강제 표시',
      type: 'boolean',
      defaultValue: true,
      description: 'VIP 회원이 입장할 때 알러지 주의 팝업을 담당자에게 띄웁니다.',
    },
    {
      id: 'mask_private_topics_for_staff',
      label: '사적 금지 화제 일반 직원에게 마스킹',
      type: 'boolean',
      defaultValue: false,
      description: '민감한 개인 사유 화제 금지 노트를 점장/매니저급 이상만 열람하도록 제한합니다.',
    },
  ],
};
