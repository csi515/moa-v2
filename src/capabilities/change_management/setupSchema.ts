import type { CapabilitySetupSchema } from '@/core/presets/types';

export const changeManagementSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'change_management',
  title: '공정 및 사양 4M 변경관리(ECN/ECO) 설정',
  description: '작업자(Man), 설비(Machine), 원자재(Material), 공정(Method) 사양 변경 시 사전 부서 합의 및 전자결재 전결 기준 설정',
  fields: [
    {
      id: 'mandatory_quality_review',
      label: '품질 부서 사전 영향도 평가 필수화',
      type: 'boolean',
      defaultValue: true,
      description: '모든 4M 변경건에 대해 품질관리 부서의 사전 승인 의견서 첨부를 의무화합니다.',
    },
    {
      id: 'auto_approval_workflow_link',
      label: '고위험(High/Critical) 변경 시 전자결재 승인선 자동 기안',
      type: 'boolean',
      defaultValue: true,
      description: '위험 수준이 높은 4M 변경 요청건은 대표/공장장 전결을 위한 전자결재 문서로 자동 상신합니다.',
    },
    {
      id: 'default_numbering_prefix',
      label: '변경 통지서 채번 접두어',
      type: 'text',
      defaultValue: 'ECN',
      description: '변경 통지서 발급 시 사용할 접두어를 설정합니다 (예: ECN, ECO).',
    },
  ],
};
