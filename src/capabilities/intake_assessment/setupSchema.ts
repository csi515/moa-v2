import type { CapabilitySetupSchema } from '@/core/presets/types';

export const intake_assessmentSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'intake_assessment',
  title: '사전 문진표 및 위험 분석 설정',
  description: '현장 모바일 QR 문진표 작성 허용 여부 및 전자 서명 필수 여부를 설정합니다.',
  fields: [
    {
      id: 'enable_qr_intake',
      label: '현장 태블릿/QR 문진표 모바일 링크 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '매장 인포데스크 QR 코드로 첫 방문 고객이 본인 스마트폰에서 사전 문진표를 작성하도록 합니다.',
    },
    {
      id: 'require_sign',
      label: '문진표 전자 서명 필수 여부',
      type: 'boolean',
      defaultValue: true,
      description: '부상 및 과거 병력 고지 확인 서명을 필수 항목으로 지정합니다.',
    },
  ],
};

export const intakeAssessmentSetupSchema = intake_assessmentSetupSchema;
