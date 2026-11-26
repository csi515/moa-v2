import React, { type ReactNode } from 'react';

export interface PageHeaderProps {
  /** 좌측 아이콘 (Lucide Icon 컴포넌트 등) */
  icon?: ReactNode;
  /** 페이지 제목 */
  title: ReactNode;
  /** 제목 우측 카운트 또는 상태 배지 (예: 12 또는 '12명') */
  badge?: ReactNode;
  /** 서브 설명 문구 */
  description?: ReactNode;
  /** 우측 주요 액션 (버튼 그룹, 탭 세그먼트 컨트롤 등) */
  actions?: ReactNode;
  /** 아이콘 추가 클래스 (기본: text-slate-700) */
  iconClassName?: string;
  /** 밀도: 실무 SaaS 기본은 compact (text-lg) */
  density?: 'default' | 'compact';
  /** 컨테이너 추가 클래스 */
  className?: string;
}

/**
 * Moa-v2 공통 표준 페이지 헤더 (Standard Page Header)
 * - 앱 전체 페이지(학생, 시간표, 상담, 선생님, 수납, 장부, 설정 등)의 제목 영역 위계를 일원화
 * - [아이콘 + 제목 + 카운트 배지] 좌측 정렬 / [우측 주요 액션 또는 세그먼트 탭] 우측 정렬
 * - B2B SaaS 톤앤매너: text-slate-900 font-bold text-lg, text-slate-500 text-xs 서브 설명
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  badge,
  description,
  actions,
  iconClassName = 'text-slate-700',
  density = 'compact',
  className = '',
}) => {
  const isCompact = density === 'compact';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
      data-testid="page-header"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && (
            <span className={`${iconClassName} shrink-0 flex items-center`}>
              {icon}
            </span>
          )}
          <h1
            className={`font-bold text-slate-900 tracking-tight flex items-center gap-2 ${
              isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
            }`}
          >
            <span className="truncate">{title}</span>
          </h1>
          {badge !== undefined && badge !== null && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 rounded-full tabular-nums shrink-0">
              {badge}
            </span>
          )}
        </div>

        {description && (
          <p
            className={`text-slate-500 mt-1 leading-normal ${
              isCompact ? 'text-xs' : 'text-xs sm:text-sm'
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
