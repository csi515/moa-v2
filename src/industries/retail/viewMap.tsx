import type { FC, ReactNode } from 'react';
import { UserCog } from 'lucide-react';
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


export default RETAIL_VIEW_MAP;
