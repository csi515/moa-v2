import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** 페이지 내부 데이터용 자리 표시. 전체 화면 spinner 대신 쓴다. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
    aria-hidden
  />
);

interface PageListSkeletonProps {
  rows?: number;
  message?: string;
}

export const PageListSkeleton: React.FC<PageListSkeletonProps> = ({
  rows = 4,
  message = '불러오는 중...',
}) => (
  <div className="space-y-3" role="status" aria-live="polite" aria-label={message}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    ))}
  </div>
);

interface InlineBusyProps {
  label?: string;
}

/** 백그라운드 refresh·작은 영역 로딩. 화면을 가리지 않는다. */
export const InlineBusy: React.FC<InlineBusyProps> = ({ label = '새로고침 중' }) => (
  <span
    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
    role="status"
    aria-live="polite"
  >
    <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
    {label}
  </span>
);
