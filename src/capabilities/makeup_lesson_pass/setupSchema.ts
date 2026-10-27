import type { CapabilitySetupSchema } from '@/core/presets/types';

export const makeup_lesson_passSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'makeup_lesson_pass',
  title: '결석 보강 티켓 및 슬롯 매칭 설정',
  description: '결석 발생 시 생성되는 보강권의 유효기간 및 학부모 셀프 예약 허용 여부를 설정합니다.',
  fields: [
    {
      id: 'default_token_validity_days',
      label: '보강권 기본 유효기간(일)',
      type: 'number',
      defaultValue: 30,
      description: '결석 발생일로부터 보강 수업을 신청할 수 있는 유효 일수입니다.',
    },
    {
      id: 'allow_self_service_booking',
      label: '학부모 직접 잔여 슬롯 신청 허용',
      type: 'boolean',
      defaultValue: true,
      description: '보호자가 모바일 링크를 통해 실시간 오픈된 잔여석을 조회하고 신청할 수 있습니다.',
    },
  ],
};

export const makeupLessonPassSetupSchema = makeup_lesson_passSetupSchema;
