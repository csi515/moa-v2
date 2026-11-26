import React, { useState, ReactNode } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

export interface EmptyStateGuideStep {
  stepNumber?: number;
  title: string;
  detail?: string;
}

export interface EmptyStateGuide {
  badge?: string;
  title: string;
  steps: EmptyStateGuideStep[];
  tip?: string;
}

export interface EmptyStateHeroProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  } | ReactNode;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } | ReactNode;
  guide?: EmptyStateGuide;
  defaultGuideOpen?: boolean;
  className?: string;
}

export const EmptyStateHero: React.FC<EmptyStateHeroProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  guide,
  defaultGuideOpen = false,
  className = '',
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(defaultGuideOpen);

  return (
    <div
      className={`bg-white rounded-xl p-6 sm:p-8 text-center border border-slate-200 shadow-2xs animate-in fade-in duration-200 max-w-xl mx-auto my-4 ${className}`}
      data-testid="empty-state-hero"
    >
      {/* 아이콘 배지 */}
      {icon && (
        <div className="mx-auto mb-3.5 w-11 h-11 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 animate-in zoom-in duration-200">
          {icon}
        </div>
      )}

      {/* 메인 타이틀 & 설명 */}
      <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {/* 액션 버튼 그룹 (단정하고 컴팩트한 실무형 크기) */}
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (React.isValidElement(action) ? (
              action
            ) : typeof action === 'object' && 'label' in action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                {action.icon}
                <span>{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" strokeWidth={1.5} />
              </button>
            ) : null)}

          {secondaryAction &&
            (React.isValidElement(secondaryAction) ? (
              secondaryAction
            ) : typeof secondaryAction === 'object' && 'label' in secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center px-3 py-1.5 min-h-[36px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            ) : null)}
        </div>
      )}

      {/* 첫 등록 30초 가이드 아코디언 */}
      {guide && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-left">
          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors text-slate-800 font-semibold text-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Lightbulb className="w-3 h-3" strokeWidth={1.5} />
              </span>
              <span>{guide.badge || '💡 시작 팁'}: {guide.title}</span>
            </div>
            {isGuideOpen ? <ChevronUp className="w-4 h-4 text-slate-400" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={1.5} />}
          </button>

          {isGuideOpen && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200/60 space-y-2 text-xs">
              {guide.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.stepNumber ?? idx + 1}
                  </span>
                  <div>
                    <strong className="text-slate-800">{step.title}</strong>
                    {step.detail && <p className="text-slate-500 text-[11px] mt-0.5">{step.detail}</p>}
                  </div>
                </div>
              ))}
              {guide.tip && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  {guide.tip}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
