import type { CapabilitySetupSchema } from '@/core/presets/types';

export const fieldAuditTrailSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'field_audit_trail',
  title: '필드 감사 추적 및 이력 보존 설정',
  description: '주요 마스터 데이터 및 금액/할인율 변경 시 사유 입력 필수 여부를 설정합니다.',
  fields: [
    {
      id: 'require_reason_on_critical_fields',
      label: '수강료/할인율/단가 변경 시 사유 입력 필수',
      type: 'boolean',
      defaultValue: true,
      description: '금액 관련 중요 필드를 수정할 때 변경 사유를 적지 않으면 수정을 차단합니다.',
    },
    {
      id: 'retention_days',
      label: '감사 로그 보존 기간 (일)',
      type: 'number',
      defaultValue: 365,
      description: '데이터 변경 감사 추적 로그를 보존할 기간(일)입니다.',
    },
  ],
};
