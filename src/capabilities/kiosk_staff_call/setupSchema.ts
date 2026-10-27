import type { CapabilitySetupSchema } from '@/core/presets/types';

export const kioskStaffCallSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'kiosk_staff_call',
  title: '좌석/룸 스마트 호출 & 디지털 벨보드 설정',
  description: '원터치 호출 요청 항목, 무음 소음 민원 접수 및 호출음 알림 기준을 설정합니다.',
  fields: [
    {
      id: 'enableSilentReport',
      label: '무음 소음 민원 접수 허용 (스터디카페 최적화)',
      type: 'boolean',
      defaultValue: true,
      description: '소음 발생 없이 좌석에서 직원 화면으로 직접 정숙 민원을 접수할 수 있습니다.',
    },
    {
      id: 'autoDismissMinutes',
      label: '처리 완료 건 자동 숨김 시간(분)',
      type: 'number',
      defaultValue: 15,
      description: '완료 처리된 호출 내역이 디지털 벨보드에서 자동으로 사라지는 시간입니다.',
    },
  ],
};
