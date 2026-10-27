import type { CapabilitySetupSchema } from '@/core/presets/types';

export const instructorMatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'instructor_match',
  title: '강사 및 담당자 매칭 설정',
  description: '강사 배정 방식(전담 지정제 / 순환제) 및 1인당 동시 세션 제한 규칙을 설정합니다.',
  fields: [
    {
      id: 'assignmentMode',
      label: '강사 배정 방식',
      type: 'select',
      defaultValue: 'DEDICATED',
      options: [
        { label: '고객별 전담 지정제 (1:1 고정 강사)', value: 'DEDICATED' },
        { label: '스케줄 자율 예약 매칭제', value: 'FLEXIBLE' },
        { label: '관리자 수동 배정제', value: 'MANUAL' },
      ],
      required: true,
    },
    {
      id: 'defaultSessionMinutes',
      label: '세션 기본 수업 시간 (분)',
      type: 'number',
      defaultValue: 50,
      required: true,
    },
    {
      id: 'bufferMinutesBetweenSessions',
      label: '세션 간 휴식/준비 버퍼 시간 (분)',
      type: 'number',
      defaultValue: 10,
    },
    {
      id: 'preventDoubleBooking',
      label: '강사 동시간대 중복 배정 엄격 차단',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
