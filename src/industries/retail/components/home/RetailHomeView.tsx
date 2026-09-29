import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  AlertTriangle,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { inventoryService } from '../../services/inventoryService';
import { saleHistoryService } from '../../services/saleHistoryService';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleListItem,
} from '../../types/sale';
import {
  INVENTORY_LOW_STOCK_THRESHOLD,
  type InventoryStockRow,
} from '../../types/inventory';
import { RETAIL_HOME_COPY as COPY } from './retailHomeCopy';

const RECENT_SALES_LIMIT = 5;
const LOW_STOCK_LIST_LIMIT = 5;

function isLowStock(row: InventoryStockRow): boolean {
  return row.quantity <= INVENTORY_LOW_STOCK_THRESHOLD;
}

function formatSaleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function productSummary(row: SaleListItem): string {
  if (row.productSummaries.length === 0) return '-';
  const first = row.productSummaries[0];
  if (row.productSummaries.length === 1) return first;
  return `${first} ${COPY.moreSales(row.productSummaries.length - 1)}`;
}

/**
 * Retail 홈 — 오늘 Sale / Inventory만 사용 (별도 통계 시스템·더미·차트 없음).
 */
export const RetailHomeView: FC = () => {
  const { showToast, setActiveTab } = useApp();
  const { canAccess } = usePermissions();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const goRevenueSummary = () => {
    if (canAccess('reports')) setActiveTab('reports');
    else if (canAccess('income')) setActiveTab('income');
  };

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [stockRows, setStockRows] = useState<InventoryStockRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setSales([]);
      setStockRows([]);
      return;
    }
    setLoading(true);
    try {
      const today = saleHistoryService.todayYmd();
      const [todaySales, inventory] = await Promise.all([
        saleHistoryService.listSales({
          organizationId: orgId,
          date: today,
        }),
        inventoryService.listStockRows(orgId),
      ]);
      setSales(todaySales);
      setStockRows(inventory);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setSales([]);
      setStockRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayRevenue = useMemo(
    () => sales.reduce((sum, row) => sum + row.totalAmount, 0),
    [sales]
  );
  const todayCount = sales.length;
  const lowStock = useMemo(() => stockRows.filter(isLowStock), [stockRows]);
  const recentSales = useMemo(() => sales.slice(0, RECENT_SALES_LIMIT), [sales]);
  const lowStockPreview = useMemo(
    () => lowStock.slice(0, LOW_STOCK_LIST_LIMIT),
    [lowStock]
  );

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<LayoutDashboard className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 홈을 확인할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8" data-testid="director-home">
      <PageHeader
        icon={<LayoutDashboard className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={COPY.description}
      />

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">{COPY.loading}</p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={goRevenueSummary}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                {COPY.todayRevenue}
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums text-teal-700">
                {formatCurrency(todayRevenue)}
              </p>
            </button>

            <button
              type="button"
              onClick={goRevenueSummary}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                {COPY.todaySaleCount}
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">
                {todayCount.toLocaleString('ko-KR')}
                <span className="text-sm font-bold text-slate-500 ml-1">
                  {COPY.saleCountUnit}
                </span>
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                {COPY.lowStockCount}
              </p>
              <p
                className={`mt-2 text-2xl font-black tabular-nums ${
                  lowStock.length > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {lowStock.length.toLocaleString('ko-KR')}
                <span className="text-sm font-bold text-slate-500 ml-1">
                  {COPY.stockCountUnit}
                </span>
              </p>
            </button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">{COPY.recentSales}</h2>
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className="text-xs font-bold text-teal-700 min-h-[44px] px-2"
              >
                {COPY.goSalesHistory}
              </button>
            </div>
            {recentSales.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                {COPY.recentSalesEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {recentSales.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('income')}
                      className="w-full min-h-[56px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-500 tabular-nums">
                            {formatSaleNumber(row.id)} · {formatSaleTime(row.createdAt)}
                          </p>
                          <p className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                            {row.customerName ?? COPY.guestName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {productSummary(row)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold tabular-nums text-teal-700">
                            {formatCurrency(row.totalAmount)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {SALE_PAYMENT_METHOD_LABELS[row.paymentMethod]}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">{COPY.lowStockList}</h2>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-teal-700 min-h-[44px] px-2"
              >
                {COPY.goInventory}
              </button>
            </div>
            {lowStockPreview.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                {COPY.lowStockEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {lowStockPreview.map((row) => (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="w-full min-h-[52px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 flex items-center gap-2">
                        <Package
                          className={`w-4 h-4 shrink-0 ${
                            row.quantity <= 0 ? 'text-rose-500' : 'text-amber-600'
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block font-bold text-sm text-slate-900 truncate">
                            {row.productName}
                          </span>
                          {row.variantName && (
                            <span className="block text-xs text-slate-500 truncate">
                              {row.variantName}
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          row.quantity <= 0 ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {row.quantity.toLocaleString('ko-KR')}
                        {COPY.qtyUnit}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
