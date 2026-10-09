import type { CapabilitySetupSchema } from '@/core/presets/types';

export const safetyConsentSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'safety_consent',
  title: '전자 동의서 및 안전 서약서 설정',
  description: '부상 면책 서약서, 시설 이용 동의서 양식 및 캔버스 전자 서명 필수 여부를 설정합니다.',
  fields: [
    {
      id: 'requireCanvasSignature',
      label: '터치스크린 캔버스 자필 서명 필수',
      type: 'boolean',
      defaultValue: true,
      description: '단순 체크박스를 넘어 법적 증빙을 위한 자필 서명을 수집합니다.',
    },
    {
      id: 'requireGuardianForMinors',
      label: '만 14세 미만 미성년자 법정대리인 동의 필수',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'consentValidityMonths',
      label: '서약서 효력 유효기간 (개월)',
      type: 'number',
      defaultValue: 12,
      description: '설정 기간 경과 후 재방문 시 갱신 서약을 요청합니다.',
    },
    {
      id: 'defaultWaiverTitle',
      label: '기본 서약서 명칭',
      type: 'text',
      defaultValue: '시설 이용 및 안전 수칙 준수 서약서',
      required: true,
    },
  ],
};
