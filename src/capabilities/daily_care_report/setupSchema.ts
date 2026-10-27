import type { CapabilitySetupSchema } from '@/core/presets/types';

export const daily_care_reportSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'daily_care_report',
  title: '일일 돌봄 알림장 및 케어 지표 설정',
  description: '모바일 0원 W3C SVG 안심 카드 자동 첨부 여부 및 식사 상태 필수 입력 여부를 설정합니다.',
  fields: [
    {
      id: 'auto_include_svg_card',
      label: '모바일 0원 SVG 안심 카드 자동 첨부',
      type: 'boolean',
      defaultValue: true,
      description: '알림장 공유 시 그래픽 요약 카드가 포함된 모바일 웹 링크를 자동 생성합니다.',
    },
    {
      id: 'require_meal_status',
      label: '식사 상태 필수 입력',
      type: 'boolean',
      defaultValue: true,
      description: '일일 알림장 전송 전 식사 및 간식 섭취 상태 입력을 필수로 제한합니다.',
    },
  ],
};

export const dailyCareReportSetupSchema = daily_care_reportSetupSchema;
