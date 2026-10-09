import type { CapabilitySetupSchema } from '@/core/presets/types';

export const maintenanceChecklistSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'maintenance_checklist',
  title: '시설 점검 및 일일 루틴 설정',
  description: '오픈/마감 루틴 점검 주기 및 이상 수치 경고 기준을 설정합니다.',
  fields: [
    {
      id: 'routineRounds',
      label: '일일 기본 점검 회차',
      type: 'tags',
      defaultValue: ['오픈 준비', '중간 점검', '마감 청소'],
    },
    {
      id: 'notifyOnMissingTasks',
      label: '마감 시간 경과 시 관리자 알림',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'closingDeadlineTime',
      label: '당일 마감 최종 점검 기준 시각',
      type: 'time',
      defaultValue: '22:00',
    },
    {
      id: 'requirePhotoProof',
      label: '청소/방역 시 현장 사진 첨부 필수',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};
