import { useState, type FC } from 'react';
import { BookOpenCheck, ChevronRight, Coins, Settings } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { useApp } from '@/context/AppContext';
import { RetailPointsSettingsView } from './RetailPointsSettingsView';
import { RETAIL_POINTS_COPY as COPY } from './retailPointsCopy';

type Panel = 'home' | 'points';

/** 설정 → 고객/포인트 → 포인트 적립 */
export const RetailSettingsView: FC = () => {
  const [panel, setPanel] = useState<Panel>('home');
  const { setActiveTab } = useApp();

  if (panel === 'points') {
    return <RetailPointsSettingsView onBack={() => setPanel('home')} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<Settings className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.settingsTitle}
        description={COPY.settingsDescription}
      />

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        점주·관리자만 상품·매출·직원·설정을 변경할 수 있습니다. 캐셔는 판매·고객·재고
        조회·판매내역만 사용합니다. POS 매출은 학원 수납 장부와 연동되지 않습니다.
      </p>

      <nav className="space-y-2" aria-label="설정 메뉴">
        <button
          type="button"
          onClick={() => setPanel('points')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200 p-4 min-h-[64px] active:bg-slate-50"
        >
          <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">
              {COPY.menuCustomerPoints}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              {COPY.menuCustomerPointsHint}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200 p-4 min-h-[64px] active:bg-slate-50"
        >
          <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0">
            <BookOpenCheck className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">일일 시재 마감</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              현금 시재 대조 (POS 판매내역과 분리)
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      </nav>
    </div>
  );
};
