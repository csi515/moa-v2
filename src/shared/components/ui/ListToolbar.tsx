import React, { ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ListToolbarTabItem {
  key: string;
  label: string;
  count?: number;
  countTone?: 'default' | 'alert';
}

export interface ListToolbarFilterButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  activeCount?: number;
  ariaLabel?: string;
  buttonLabel?: string;
}

export interface ListToolbarProps {
  /** 좌측 상태 필터 탭 목록 (예: 재원, 휴원, 퇴원, 전체) */
  tabs?: ListToolbarTabItem[];
  activeTab?: string;
  onTabChange?: (tabKey: string) => void;

  /** 검색창 설정 */
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  /** 필터 토글 버튼 설정 */
  filterButton?: ListToolbarFilterButtonProps;

  /** 요약 또는 상태 문구 (예: "표시 중: 0명 (재원)") */
  summaryText?: ReactNode;

  /** 검색창 우측 또는 탭 우측에 추가할 보조 액션 */
  extraActions?: ReactNode;

  /** 필터 펼침 패널 내용 (children) */
  children?: ReactNode;

  className?: string;
}

/**
 * 실무형 B2B SaaS 목록 툴바 컴포넌트 (토스 비즈니스 / Linear 스타일)
 *
 * 좌측 상태 세그먼트 탭 + 우측 컴팩트 인라인 검색창 및 필터 버튼을 한 줄로 배치하여
 * 목록 상단의 수직 공간을 극대화하고 시각적 밀도를 정돈합니다.
 */
export const ListToolbar: React.FC<ListToolbarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = '검색어를 입력하세요...',
  filterButton,
  summaryText,
  extraActions,
  children,
  className = '',
}) => {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-3', className)}>
      {/* 1. 상단 인라인 바: 좌측 세그먼트 탭 + 우측 검색 및 필터 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* 좌측: 상태 탭 (슬림 세그먼트 컨트롤) */}
        {tabs && tabs.length > 0 && onTabChange ? (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                    isActive
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50'
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        'tabular-nums text-[11px] font-semibold px-1 rounded-sm',
                        isActive
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-400'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        {/* 우측: 인라인 검색창 + [필터] 버튼 + 보조 액션 */}
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
          {summaryText && (
            <div className="text-xs text-slate-500 mr-1 hidden sm:block">
              {summaryText}
            </div>
          )}

          {onSearchChange && (
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  title="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}

          {filterButton && (
            <button
              type="button"
              onClick={filterButton.onToggle}
              aria-expanded={filterButton.isOpen}
              aria-label={filterButton.ariaLabel || '상세 필터'}
              className={cn(
                'min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors border cursor-pointer whitespace-nowrap',
                filterButton.isOpen || (filterButton.activeCount && filterButton.activeCount > 0)
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{filterButton.buttonLabel || '필터'}</span>
              {filterButton.activeCount !== undefined && filterButton.activeCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-md font-semibold">
                  {filterButton.activeCount}
                </span>
              )}
            </button>
          )}

          {extraActions}
        </div>
      </div>

      {/* 모바일 화면에서 summaryText가 있을 때 */}
      {summaryText && (
        <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 sm:hidden flex items-center justify-between">
          {summaryText}
        </div>
      )}

      {/* 2. 하단 확장 상세 필터 패널 */}
      {filterButton?.isOpen && children && (
        <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
