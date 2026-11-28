import { useEffect, useState, type FC } from 'react';
import { BookOpenCheck, ChevronRight, Coins, FolderOpen, Settings, Warehouse } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { useApp } from '@/context/AppContext';
import { DESKTOP_CONTAINERS, RESPONSIVE_GRIDS } from '@/shared/styles/density';
import { cn } from '@/shared/lib/utils';
import { RetailPointsSettingsView } from './RetailPointsSettingsView';
import { RetailCategorySettingsView } from './RetailCategorySettingsView';
import { RetailWarehouseSettingsView } from './RetailWarehouseSettingsView';
import { RETAIL_POINTS_COPY as COPY } from './retailPointsCopy';
import {
  clearRetailSettingsPanel,
  peekRetailSettingsPanel,
  type RetailSettingsPanel,
} from './retailSettingsIntent';

type Panel = RetailSettingsPanel;

/** 설정 → 고객/포인트, 상품 카테고리, 시재 마감 */
export const RetailSettingsView: FC = () => {
  const [panel, setPanel] = useState<Panel>(() => peekRetailSettingsPanel() ?? 'home');
  const { setActiveTab } = useApp();

  useEffect(() => {
    const requested = peekRetailSettingsPanel();
    if (requested) setPanel(requested);
    clearRetailSettingsPanel();
  }, []);

  if (panel === 'points') {
    return <RetailPointsSettingsView onBack={() => setPanel('home')} />;
  }

  if (panel === 'categories') {
    return <RetailCategorySettingsView onBack={() => setPanel('home')} />;
  }

  if (panel === 'warehouses') {
    return <RetailWarehouseSettingsView onBack={() => setPanel('home')} />;
  }

  return (
    <div className={cn(DESKTOP_CONTAINERS.content, 'space-y-4 pb-8')}>
      <PageHeader
        icon={<Settings className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.settingsTitle}
        description={COPY.settingsDescription}
      />

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed">
        점주·관리자만 상품·매출·직원·설정을 변경할 수 있습니다. 캐셔는 판매·고객·재고
        조회·판매내역만 사용합니다. POS 매출은 별도 수납 장부와 연동되지 않습니다.
      </p>

      <nav className={RESPONSIVE_GRIDS.settings} aria-label="설정 메뉴">
        <button
          type="button"
          onClick={() => setPanel('points')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200/90 p-4 min-h-[64px] hover:border-teal-400 hover:shadow-xs transition-all active:bg-slate-50 cursor-pointer"
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
          onClick={() => setPanel('categories')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200/90 p-4 min-h-[64px] hover:border-teal-400 hover:shadow-xs transition-all active:bg-slate-50 cursor-pointer"
        >
          <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">
              {COPY.menuProductCategories}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              {COPY.menuProductCategoriesHint}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setPanel('warehouses')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200/90 p-4 min-h-[64px] hover:border-teal-400 hover:shadow-xs transition-all active:bg-slate-50 cursor-pointer"
        >
          <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 inline-flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{COPY.menuWarehouses}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{COPY.menuWarehousesHint}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className="w-full flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200/90 p-4 min-h-[64px] hover:border-teal-400 hover:shadow-xs transition-all active:bg-slate-50 cursor-pointer"
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
