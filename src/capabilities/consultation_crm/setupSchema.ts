import type { CapabilitySetupSchema } from '@/core/presets/types';

export const consultationCrmSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'consultation_crm',
  title: '고객 상담 일지 및 CRM 특이사항 설정',
  description: '상담 유형 분류, 자주 사용하는 고객 특이사항 태그 및 재등록 D-Day 알림 시점을 설정합니다.',
  fields: [
    {
      id: 'defaultTags',
      label: '고객 관심사/특이사항 추천 태그 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['허리디스크', '초보자', '학부모케어', '집중관리', '이벤트참여'],
    },
    {
      id: 'reEnrollmentNoticeLeadDays',
      label: '재등록 권유 D-Day 알림 기준일 (만료 N일 전)',
      type: 'number',
      defaultValue: 7,
      required: true,
    },
    {
      id: 'enableParentSharedLog',
      label: '보호자 안심 알림 공유 허용',
      type: 'boolean',
      defaultValue: true,
      description: 'Web Share/클립보드로 상담 요약을 원클릭 전달합니다.',
    },
  ],
};
