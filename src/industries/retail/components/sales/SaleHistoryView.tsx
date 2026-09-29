import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Receipt } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import { FilterBar, FilterTabs, FORM_CONTROL_CLASS, SearchField } from '@/shared/components/ui';
import { formatCurrency, formatKoreanDate } from '@/utils/formatters';
import { saleHistoryService } from '../../services/saleHistoryService';
import { saleReturnService } from '../../services/saleReturnService';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleCustomerFilter,
  type SaleListItem,
  type SalePaymentFilter,
} from '../../types/sale';
import type { SaleItemReturnable } from '../../types/saleReturn';
import { HISTORY_PAYMENT_TABS, SALE_HISTORY_COPY as COPY } from './saleHistoryCopy';
import { SaleDetailModal, type SaleDetailData } from './SaleDetailModal';
import { SaleReturnModal } from './SaleReturnModal';

function formatSaleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function productLabel(row: SaleListItem): string {
  if (row.productSummaries.length === 0) return '-';
  const first = row.productSummaries[0];
  if (row.productSummaries.length === 1) return first;
  return `${first} ${COPY.moreProducts(row.productSummaries.length - 1)}`;
}

export const SaleHistoryView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [date, setDate] = useState(() => saleHistoryService.todayYmd());
  const [paymentFilter, setPaymentFilter] = useState<SalePaymentFilter>('ALL');
  const [customerFilter, setCustomerFilter] = useState<SaleCustomerFilter>('ALL');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SaleDetailData | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnLines, setReturnLines] = useState<SaleItemReturnable[]>([]);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(
        await saleHistoryService.listSales({
          organizationId: orgId,
          date,
          paymentMethod: paymentFilter,
          customerFilter,
        })
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, date, paymentFilter, customerFilter, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const saleNo = formatSaleNumber(row.id).toLowerCase();
      const hay = [
        saleNo,
        row.id.toLowerCase(),
        row.customerName?.toLowerCase() ?? '',
        ...row.productSummaries.map((p) => p.toLowerCase()),
      ].join(' ');
      return hay.includes(q);
    });
  }, [rows, search]);

  const mapDetail = async (saleId: string): Promise<SaleDetailData> => {
    if (!orgId) throw new Error(COPY.noOrg);
    const data = await saleHistoryService.getSaleDetail(orgId, saleId);
    const returns = await saleReturnService.listReturnsForSale(orgId, saleId);
    return {
      id: data.id,
      createdAt: data.createdAt,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      status: data.status,
      customerName: data.customerName,
      items: data.items,
      returnedQtyByItemId: data.returnedQtyByItemId,
      returns,
    };
  };

  const openDetail = async (saleId: string) => {
    if (!orgId) return;
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await mapDetail(saleId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openReturn = () => {
    if (!detail) return;
    const returnedMap = new Map<string, number>(
      Object.entries(detail.returnedQtyByItemId) as Array<[string, number]>
    );
    const lines = saleReturnService.buildReturnableLines(detail.items, returnedMap);
    if (!lines.some((l) => l.remainingQuantity > 0)) {
      showToast(COPY.returnNoneLeft, 'error');
      return;
    }
    setReturnLines(lines);
    setReturnOpen(true);
  };

  const handleReturnCompleted = async (refundAmount: number) => {
    showToast(COPY.returnSuccess(formatCurrency(refundAmount)), 'success');
    void load();
    if (detail) {
      try {
        setDetail(await mapDetail(detail.id));
      } catch {
        /* keep previous detail */
      }
    }
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Receipt className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 판매 내역을 확인할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        icon={<Receipt className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={COPY.description}
      />

      <FilterBar>
        <label className="flex flex-col gap-1 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-slate-500">{COPY.dateLabel}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px] w-full sm:w-auto`}
          />
        </label>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={COPY.searchPlaceholder}
          className="w-full sm:flex-1 sm:min-w-[200px]"
        />
      </FilterBar>

      <FilterTabs
        tabs={HISTORY_PAYMENT_TABS.map((t) => ({ id: t.id, label: t.label }))}
        active={paymentFilter}
        onChange={setPaymentFilter}
        activeClassName="bg-teal-600 text-white"
      />

      <FilterTabs
        tabs={[
          { id: 'ALL', label: COPY.customerAll },
          { id: 'MEMBER', label: COPY.customerMember },
          { id: 'GUEST', label: COPY.customerGuest },
        ]}
        active={customerFilter}
        onChange={setCustomerFilter}
        activeClassName="bg-slate-800 text-white"
      />

      <p className="text-xs font-bold text-slate-500">{formatKoreanDate(date)}</p>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-10 h-10" />}
          title={
            search || paymentFilter !== 'ALL' || customerFilter !== 'ALL'
              ? COPY.emptyFilterTitle
              : COPY.emptyTitle
          }
          description={
            search || paymentFilter !== 'ALL' || customerFilter !== 'ALL'
              ? COPY.emptyFilterDescription
              : COPY.emptyDescription
          }
        />
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => void openDetail(row.id)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 tabular-nums">
                      {COPY.saleNo} {formatSaleNumber(row.id)}
                    </p>
                    <p className="font-bold text-slate-900 mt-1">
                      {row.customerName ?? COPY.guestName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {productLabel(row)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{formatSaleTime(row.createdAt)}</p>
                    <p className="font-bold tabular-nums text-teal-700 mt-1">
                      {formatCurrency(row.totalAmount)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {SALE_PAYMENT_METHOD_LABELS[row.paymentMethod]}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-bold">{COPY.saleNo}</th>
                  <th className="px-4 py-3 font-bold">{COPY.saleTime}</th>
                  <th className="px-4 py-3 font-bold">{COPY.customer}</th>
                  <th className="px-4 py-3 font-bold">{COPY.products}</th>
                  <th className="px-4 py-3 font-bold text-right">{COPY.total}</th>
                  <th className="px-4 py-3 font-bold">{COPY.payment}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => void openDetail(row.id)}
                  >
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-800">
                      {formatSaleNumber(row.id)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatSaleTime(row.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.customerName ?? COPY.guestName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate">
                      {productLabel(row)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-teal-700">
                      {formatCurrency(row.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {SALE_PAYMENT_METHOD_LABELS[row.paymentMethod]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SaleDetailModal
        isOpen={detailOpen}
        detail={detail}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        onReturn={openReturn}
      />

      {detail && (
        <SaleReturnModal
          isOpen={returnOpen}
          organizationId={orgId}
          saleId={detail.id}
          lines={returnLines}
          onClose={() => setReturnOpen(false)}
          onCompleted={(amount) => void handleReturnCompleted(amount)}
          onError={(message) => showToast(message, 'error')}
        />
      )}
    </div>
  );
};
