import type { CapabilitySetupSchema } from '@/core/presets/types';

export const pickupOrdersSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'pickup_orders',
  title: '사전 예약 픽업 주문 관리',
  description: '수령 희망 일시 지정 주문 접수 및 제작, 픽업 대기 4단계 칸반 파이프라인을 설정합니다.',
  fields: [
    {
      id: 'defaultLeadTimeHours',
      label: '최소 사전 예약 리드타임 (시간)',
      type: 'number',
      defaultValue: 2,
      description: '픽업 희망 일시는 현재 시각으로부터 최소 몇 시간 이후부터 가능한지 지정합니다.',
      required: true,
    },
    {
      id: 'autoNotifyOnReady',
      label: '픽업 대기 시 자동 알림톡/인앱 알림 발송',
      type: 'boolean',
      defaultValue: true,
      description: '상품 제작이 완료되어 픽업 대기 상태로 변경될 때 고객에게 즉시 수령 안내 알림을 전송합니다.',
    },
    {
      id: 'enableCustomLettering',
      label: '주문 시 각인/레터링 옵션 허용',
      type: 'boolean',
      defaultValue: true,
      description: '케이크 레터링 문구, 꽃다발 리본 메시지, 가죽 각인 등 커스텀 입력 필드를 활성화합니다.',
    },
  ],
};
