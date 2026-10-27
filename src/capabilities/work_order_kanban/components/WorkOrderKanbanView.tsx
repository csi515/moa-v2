import React from 'react';
import { TaskPipelineKanbanView } from '@/capabilities/task_pipeline/ui/TaskPipelineKanbanView';

/**
 * 정비/수선 작업 지시서 (Work Order) 칸반 뷰
 *
 * 본 컴포넌트는 하위 호환성을 완벽히 유지하면서 전사 작업 공정 파이프라인
 * (task_pipeline)의 Refine DB 영속화 엔진으로 단일화되어 동작합니다.
 */
export const WorkOrderKanbanView: React.FC = () => {
  return (
    <TaskPipelineKanbanView
      defaultOrderType="repair"
      title="정비·수리 작업 지시서 (Work Order)"
      subtitle="자동차 정비, 부품 발주 대기, 단계별 정비 공정 및 품질 검수를 실시간 관리합니다."
    />
  );
};
