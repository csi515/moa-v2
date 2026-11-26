import React from 'react';

export type ProcessStepperStep = {
  id: string;
  label: string;
};

export type ProcessStepperProps = {
  steps: ProcessStepperStep[];
  currentStep: number;
  className?: string;
};

/**
 * 도메인 비종속 단계 스테퍼. currentStep은 0-based 인덱스.
 */
export function ProcessStepper({
  steps,
  currentStep,
  className = '',
}: ProcessStepperProps) {
  if (!steps.length) return null;

  const safeIndex = Math.max(0, Math.min(currentStep, steps.length - 1));

  return (
    <ol
      className={`flex w-full items-start gap-0 overflow-x-auto ${className}`}
      aria-label="진행 단계"
    >
      {steps.map((step, index) => {
        const isDone = index < safeIndex;
        const isCurrent = index === safeIndex;
        const circleClass = isDone
          ? 'bg-slate-900 text-white border-indigo-600'
          : isCurrent
            ? 'bg-white text-slate-700 border-indigo-600 ring-2 ring-indigo-200'
            : 'bg-slate-50 text-slate-400 border-slate-200';

        return (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-1 flex-col items-center px-1"
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={`absolute left-1/2 top-5 h-0.5 w-full ${
                  isDone ? 'bg-indigo-500' : 'bg-slate-200'
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full border-2 text-sm font-bold ${circleClass}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isDone ? '✓' : index + 1}
            </span>
            <span
              className={`mt-2 max-w-[6.5rem] text-center text-xs font-semibold leading-snug ${
                isCurrent ? 'text-indigo-800' : isDone ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
