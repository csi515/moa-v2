import type { CapabilitySetupSchema } from '@/core/presets/types';

export const emergency_alert_broadcastSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'emergency_alert_broadcast',
  title: '긴급 휴원 및 재난 공지 설정',
  description: '기상악화 및 시설 장애 발생 시 기본 보강 규정 및 보호자 수신확인 추적을 설정합니다.',
  fields: [
    {
      id: 'default_makeup_policy',
      label: '기본 결강/휴원 보강 규정 안내문',
      description: '긴급 휴원 공지 시 기본 삽입될 보강 및 수강료 이월 정책입니다.',
      type: 'text',
      defaultValue: '천재지변 및 안전 휴원으로 인한 휴강은 전원 지정일에 100% 보강 수업을 제공합니다.',
    },
    {
      id: 'auto_track_acknowledgment',
      label: '모바일 수신 확인(Acknowledge) 필수 수집',
      description: '학부모가 긴급 공지를 열람하고 확인 버튼을 눌렀는지 실시간 집계합니다.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'urgent_call_unconfirmed_after_minutes',
      label: '미확인자 유선 연락 권장 시간 (분)',
      description: '공지 발령 후 해당 시간이 지나도 확인하지 않은 학부모에게 유선 연락 알림을 띄웁니다.',
      type: 'number',
      defaultValue: 60,
    },
  ],
};

export const emergencyAlertBroadcastSetupSchema = emergency_alert_broadcastSetupSchema;
