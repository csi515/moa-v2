import type { CapabilitySetupSchema } from '@/core/presets/types';

export const seatRoomSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'seat_room',
  title: '공간·좌석 시간 점유 설정',
  description: '총 좌석/룸 수와 기본 이용시간, 초과 페널티 요율, 퇴실 청소 필요 여부를 설정합니다.',
  fields: [
    {
      id: 'totalCapacity',
      label: '총 공간/좌석 수량 (개)',
      type: 'number',
      defaultValue: 20,
      required: true,
    },
    {
      id: 'defaultDurationMinutes',
      label: '기본 이용 단위 시간 (분)',
      type: 'number',
      defaultValue: 60,
      required: true,
    },
    {
      id: 'baseRatePerHour',
      label: '시간당 기본 요금 (원)',
      type: 'number',
      defaultValue: 3000,
    },
    {
      id: 'overduePenaltyRate',
      label: '초과 이용 할증 배율',
      type: 'number',
      defaultValue: 1.5,
      description: '정해진 시간 초과 시 적용할 할증 배율 (예: 1.5 = 150%)',
    },
    {
      id: 'requiresCleaning',
      label: '퇴실 시 청소/소독 프로세스 필수 여부',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
