import type { FC, ReactNode } from 'react';
import { UserCog } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import {
  DirectorFloatingFab,
  ToastContainer,
  ConfirmDialog,
} from '@/shared/components';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { RetailSidebar } from './layout/RetailSidebar';
import { RetailBottomNav } from './layout/RetailBottomNav';
import { RetailPlaceholderView } from './components/RetailPlaceholderView';
import { RetailHomeView } from './components/home/RetailHomeView';
import { ProductListView } from './components/products/ProductListView';
import { InventoryListView } from './components/inventory/InventoryListView';
import { SalePosView } from './components/sales/SalePosView';
import { SaleHistoryView } from './components/sales/SaleHistoryView';
import { RetailRevenueView } from './components/revenue/RetailRevenueView';
import { RetailSettingsView } from './components/settings/RetailSettingsView';
import { RetailCustomerHubView } from './components/customers/RetailCustomerHubView';

const retailSettingsHub = () => <RetailSettingsView />;

const RETAIL_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <RetailHomeView />,
  sales: () => <SalePosView />,
  retail: () => <ProductListView />,
  inventory: () => <InventoryListView />,
  members: () => <RetailCustomerHubView />,
  income: () => <SaleHistoryView />,
  reports: () => <RetailRevenueView />,
  instructors: () => (
    <RetailPlaceholderView
      title="직원"
      description="직원 관리가 곧 추가됩니다."
      icon={UserCog}
    />
  ),
  settings: retailSettingsHub,
  notices: retailSettingsHub,
  account: retailSettingsHub,
};

export const RetailAppContent: FC = () => {
  const { activeTab } = useApp();
  const { isOwner } = usePermissions();

  useTabGuard();

  const renderView = RETAIL_VIEW_MAP[activeTab] ?? RETAIL_VIEW_MAP.dashboard;

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">
      {isOwner && <DirectorFloatingFab />}
      {renderView()}
    </div>
  );
};
