import type { CapabilitySetupSchema } from '@/core/presets/types';

export const certificateIssuanceSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'certificate_issuance',
  title: '증명서 및 수료증 발급 설정',
  description: '발급 번호 접두어 및 직인 날인 이미지 설정을 관리합니다.',
  fields: [
    {
      id: 'cert_serial_prefix',
      label: '발급 번호 접두어',
      type: 'text',
      defaultValue: 'MOA-CERT',
      description: '증명서 상단에 표기되는 고유 채번 접두사입니다 (예: ACAD-2026-001).',
    },
    {
      id: 'organization_seal_title',
      label: '직인/발행인 표기 명칭',
      type: 'text',
      defaultValue: '원장 직인 생략',
      description: '수료증/증명서 하단에 인쇄되는 발행 기관장 명칭입니다.',
    },
  ],
};
