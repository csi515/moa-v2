import type { CapabilitySetupSchema } from '@/core/presets/types';

export const digitalContractSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'digital_contract',
  title: '현장 전자계약 & 환불 규정 서명 보관 설정',
  description: '공정거래위원회 표준 위약금 요율(%), 태블릿 자필 전자서명 필수 및 계약 만료 알림 정책을 설정합니다.',
  fields: [
    {
      id: 'defaultPenaltyRatePercent',
      label: '공정위 표준 중도 해지 위약금 요율 (%)',
      type: 'number',
      defaultValue: 10,
      required: true,
      description: '중도 해약 시 총 계약금액에서 공제할 위약금 비율입니다 (표준약관 기준 10%).',
    },
    {
      id: 'requireCanvasTouchSignature',
      label: '태블릿 터치스크린 자필 전자서명 필수',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'enabledContractTypes',
      label: '사용할 계약서 양식 목록 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['1:1 PT 표준계약서', '헬스/피트니스 회원권 계약서', '학원 수강 등록원서', '직원/강사 근로계약서'],
    },
    {
      id: 'archiveStorageYears',
      label: '전자계약서 법적 의무 보관 연한 (년)',
      type: 'number',
      defaultValue: 5,
    },
  ],
};
