import type { CapabilitySetupSchema } from '@/core/presets/types';

export const event_contest_hubSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'event_contest_hub',
  title: '원내 발표회 및 대회 심사 설정',
  description: '참가자 큐시트 순번 자동 채번 및 W3C SVG 모바일 전자 상장 자동 발급 여부를 설정합니다.',
  fields: [
    {
      id: 'auto_issue_svg_award',
      label: '심사 완료 시 모바일 W3C SVG 전자 상장 즉시 발행',
      type: 'boolean',
      defaultValue: true,
      description: '심사 점수 확정 즉시 학생 및 학부모 모바일로 W3C SVG 공식 상장을 제공합니다.',
    },
    {
      id: 'default_entry_fee',
      label: '기본 참가비 (원)',
      type: 'number',
      defaultValue: 30000,
      description: '행사 등록 시 기본 설정되는 참가비입니다.',
    },
  ],
};

export const eventContestHubSetupSchema = event_contest_hubSetupSchema;
