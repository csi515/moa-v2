import type { CapabilitySetupSchema } from '@/core/presets/types';

export const workplacePolicySetupSchema: CapabilitySetupSchema = {
  capabilityId: 'workplace_policy',
  title: '매장 내규·사규 관리 설정',
  description: '직원 복무 규정, 안전 수칙, 모바일 자필 서약 및 개정 사규 재서약 강제 여부를 설정합니다.',
  fields: [
    {
      id: 'enforceOnStaffLogin',
      label: '신규 입사자 로그인 시 필수 서약 강제',
      type: 'boolean',
      defaultValue: true,
      description: '필수 사규 미서약 직원은 시스템 접근 전 모바일 전자서약 화면으로 자동 이동합니다.',
    },
    {
      id: 'requireTouchSignature',
      label: '터치스크린 자필 서명 필수',
      type: 'boolean',
      defaultValue: true,
      description: '단순 체크박스를 넘어 법적/노무적 분쟁 예방을 위한 캔버스 자필 서명을 수집합니다.',
    },
    {
      id: 'reSignOnRevision',
      label: '사규 개정 시 기존 직원 재서약 강제',
      type: 'boolean',
      defaultValue: true,
      description: '규정 내용이나 수당 기준이 변경(버전 증가)되면 기존 직원에게 신규 서약을 요청합니다.',
    },
    {
      id: 'defaultPolicyTitle',
      label: '기본 사규집 명칭',
      type: 'text',
      defaultValue: '매장 복무 규정 및 고객 응대 서비스 수칙',
      required: true,
    },
  ],
};
