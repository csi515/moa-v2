import type { CapabilitySetupSchema } from '@/core/presets/types';

export const ndaPrivacyAuditSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'nda_privacy_audit',
  title: '개인정보 열람 감사 및 파기 정책',
  description: '주민등록번호/민감정보 열람 시 사유 입력 강제 및 보존 기한을 설정합니다.',
  fields: [
    {
      id: 'enforce_view_reason',
      label: '민감 개인정보 열람 시 열람 사유 입력 강제',
      type: 'boolean',
      defaultValue: true,
      description: '회원의 주민등록번호나 계좌번호 마스킹 해제 시 열람 사유 입력을 필수로 요구합니다.',
    },
    {
      id: 'unwithdrawn_purge_years',
      label: '탈퇴 회원 개인정보 영구 파기 주기(년)',
      type: 'number',
      defaultValue: 1,
      description: '회원 탈퇴 후 법정 보존 의무 기한 경과 시 자동 파기 큐로 이관하는 연한입니다.',
    },
  ],
};
