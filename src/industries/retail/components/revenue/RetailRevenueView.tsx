import { useCallback, useEffect, useState, type FC } from 'react';
import { BarChart3 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { FilterBar, FilterTabs, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { formatCurrency } from '@/utils/formatters';
import { retailRevenueService } from '../../services/retailRevenueService';
import { SALE_PAYMENT_METHOD_LABELS } from '../../types/sale';
import type {
  RevenueDateRange,
  RevenuePeriodPreset,
  RetailRevenueSummary,
} from '../../types/revenue';
import { REVENUE_PERIOD_TABS, RETAIL_REVENUE_COPY as COPY } from './retailRevenueCopy';

/**
 * Retail 매출 관리.
 * Gross(completed)·Returns·Net을 구분 표시. Finance·포인트 잔액 미사용.
 */
export const RetailRevenueView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [preset, setPreset] = useState<RevenuePeriodPreset>('today');
  const [customFrom, setCustomFrom] = useState(() => retailRevenueService.todayYmd());
  const [customTo, setCustomTo] = useState(() => retailRevenueService.todayYmd());
  const [summary, setSummary] = useState<RetailRevenueSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const custom: RevenueDateRange = { fromYmd: customFrom, toYmd: customTo };
      const range = retailRevenueService.resolvePresetRange(preset, custom);
      const data = await retailRevenueService.getSummary({
        organizationId: orgId,
        range,
      });
      setSummary(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, preset, customFrom, customTo, showToast]);

  useEffect(() => {
    if (preset === 'custom') {
      setSummary(null);
      return;
    }
    void load();
  }, [preset, orgId, load]);

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<BarChart3 className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 매출을 확인할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={COPY.description}
      />

      <FilterTabs
        tabs={REVENUE_PERIOD_TABS}
        active={preset}
        onChange={setPreset}
        activeClassName="bg-teal-600 text-white"
      />

      {preset === 'custom' && (
        <FilterBar>
          <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <span className="text-[11px] font-bold text-slate-500">{COPY.fromLabel}</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <span className="text-[11px] font-bold text-slate-500">{COPY.toLabel}</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-[44px] px-4 rounded-xl bg-teal-600 text-white text-sm font-bold self-end"
          >
            {COPY.applyRange}
          </button>
        </FilterBar>
      )}

      {summary && (
        <p className="text-xs font-bold text-slate-500">
          {COPY.rangeLabel(summary.range.fromYmd, summary.range.toYmd)}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">{COPY.loading}</p>
      ) : !summary ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          {preset === 'custom' ? COPY.customHint : COPY.paymentEmpty}
        </p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold text-slate-500">{COPY.totalSales}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-teal-700">
                {formatCurrency(summary.totalSalesAmount)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{COPY.totalSalesHint}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold text-slate-500">{COPY.saleCount}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                {summary.saleCount.toLocaleString('ko-KR')}
                <span className="text-sm font-bold text-slate-500 ml-1">
                  {COPY.saleCountUnit}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 col-span-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-amber-800">{COPY.returnAmount}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-amber-900">
                    {formatCurrency(summary.totalReturnAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-amber-800">{COPY.returnCount}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-amber-900">
                    {summary.returnCount.toLocaleString('ko-KR')}
                    {COPY.countUnit}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-amber-800/80 mt-2">{COPY.returnHint}</p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 col-span-2">
              <p className="text-[11px] font-bold text-teal-800">{COPY.netSales}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-teal-900">
                {formatCurrency(summary.netSalesAmount)}
              </p>
              <p className="text-[11px] text-teal-800/70 mt-1">{COPY.netSalesHint}</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">{COPY.paymentSection}</h2>
            <p className="text-[11px] text-slate-500">{COPY.paymentHint}</p>
            {summary.byPayment.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {COPY.paymentEmpty}
              </p>
            ) : (
              <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {summary.byPayment.map((row) => (
                  <li
                    key={row.paymentMethod}
                    className="px-4 py-3 flex justify-between items-center gap-3 min-h-[48px]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        {SALE_PAYMENT_METHOD_LABELS[row.paymentMethod]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.count.toLocaleString('ko-KR')}
                        {COPY.countUnit}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-teal-700">
                      {formatCurrency(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">{COPY.productSection}</h2>
            <p className="text-[11px] text-slate-500">{COPY.productHint}</p>
            {summary.byProduct.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {COPY.productEmpty}
              </p>
            ) : (
              <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {summary.byProduct.map((row) => (
                  <li
                    key={row.key}
                    className="px-4 py-3 flex justify-between items-start gap-3 min-h-[48px]"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 truncate">
                        {row.productNameSnapshot}
                      </span>
                      <span className="text-xs text-slate-500">
                        {COPY.productQty}{' '}
                        {row.quantity.toLocaleString('ko-KR')}
                        {COPY.qtyUnit}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] font-bold text-slate-400">
                        {COPY.productAmount}
                      </span>
                      <span className="font-bold tabular-nums text-slate-900">
                        {formatCurrency(row.amount)}
                      </span>
                    </span>
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
