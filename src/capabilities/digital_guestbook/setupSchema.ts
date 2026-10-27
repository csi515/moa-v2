import type { CapabilitySetupSchema } from '@/core/presets/types';

export const digital_guestbookSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'digital_guestbook',
  title: '전자 방명록 및 내방객 접수 설정',
  description: '워크인 내방객 태블릿 전자 서약 및 개인정보 보관 기간을 설정합니다.',
  fields: [
    {
      id: 'privacy_policy_text',
      label: '개인정보 수집 및 이용 안내 전문',
      description: '태블릿 방명록 작성 시 내방객에게 고지될 법정 개인정보 처리방침입니다.',
      type: 'text',
      defaultValue: '수집 항목: 성명, 연락처 / 수집 목적: 상담 및 안내 / 보유 기간: 상담 종료 후 1년 또는 파기 요청 시',
    },
    {
      id: 'require_referral_source',
      label: '유입 경로(방문 경로) 필수 기재',
      description: '인스타그램, 지인 추천, 전단지 등 유입 경로 선택을 필수로 유도합니다.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'auto_welcome_message',
      label: '내방 접수 즉시 환영 안내문 자동 복사',
      description: '내방객 정보 등록 시 카카오톡/문자 환영 인사말을 클립보드에 자동 조립합니다.',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

export const digitalGuestbookSetupSchema = digital_guestbookSetupSchema;
