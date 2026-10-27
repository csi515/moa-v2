import type { CapabilitySetupSchema } from '@/core/presets/types';

export const safetyWorkPermitSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'safety_work_permit',
  title: '안전작업허가서(PTW) 설정',
  description: '산업안전보건법 및 중대재해처벌법 대비 화기·밀폐·고소작업 인허가 및 가스농도 안전 기준을 설정합니다.',
  fields: [
    {
      id: 'require_safety_officer_dual_sign',
      label: '화기 및 밀폐작업 시 안전관리자 현장 입회 서명 필수',
      type: 'boolean',
      defaultValue: true,
      description: '부서장 승인 외에 자격증을 보유한 전담 안전관리자의 최종 승인을 강제합니다.',
    },
    {
      id: 'max_permit_validity_hours',
      label: '1회 작업허가서 최대 유효 시간 (시간)',
      type: 'number',
      defaultValue: 8,
      description: '작업허가서의 최장 유효시간을 제한하며, 초과 시 허가서를 재발급받아야 합니다.',
    },
    {
      id: 'enforce_closed_site_inspection',
      label: '작업 종료 후 현장 정리 및 잔류 불씨 확인 필수',
      type: 'boolean',
      defaultValue: true,
      description: '화기작업 종료 후 최소 30분간 잔류 불씨 감시 완료 서명을 요구합니다.',
    },
  ],
};
