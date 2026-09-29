import React, { type ReactNode } from 'react';

interface Props {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 설정/패널용 카드 컨테이너 */
export const SettingsCard: React.FC<Props> = ({ title, icon, children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3 ${className}`}
  >
    {title && (
      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
        {icon}
        {title}
      </h3>
    )}
    {children}
  </div>
);
