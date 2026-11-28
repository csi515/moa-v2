import { useEffect, useState, type FC } from 'react';
import { BookOpenCheck, Coins, FolderOpen, Settings, Warehouse } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { SettingsNavTile } from '@/shared/components/ui';
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
        <SettingsNavTile
          title={COPY.menuCustomerPoints}
          hint={COPY.menuCustomerPointsHint}
          icon={<Coins className="w-5 h-5" />}
          onClick={() => setPanel('points')}
        />
        <SettingsNavTile
          title={COPY.menuProductCategories}
          hint={COPY.menuProductCategoriesHint}
          icon={<FolderOpen className="w-5 h-5" />}
          onClick={() => setPanel('categories')}
        />
        <SettingsNavTile
          title={COPY.menuWarehouses}
          hint={COPY.menuWarehousesHint}
          icon={<Warehouse className="w-5 h-5" />}
          onClick={() => setPanel('warehouses')}
        />
        <SettingsNavTile
          title="일일 시재 마감"
          hint="현금 시재 대조 (POS 판매내역과 분리)"
          icon={<BookOpenCheck className="w-5 h-5" />}
          onClick={() => setActiveTab('ledger')}
        />
      </nav>
    </div>
  );
};
