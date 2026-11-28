import type { ReactNode } from 'react';
import { lazy, Suspense, useState, useEffect } from 'react';
import { RetailHomeView } from './components/home/RetailHomeView';
import { ProductListView } from './components/products/ProductListView';
import { SalePosView } from './components/sales/SalePosView';
import { SaleHistoryView } from './components/sales/SaleHistoryView';
import { RetailRevenueView } from './components/revenue/RetailRevenueView';
import { RetailSettingsView } from './components/settings/RetailSettingsView';
import { RetailCustomerHubView } from './components/customers/RetailCustomerHubView';
import { RetailStaffHubView } from './components/staff/RetailStaffHubView';
import { LedgerClosingView, type PosDailySummary } from '@/capabilities/ledger_simple';
import { retailRevenueService } from './services/retailRevenueService';
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
const WorkplaceCalendarView = lazy(() =>
  import('@/capabilities/scheduling/calendar').then((m) => ({
    default: m.WorkplaceCalendarView,
  }))
);

const retailSettingsHub = () => <RetailSettingsView />;

function RetailLedgerView() {
  const { setActiveTab } = useApp();
  const { currentOrganization } = useOrganization();
  const preset = getIndustryPreset(currentOrganization?.industry_type);
  const showHandover = Boolean(preset?.businessRules?.shiftHandoverCashCount);
  const orgId = currentOrganization?.id;

  const [posSummary, setPosSummary] = useState<PosDailySummary | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    const today = retailRevenueService.todayYmd();
    (async () => {
      try {
        const data = await retailRevenueService.getSummary({
          organizationId: orgId,
          range: { fromYmd: today, toYmd: today },
        });
        if (cancelled) return;
        const cashRow = data.byPayment.find((p) => p.paymentMethod === 'cash');
        const cardRow = data.byPayment.find((p) => p.paymentMethod === 'card');
        setPosSummary({
          cashNet: cashRow?.amount ?? 0,
          cardNet: cardRow?.amount ?? 0,
          totalNet: data.netSalesAmount,
          count: data.saleCount,
        });
      } catch {
        if (!cancelled) setPosSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return (
    <LedgerClosingView
      showPosSeparationNote={false}
      posDailySummary={posSummary}
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
  /** 예전 재고 탭 주소는 상품 화면으로 연결 */
  inventory: () => <ProductListView />,
  members: () => <RetailCustomerHubView />,
  income: () => <SaleHistoryView />,
  reports: () => <RetailRevenueView />,
  instructors: () => <RetailStaffHubView />,
  calendar: () => lazyCap(<WorkplaceCalendarView />, '캘린더'),
  ledger: () => <RetailLedgerView />,
  closing: () => <RetailLedgerView />,
  shifts: () => lazyCap(<ShiftScheduleView />, '근무표'),
  maintenance: () => lazyCap(<MaintenanceChecklistView />, '점검'),
  settings: retailSettingsHub,
  notices: retailSettingsHub,
  account: retailSettingsHub,
};

export default RETAIL_VIEW_MAP;
