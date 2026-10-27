import type { CapabilitySetupSchema } from '@/core/presets/types';

export const entry_pass_ticketSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'entry_pass_ticket',
  title: '모바일 일일 입장권 및 검표 설정',
  description: 'W3C SVG 모바일 QR 티켓 자동 생성 및 중복 입장 방지 정책을 설정합니다.',
  fields: [
    {
      id: 'allow_reentry',
      label: '외출 후 당일 재입장 허용 여부',
      type: 'boolean',
      defaultValue: false,
      description: '퇴장 처리된 티켓의 당일 재입장 검표를 허용할지 여부입니다.',
    },
    {
      id: 'default_ticket_price',
      label: '기본 일반 일일 입장료 (원)',
      type: 'number',
      defaultValue: 15000,
      description: '현장 간편 발권 시 기본 적용되는 1회 입장료입니다.',
    },
  ],
};

export const entryPassTicketSetupSchema = entry_pass_ticketSetupSchema;
