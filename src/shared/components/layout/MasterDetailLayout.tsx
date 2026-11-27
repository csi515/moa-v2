import type { ReactNode, FC } from 'react';
import { cn } from '@/shared/lib/utils';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';

export interface MasterDetailLayoutProps {
  /** 좌측 마스터(목록/검색) 뷰 */
  master: ReactNode;
  /** 우측 디테일(상세/작성/내역) 뷰 */
  detail: ReactNode;
  /** 현재 선택된 항목의 고유 ID (null/undefined면 미선택) */
  selectedId: string | null | undefined;
  /** 상세에서 목록으로 복귀하는 콜백 (모바일 뷰 전환 시 사용) */
  onBack?: () => void;
  /** 데스크톱에서 아무 항목도 선택되지 않았을 때 우측 상세 영역에 표시할 뷰 */
  emptyDetail?: ReactNode;
  /** 데스크톱 12열 그리드 기준 좌-우 비율 (기본 '5-7': 좌 41.6%, 우 58.3%) */
  ratio?: '4-8' | '5-7' | '6-6';
  /** 최상단 컨테이너 커스텀 클래스 */
  className?: string;
  /** 마스터 패널 독립 스크롤/고정(Sticky) 여부 (기본 true) */
  stickyMaster?: boolean;
}

const RATIO_CLASSES = {
  '4-8': {
    master: 'lg:col-span-4 xl:col-span-4',
    detail: 'lg:col-span-8 xl:col-span-8',
  },
  '5-7': {
    master: 'lg:col-span-5 xl:col-span-5',
    detail: 'lg:col-span-7 xl:col-span-7',
  },
  '6-6': {
    master: 'lg:col-span-6 xl:col-span-6',
    detail: 'lg:col-span-6 xl:col-span-6',
  },
} as const;

/**
 * 데스크톱 2패널(Master-Detail) 스플릿 & 모바일 화면전환 자동 대응 반응형 레이아웃 프리미티브
 *
 * - 모바일 (<1024px): selectedId 유무에 따라 목록 또는 상세 화면을 단일 화면으로 전환
 * - 데스크톱 (≥1024px): 좌측 목록(Master) + 우측 상세(Detail)를 12그리드로 동시 노출
 */
export const MasterDetailLayout: FC<MasterDetailLayoutProps> = ({
  master,
  detail,
  selectedId,
  emptyDetail,
  ratio = '5-7',
  className,
  stickyMaster = true,
}) => {
  const isSelected = Boolean(selectedId);
  const ratioConfig = RATIO_CLASSES[ratio];

  return (
    <div className={cn(DESKTOP_CONTAINERS.wide, 'space-y-4 pb-8', className)} data-testid="master-detail-layout">
      {/* 
        모바일 뷰 (<1024px, lg:hidden):
        - 항목 미선택 시: 마스터(목록) 전체 표시
        - 항목 선택 시: 디테일(상세) 전체 표시
      */}
      <div className="block lg:hidden">
        {isSelected ? (
          <div data-testid="mobile-detail-pane">{detail}</div>
        ) : (
          <div data-testid="mobile-master-pane">{master}</div>
        )}
      </div>

      {/* 
        데스크톱 뷰 (≥1024px, hidden lg:grid):
        - 좌측 마스터 패널 + 우측 디테일 패널을 나란히 2열 스플릿으로 표시
      */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-5 items-start" data-testid="desktop-split-pane">
        {/* 좌측 Master 패널 */}
        <section
          className={cn(
            ratioConfig.master,
            'min-w-0 space-y-4',
            stickyMaster && 'lg:sticky lg:top-[85px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto pr-1'
          )}
          data-testid="desktop-master-col"
          aria-label="목록 선택"
        >
          {master}
        </section>

        {/* 우측 Detail 패널 */}
        <section
          className={cn(ratioConfig.detail, 'min-w-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs')}
          data-testid="desktop-detail-col"
          aria-label="상세 정보"
        >
          {isSelected ? (
            detail
          ) : (
            emptyDetail ?? (
              <div className="py-20 text-center text-slate-400 space-y-2" data-testid="master-detail-empty-default">
                <p className="text-sm font-semibold text-slate-600">선택된 항목이 없습니다</p>
                <p className="text-xs text-slate-400">좌측 목록에서 항목을 클릭하여 상세 정보를 확인하세요.</p>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
};
