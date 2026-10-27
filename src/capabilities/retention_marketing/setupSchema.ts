import type { CapabilitySetupSchema } from '@/core/presets/types';

export const retentionMarketingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'retention_marketing',
  title: '자동화 리텐션 및 이탈 방지 마케팅 설정',
  description: '수강권/이용권 만료 D-Day 알림 및 시술 주기 맞춤 예약 알림톡 트리거를 구성합니다.',
  fields: [
    {
      id: 'passExpiringDaysWindow',
      label: '수강권 만료 사전 알림 일수 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['7', '3', '1', '0'],
      required: true,
    },
    {
      id: 'cooldownDays',
      label: '동일 고객 알림 재발송 제한 쿨다운 (일)',
      type: 'number',
      defaultValue: 7,
      required: true,
    },
    {
      id: 'autoQueueEnabled',
      label: '매일 아침 발송 대기 큐 자동 생성',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'includeRenewalDiscountLink',
      label: '메시지에 온라인 재등록/결제 링크 포함',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
