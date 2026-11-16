import React, { ReactNode } from 'react';
import { EmptyStateHero, type EmptyStateGuide } from './EmptyStateHero';

export type { EmptyStateGuide, EmptyStateGuideStep, EmptyStateHeroProps } from './EmptyStateHero';
export { EmptyStateHero };

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode | { label: string; onClick: () => void; icon?: ReactNode };
  secondaryAction?: ReactNode | { label: string; onClick: () => void };
  guide?: EmptyStateGuide;
  variant?: 'standard' | 'hero';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  guide,
  variant = 'standard',
  className = '',
}) => {
  if (variant === 'hero' || guide) {
    return (
      <EmptyStateHero
        icon={icon}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
        guide={guide}
        className={className}
      />
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-6 sm:p-8 text-center border border-slate-200 animate-in fade-in duration-300 ${className}`}>
      <div className="mx-auto mb-3 text-slate-300 animate-in zoom-in duration-300 delay-75">{icon}</div>
      <h3 className="font-bold text-slate-700 text-sm sm:text-base animate-in slide-in-from-bottom-2 duration-300 delay-100">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-snug animate-in slide-in-from-bottom-2 duration-300 delay-150">{description}</p>}
      {action && (
        <div className="mt-4 animate-in slide-in-from-bottom-2 duration-300 delay-200">
          {React.isValidElement(action)
            ? action
            : typeof action === 'object' && 'label' in action
            ? (
              <button
                type="button"
                onClick={(action as { onClick: () => void; label: string }).onClick}
                className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
              >
                {(action as { onClick: () => void; label: string }).label}
              </button>
            )
            : null}
        </div>
      )}
    </div>
  );
};
