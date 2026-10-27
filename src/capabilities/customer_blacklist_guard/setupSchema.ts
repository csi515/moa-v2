import type { CapabilitySetupSchema } from '@/core/presets/types';

export const customerBlacklistGuardSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'customer_blacklist_guard',
  title: '출입 제한 및 블랙리스트 통제 설정',
  description: '제한 대상 고객의 예약/입장 시도 시 차단 및 관리자 경고 방식을 설정합니다.',
  fields: [
    {
      id: 'intercept_mode',
      label: '차단 모드',
      type: 'select',
      defaultValue: 'HARD_BLOCK',
      options: [
        { label: '완전 차단 (예약/입장 불가)', value: 'HARD_BLOCK' },
        { label: '관리자 경고 후 승인 (소프트 차단)', value: 'WARN_ADMIN' },
      ],
      description: '블랙리스트 등록 회원이 키오스크 체크인이나 예약을 시도할 때의 시스템 동작 정책입니다.',
    },
    {
      id: 'retention_audit_years',
      label: '증빙 자료 법정 보관 연한(년)',
      type: 'number',
      defaultValue: 3,
      description: '분쟁 방지를 위한 폭언/파손 관련 증빙 자료의 보관 기한입니다.',
    },
  ],
};
