import type { CapabilitySetupSchema } from '@/core/presets/types';

export const vehicleShuttleSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'vehicle_shuttle',
  title: '안심 통학 및 셔틀 차량 운행 관제 설정',
  description: '셔틀 차량별 노선(코스), 정류장 도착 사전 안내 시간(분) 및 승하차 체크 옵션을 설정합니다.',
  fields: [
    {
      id: 'arrivalNoticeLeadMinutes',
      label: '학부모 도착 사전 안내 시점 (분 전)',
      type: 'number',
      defaultValue: 3,
      required: true,
    },
    {
      id: 'enableSmsAlertOnBoarding',
      label: '원생 탑승 시 학부모 실시간 알림톡/문자 발송',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'defaultVehicleNames',
      label: '기본 운행 차량 명칭 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['1호차 (스타리아)', '2호차 (카니발)', '3호차 (대형버스)'],
    },
    {
      id: 'allowParentRideRequest',
      label: '학부모 포털에서 셔틀 승하차 변경/신청 허용',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
