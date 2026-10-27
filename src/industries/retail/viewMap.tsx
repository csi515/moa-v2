import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { RetailHomeView } from './components/home/RetailHomeView';
import { ProductListView } from './components/products/ProductListView';
import { InventoryListView } from './components/inventory/InventoryListView';
import { SalePosView } from './components/sales/SalePosView';
import { SaleHistoryView } from './components/sales/SaleHistoryView';
import { RetailRevenueView } from './components/revenue/RetailRevenueView';
import { RetailSettingsView } from './components/settings/RetailSettingsView';
import { RetailCustomerHubView } from './components/customers/RetailCustomerHubView';
import { RetailStaffHubView } from './components/staff/RetailStaffHubView';
import { LedgerClosingView } from '@/capabilities/ledger_simple';
import { useApp } from '@/context/AppContext';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

const ShiftScheduleView = lazy(() =>
  import('@/capabilities/shift_schedule').then((m) => ({
    default: m.ShiftScheduleManagementView,
  }))
);
const MaintenanceChecklistView = lazy(() =>
  import('@/capabilities/maintenance_checklist').then((m) => ({
    default: m.MaintenanceChecklistManagementView,
  }))
);

const retailSettingsHub = () => <RetailSettingsView />;

function RetailLedgerView() {
  const { setActiveTab } = useApp();
  const { currentOrganization } = useOrganization();
  const preset = getIndustryPreset(currentOrganization?.industry_type);
  const showHandover = Boolean(preset?.businessRules?.shiftHandoverCashCount);

  return (
    <LedgerClosingView
      showPosSeparationNote
      handoverHint={
        showHandover
          ? {
              label: '교대 점검 체크리스트 열기',
              onNavigate: () => setActiveTab('maintenance'),
            }
          : undefined
      }
    />
  );
}

const lazyCap = (node: ReactNode, label: string) => (
  <Suspense fallback={<div className="p-8 text-center text-slate-400">{label} 불러오는 중...</div>}>
    {node}
  </Suspense>
);

const RETAIL_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <RetailHomeView />,
  sales: () => <SalePosView />,
  retail: () => <ProductListView />,
  inventory: () => <InventoryListView />,
  members: () => <RetailCustomerHubView />,
  income: () => <SaleHistoryView />,
  reports: () => <RetailRevenueView />,
  instructors: () => <RetailStaffHubView />,
  ledger: () => <RetailLedgerView />,
  closing: () => <RetailLedgerView />,
  shifts: () => lazyCap(<ShiftScheduleView />, '근무표'),
  maintenance: () => lazyCap(<MaintenanceChecklistView />, '점검'),
  settings: retailSettingsHub,
  notices: retailSettingsHub,
  account: retailSettingsHub,
};

export default RETAIL_VIEW_MAP;
