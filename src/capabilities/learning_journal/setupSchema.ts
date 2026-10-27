import type { CapabilitySetupSchema } from '@/core/presets/types';

export const learning_journalSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'learning_journal',
  title: '수업 일지 및 학부모 알림장 설정',
  description: '수업 일지 발행 시 학부모 포털 자동 노출 및 코멘트 허용 여부를 설정합니다.',
  fields: [
    {
      id: 'auto_publish_to_parent',
      label: '작성 즉시 학부모 포털 피드 공개',
      type: 'boolean',
      defaultValue: true,
      description: '선생님이 일지를 저장하면 즉시 학부모 안심 피드에 노출됩니다.',
    },
    {
      id: 'allow_parent_comments',
      label: '학부모 양방향 코멘트/답글 허용',
      type: 'boolean',
      defaultValue: true,
      description: '학부모가 일지에 확인 댓글 및 응원 코멘트를 남길 수 있습니다.',
    },
  ],
};
