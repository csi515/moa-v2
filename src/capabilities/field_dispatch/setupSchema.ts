import type { CapabilitySetupSchema } from '@/core/presets/types';

export const fieldDispatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'field_dispatch',
  title: '출장 및 방문 파견 설정',
  description: '방문 파견 기본 소요 시간, 이동 버퍼 시간 및 충돌 경고 정책을 설정합니다.',
  fields: [
    {
      id: 'default_duration_min',
      label: '기본 현장 작업 시간 (분)',
      type: 'number',
      defaultValue: 60,
      description: '출장 접수 시 적용할 기본 예상 작업 시간입니다.',
    },
    {
      id: 'default_buffer_min',
      label: '기본 이동 버퍼 시간 (분)',
      type: 'number',
      defaultValue: 30,
      description: '현장 간 이동 및 주차를 고려한 전후방 이동 버퍼 여유 시간입니다.',
    },
    {
      id: 'warn_overlap_only',
      label: '일정 중복 시 경고 후 등록 허용',
      type: 'boolean',
      defaultValue: true,
      description: '이동 버퍼 중복 발생 시 완전 차단 대신 사업주의 확인 후 등록을 허용합니다.',
    },
  ],
};
