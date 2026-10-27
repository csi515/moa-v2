import type { CapabilitySetupSchema } from '@/core/presets/types';

export const soundBroadcastScheduleSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'sound_broadcast_schedule',
  title: '원내 시보 및 안내방송 설정',
  description: '매장 스피커 자동 재생을 위한 기본 볼륨 및 주간 반복 정책을 설정합니다.',
  fields: [
    {
      id: 'default_broadcast_volume',
      label: '기본 방송 음량 (0~100%)',
      type: 'number',
      defaultValue: 70,
      description: '웹 브라우저 Web Audio API 자동 재생 시 적용할 기본 음량입니다.',
    },
    {
      id: 'enable_chime_bell',
      label: '방송 시작 전 딩동댕 차임벨 삽입',
      type: 'boolean',
      defaultValue: true,
      description: '안내 방송 음원 재생 직전 주의 환기용 신호음을 자동으로 합성 재생합니다.',
    },
  ],
};
