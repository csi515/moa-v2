import type { CapabilitySetupSchema } from '@/core/presets/types';

export const vehicleMileageLogSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'vehicle_mileage_log',
  title: '업무용 승용차 운행기록부 설정',
  description: '국세청 고시 기준 업무전용자동차 보험 및 운행기록부 감사 요건, 계기판 누적거리 역전 방지 검증을 설정합니다.',
  fields: [
    {
      id: 'enforce_odometer_continuity',
      label: '차량별 이전 운행 계기판 누적거리 자동 인터락',
      type: 'boolean',
      defaultValue: true,
      description: '이전 운행 기록의 도착 누적거리(km)보다 작은 출발 계기판 입력을 원천 차단합니다.',
    },
    {
      id: 'require_fuel_toll_receipt',
      label: '주유비 및 하이패스 정산 시 영수증 첨부 의무화',
      type: 'boolean',
      defaultValue: true,
      description: '차량 경비 지출 처리 시 사진 또는 전자영수증 첨부를 강제합니다.',
    },
    {
      id: 'target_business_ratio_percent',
      label: '목표 업무 사용 비율 (%)',
      type: 'number',
      defaultValue: 100,
      description: '국세청 손금 인정 100% 한도를 위한 업무(출퇴근+일반업무) 사용 비율 목표를 설정합니다.',
    },
  ],
};
