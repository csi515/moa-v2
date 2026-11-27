import React, { useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { generateHazardDocNo, type StepHazardBlock } from '../domain/sopNumberingAndAuditEngine';
import { HAZARD_CATEGORIES, moveStep, moveStepByOffset, removeStep, updateStep } from '../domain/sopStepDocument';
import { SopStepPpeField } from './SopStepPpeField';

type Props = {
  docNo: string;
  steps: StepHazardBlock[];
  editable: boolean;
  onChange: (steps: StepHazardBlock[]) => void;
};

function levelClass(level: StepHazardBlock['initialLevel']): string {
  if (level === 'critical') return 'bg-red-600 text-white';
  if (level === 'high') return 'bg-amber-500 text-white';
  if (level === 'medium') return 'bg-yellow-400 text-slate-900';
  return 'bg-emerald-500 text-white';
}

export const SopStepMatrixTable: React.FC<Props> = ({ docNo, steps, editable, onChange }) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const change = (id: string, patch: Partial<StepHazardBlock>) => {
    onChange(updateStep(steps, id, patch));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 font-bold text-slate-600">
            <th className="w-28 px-2 py-3 text-center">순서</th>
            <th className="w-16 px-3 py-3.5 text-center">순번</th>
            <th className="w-[280px] px-4 py-3.5">작업 표준 단계 (SOP Action)</th>
            <th className="w-[280px] px-4 py-3.5">유해·위험요인 (Hazard)</th>
            <th className="w-28 px-3 py-3.5 text-center">초기 위험도</th>
            <th className="px-5 py-3.5">핵심 안전조치 및 SOP 통제기준</th>
            <th className="w-36 px-4 py-3.5">필수 보호구</th>
            <th className="w-28 px-3 py-3.5 text-center">개선후 위험도</th>
            <th className="w-32 px-4 py-3.5 text-center">담당 / 기한</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {steps.map((step, index) => (
            <tr
              key={step.id}
              className={step.initialLevel === 'critical' || step.initialLevel === 'high' ? 'bg-rose-50/30' : ''}
              onDragOver={(event) => {
                if (editable) event.preventDefault();
              }}
              onDrop={() => {
                if (!editable || dragIndex === null) return;
                onChange(moveStep(steps, dragIndex, index));
                setDragIndex(null);
              }}
            >
              <td className="px-2 py-3">
                {editable ? (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      draggable
                      aria-label={`${step.stepNumber}단계 끌어 이동`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                      onDragStart={() => setDragIndex(index)}
                      onDragEnd={() => setDragIndex(null)}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="h-11 w-11 rounded-lg border border-slate-200 bg-white text-sm font-bold"
                      aria-label={`${step.stepNumber}단계 위로`}
                      disabled={index === 0}
                      onClick={() => onChange(moveStepByOffset(steps, step.id, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="h-11 w-11 rounded-lg border border-slate-200 bg-white text-sm font-bold"
                      aria-label={`${step.stepNumber}단계 아래로`}
                      disabled={index === steps.length - 1}
                      onClick={() => onChange(moveStepByOffset(steps, step.id, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 text-rose-700"
                      aria-label={`${step.stepNumber}단계 삭제`}
                      onClick={() => onChange(removeStep(steps, step.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="block text-center text-slate-400">고정</span>
                )}
              </td>
              <td className="px-3 py-4 text-center font-black text-slate-500">
                {String(step.stepNumber).padStart(2, '0')}
              </td>
              <td className="px-4 py-4">
                {editable ? (
                  <input
                    className="h-11 w-full rounded-lg border border-slate-300 px-2 text-sm font-semibold"
                    aria-label={`${step.stepNumber}단계 작업 내용`}
                    value={step.actionTitle}
                    onChange={(event) => change(step.id, { actionTitle: event.target.value })}
                  />
                ) : (
                  <p className="text-sm font-black">{step.actionTitle}</p>
                )}
                <span className="mt-1 block text-[11px] text-slate-400">
                  RA 관리번호: {generateHazardDocNo(docNo, step.stepNumber)}
                </span>
              </td>
              <td className="px-4 py-4">
                {editable ? (
                  <div className="space-y-2">
                    <input
                      className="h-11 w-full rounded-lg border border-slate-300 px-2"
                      aria-label={`${step.stepNumber}단계 유해위험요인`}
                      value={step.hazardDesc}
                      onChange={(event) => change(step.id, { hazardDesc: event.target.value })}
                    />
                    <select
                      className="h-11 w-full rounded-lg border border-slate-300 px-2"
                      aria-label={`${step.stepNumber}단계 위험 분류`}
                      value={step.hazardCategory}
                      onChange={(event) => change(step.id, { hazardCategory: event.target.value })}
                    >
                      {HAZARD_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="font-semibold">{step.hazardDesc}</p>
                )}
              </td>
              <td className="px-3 py-4 text-center">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${levelClass(step.initialLevel)}`}>
                  {step.initialScore}점 ({step.initialLevel.toUpperCase()})
                </span>
                {editable ? (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="h-11 rounded-lg border border-slate-300 text-center"
                      aria-label={`${step.stepNumber}단계 초기 빈도`}
                      value={step.initialFreq}
                      onChange={(event) => change(step.id, { initialFreq: Number(event.target.value) })}
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="h-11 rounded-lg border border-slate-300 text-center"
                      aria-label={`${step.stepNumber}단계 초기 강도`}
                      value={step.initialSev}
                      onChange={(event) => change(step.id, { initialSev: Number(event.target.value) })}
                    />
                  </div>
                ) : (
                  <span className="mt-1 block text-[10px] text-slate-400">
                    빈도 {step.initialFreq} × 강도 {step.initialSev}
                  </span>
                )}
              </td>
              <td className="px-5 py-4">
                {editable ? (
                  <textarea
                    className="min-h-11 w-full rounded-lg border border-slate-300 p-2"
                    aria-label={`${step.stepNumber}단계 안전조치`}
                    value={step.sopControlMeasure}
                    onChange={(event) => change(step.id, { sopControlMeasure: event.target.value })}
                  />
                ) : (
                  <p className="font-bold text-slate-950">🛡️ {step.sopControlMeasure}</p>
                )}
              </td>
              <td className="px-4 py-4">
                {editable ? (
                  <SopStepPpeField
                    value={step.requiredPPE}
                    disabled={false}
                    onCommit={(requiredPPE) => change(step.id, { requiredPPE })}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {step.requiredPPE.map((item) => (
                      <span key={item} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-3 py-4 text-center">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                  {step.residualScore}점 ({step.residualLevel.toUpperCase()})
                </span>
                {editable ? (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="h-11 rounded-lg border border-slate-300 text-center"
                      aria-label={`${step.stepNumber}단계 개선후 빈도`}
                      value={step.residualFreq}
                      onChange={(event) => change(step.id, { residualFreq: Number(event.target.value) })}
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="h-11 rounded-lg border border-slate-300 text-center"
                      aria-label={`${step.stepNumber}단계 개선후 강도`}
                      value={step.residualSev}
                      onChange={(event) => change(step.id, { residualSev: Number(event.target.value) })}
                    />
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-4 text-center">
                {editable ? (
                  <div className="space-y-1">
                    <input
                      className="h-11 w-full rounded-lg border border-slate-300 px-2"
                      aria-label={`${step.stepNumber}단계 담당`}
                      value={step.assignee}
                      onChange={(event) => change(step.id, { assignee: event.target.value })}
                    />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-300 px-2"
                      aria-label={`${step.stepNumber}단계 기한`}
                      value={step.actionDeadline}
                      onChange={(event) => change(step.id, { actionDeadline: event.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-bold">{step.assignee}</p>
                    <p className="text-[11px] text-slate-500">{step.actionDeadline}</p>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
