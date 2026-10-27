import type { CapabilitySetupSchema } from '@/core/presets/types';

export const franchiseSupervisionSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'franchise_supervision',
  title: '가맹 본사 QSC 슈퍼바이징 설정',
  description: '슈퍼바이저 정기 순회 주기 및 등급 판정 기준 점수를 설정합니다.',
  fields: [
    {
      id: 'grade_a_threshold',
      label: '우수 등급(A) 기준 점수',
      type: 'number',
      defaultValue: 90,
      description: 'QSC 총점 100점 만점 중 A등급을 부여하는 최저 점수입니다.',
    },
    {
      id: 'corrective_action_days',
      label: '시정 명령 이행 기한(일)',
      type: 'number',
      defaultValue: 14,
      description: '지적 사항 발생 시 가맹점주가 개선 조치를 완료해야 하는 기본 기한입니다.',
    },
  ],
};
