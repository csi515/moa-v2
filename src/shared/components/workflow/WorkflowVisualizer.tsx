/**
 * Moa-v2 Interactive Workflow & Pipeline Visualizer (@xyflow/react 기반)
 * 
 * 전자결재 승인선, CRM 리드 체험 퍼널, 예약/수납 상태 전이 머신을
 * 시각적인 인터랙티브 노드 다이어그램(DAG)으로 표현합니다.
 */

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'done' | 'current' | 'pending';
  actor?: string;
}

export interface WorkflowVisualizerProps {
  steps: WorkflowStep[];
  className?: string;
  height?: number | string;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  steps,
  className = '',
  height = 200,
}) => {
  // 선형 단계들을 React Flow 노드 및 엣지로 자동 변환
  const nodes: Node[] = steps.map((step, idx) => {
    let bgColor = '#ffffff';
    let borderColor = '#cbd5e1';
    let textColor = '#64748b';

    if (step.status === 'done') {
      bgColor = '#f0fdf4';
      borderColor = '#86efac';
      textColor = '#166534';
    } else if (step.status === 'current') {
      bgColor = '#eef2ff';
      borderColor = '#818cf8';
      textColor = '#3730a3';
    }

    return {
      id: step.id,
      position: { x: idx * 180 + 30, y: 60 },
      data: {
        label: (
          <div className="text-center font-sans">
            <p className="text-xs font-bold leading-tight" style={{ color: textColor }}>
              {step.label}
            </p>
            {step.actor && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{step.actor}</p>
            )}
          </div>
        ),
      },
      style: {
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '10px 14px',
        width: 140,
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      },
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const isPast = steps[i].status === 'done';
    edges.push({
      id: `e-${steps[i].id}-${steps[i + 1].id}`,
      source: steps[i].id,
      target: steps[i + 1].id,
      animated: steps[i].status === 'current',
      style: {
        stroke: isPast ? '#22c55e' : '#94a3b8',
        strokeWidth: 2,
      },
    });
  }

  return (
    <div
      style={{ height }}
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} className="bg-white border-slate-200 shadow-2xs rounded-lg" />
      </ReactFlow>
    </div>
  );
};
