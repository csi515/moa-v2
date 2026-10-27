import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  AlertTriangle,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Banknote,
  CreditCard,
  Flame,
  Award,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { inventoryService } from '../../services/inventoryService';
import { saleHistoryService } from '../../services/saleHistoryService';
import { retailRevenueService } from '../../services/retailRevenueService';
import type { RetailRevenueSummary } from '../../types/revenue';
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
 * Retail 홈 — 점주 데일리 브리핑 (순매출, 객단가, 베스트셀러, 마감 시재 대조)
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

  const goSalesHistory = () => {
    if (canAccess('income')) setActiveTab('income');
    else if (canAccess('reports')) setActiveTab('reports');
  };

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [stockRows, setStockRows] = useState<InventoryStockRow[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<RetailRevenueSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setSales([]);
      setStockRows([]);
      setRevenueSummary(null);
      return;
    }
    setLoading(true);
    try {
      const today = saleHistoryService.todayYmd();
      const range = retailRevenueService.resolvePresetRange('today', {
        fromYmd: today,
        toYmd: today,
      });
      const [todaySales, inventory, summary] = await Promise.all([
        saleHistoryService.listSales({
          organizationId: orgId,
          date: today,
        }),
        inventoryService.listStockRows(orgId),
        retailRevenueService.getSummary({
          organizationId: orgId,
          range,
        }),
      ]);
      setSales(todaySales);
      setStockRows(inventory);
      setRevenueSummary(summary);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setSales([]);
      setStockRows([]);
      setRevenueSummary(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayRevenue = useMemo(
    () => revenueSummary?.netSalesAmount ?? sales.reduce((sum, row) => sum + row.totalAmount, 0),
    [revenueSummary, sales]
  );
  const todayCount = sales.length;

  // [개선안 3-1] 객단가 (ATV - 1인당 평균 결제금액)
  const averageTicket = useMemo(() => {
    if (todayCount === 0) return 0;
    return Math.round(todayRevenue / todayCount);
  }, [todayRevenue, todayCount]);

  // [개선안 3-2] 오늘의 효자 상품 Top 5 (베스트셀러)
  const topProducts = useMemo(() => {
    if (!revenueSummary?.byProduct) return [];
    return [...revenueSummary.byProduct]
      .filter((p) => p.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [revenueSummary]);

  // [개선안 3-3] 결제수단별 매출 집계 (시재 대조용)
  const paymentCash = useMemo(() => {
    return revenueSummary?.byPayment.find((p) => p.paymentMethod === 'cash')?.amount ?? 0;
  }, [revenueSummary]);

  const paymentCard = useMemo(() => {
    return revenueSummary?.byPayment.find((p) => p.paymentMethod === 'card')?.amount ?? 0;
  }, [revenueSummary]);

  const paymentOther = useMemo(() => {
    if (!revenueSummary?.byPayment) return 0;
    return revenueSummary.byPayment
      .filter((p) => p.paymentMethod !== 'cash' && p.paymentMethod !== 'card')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [revenueSummary]);

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
          {/* 1. 핵심 경영 지표 4개 (순매출, 결제건수, 객단가, 재고부족) */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={goRevenueSummary}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                {COPY.todayRevenue}
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-black tabular-nums text-teal-700 truncate">
                {formatCurrency(todayRevenue)}
              </p>
            </button>

            <button
              type="button"
              onClick={goSalesHistory}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                {COPY.todaySaleCount}
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-black tabular-nums text-slate-900">
                {todayCount.toLocaleString('ko-KR')}
                <span className="text-sm font-bold text-slate-500 ml-1">
                  {COPY.saleCountUnit}
                </span>
              </p>
            </button>

            <button
              type="button"
              onClick={goRevenueSummary}
              className="min-h-[88px] rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-50"
            >
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" aria-hidden />
                평균 객단가 (1인당)
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-black tabular-nums text-indigo-700 truncate">
                {formatCurrency(averageTicket)}
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
                className={`mt-2 text-xl sm:text-2xl font-black tabular-nums ${
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

          {/* 2. [시재 대조 브리핑 바] 현금 돈통 vs 카드 단말기 전표 대조 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Banknote className="w-4 h-4 text-teal-600" />
                <span>오늘 결제수단별 매출 (마감 시재 대조)</span>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  현금 수납액:
                  <strong className="text-slate-900 font-bold tabular-nums">
                    {formatCurrency(paymentCash)}
                  </strong>
                  <span className="text-[10px] text-slate-400">(돈통 시재)</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                  카드 승인액:
                  <strong className="text-slate-900 font-bold tabular-nums">
                    {formatCurrency(paymentCard)}
                  </strong>
                  <span className="text-[10px] text-slate-400">(단말기 전표)</span>
                </span>
                {paymentOther > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      기타/복합:
                      <strong className="text-slate-900 font-bold tabular-nums">
                        {formatCurrency(paymentOther)}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 3. [2열 그리드] 오늘의 효자 상품 Top 5 vs 품절 임박 상품 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 오늘의 효자 상품 (베스트셀러 Top 5) */}
            <section className="space-y-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  오늘의 인기 베스트 Top 5
                </h2>
                <button
                  type="button"
                  onClick={goRevenueSummary}
                  className="text-xs font-bold text-teal-700 hover:underline"
                >
                  매출 통계
                </button>
              </div>

              {topProducts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                  오늘 판매된 상품 데이터가 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {topProducts.map((p, idx) => (
                    <li key={p.productNameSnapshot} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-700'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {p.productNameSnapshot}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 tabular-nums">
                          {p.quantity}개
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5 tabular-nums">
                          ({formatCurrency(p.amount)})
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 재고 부족 상품 Top 5 */}
            <section className="space-y-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {COPY.lowStockList}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs font-bold text-teal-700 hover:underline"
                >
                  {COPY.goInventory}
                </button>
              </div>

              {lowStockPreview.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                  {COPY.lowStockEmpty}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lowStockPreview.map((row) => (
                    <li key={`${row.productId}:${row.variantId ?? ''}`} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {row.productName}
                        </p>
                        {row.variantName && (
                          <p className="text-[10px] text-slate-400 truncate">{row.variantName}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-black tabular-nums ${
                          row.quantity <= 0 ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {row.quantity}개 남음
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* 4. 최근 판매 기록 */}
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
        </>
      )}
    </div>
  );
};
