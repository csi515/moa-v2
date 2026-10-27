import type { FC, ReactNode } from 'react';

/** 원장 홈 섹션 공통 empty */
export const DirectorSectionEmpty: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`text-xs text-slate-400 text-center py-4 ${className}`.trim()}>{children}</p>
);
