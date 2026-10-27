import type { CapabilitySetupSchema } from '@/core/presets/types';

export const level_assessmentSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'level_assessment',
  title: '정기 승급 심사 및 합격증 설정',
  description: '정기 심사 커트라인 점수 및 모바일 전자 합격증 자동 발급 여부를 설정합니다.',
  fields: [
    {
      id: 'default_passing_score',
      label: '기본 합격 커트라인 점수 (100점 만점 기준)',
      type: 'number',
      defaultValue: 70,
      description: '심사 총점이 해당 기준 이상일 때 자동으로 합격 처리 및 증서가 생성됩니다.',
    },
    {
      id: 'auto_issue_certificate',
      label: '합격 시 모바일 전자 합격증 즉시 발행',
      type: 'boolean',
      defaultValue: true,
      description: '합격 판정 즉시 W3C SVG 전자 합격증을 생성하여 학부모 안심 포털로 공유합니다.',
    },
  ],
};
