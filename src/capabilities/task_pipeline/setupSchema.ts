import type { CapabilitySetupSchema } from '@/core/presets/types';

export const taskPipelineSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'task_pipeline',
  title: '주문 제작 및 수리 공정 파이프라인 설정',
  description: '공정 단계별 칸반 구성, 기본 SLA 목표 시간(시간) 및 완료 안내 알림을 설정합니다.',
  fields: [
    {
      id: 'defaultSlaHours',
      label: '단계별 기본 목표 처리 시간 (시간)',
      type: 'number',
      defaultValue: 24,
      required: true,
    },
    {
      id: 'enableReadyForPickupNotification',
      label: '픽업 준비 완료 시 고객 안내 생성',
      type: 'boolean',
      defaultValue: true,
      description: 'Web Share/클립보드 안내 텍스트를 자동 생성합니다 (0원 비용 원칙).',
    },
    {
      id: 'requireInspectionStep',
      label: '출고 전 필수 검수 단계 활성화',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'stages',
      label: '공정 파이프라인 단계 목록 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['접수 완료', '작업 진행 중', '품질 검수', '픽업 대기', '인도 완료'],
    },
  ],
};
