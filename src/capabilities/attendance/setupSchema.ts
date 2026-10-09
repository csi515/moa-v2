import type { CapabilitySetupSchema } from '@/core/presets/types';

export const attendanceSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'attendance',
  title: '출결 관리 설정',
  description: 'PIN 번호 기반 또는 QR 스캔 기반 출결 확인 방식을 설정합니다.',
  fields: [
    {
      id: 'checkInMethod',
      label: '체크인 인증 방식',
      type: 'select',
      defaultValue: 'pin',
      options: [
        { label: '4자리 PIN 번호 입력', value: 'pin' },
        { label: '1회용 QR 코드 스캔 (0원 비용)', value: 'qr' },
      ],
      required: true,
    },
    {
      id: 'autoCheckoutEnabled',
      label: '자동 하원/퇴실 처리',
      type: 'boolean',
      defaultValue: false,
      description: '설정된 이용 시간이 지나면 자동으로 퇴실 처리합니다.',
    },
    {
      id: 'makeupClassTracking',
      label: '보강/결석 추적 관리',
      type: 'boolean',
      defaultValue: true,
      description: '결석 시 보강 수업 필요 여부를 기록합니다.',
    },
  ],
};
