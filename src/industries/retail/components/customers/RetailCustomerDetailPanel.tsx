import type { FC } from 'react';
import { ArrowLeft, Coins, Receipt } from 'lucide-react';
import { CoreCustomerInfoCard } from '@/core/customer/components/CoreCustomerInfoCard';
import type { CustomerProfile } from '@/core/customer/services/customerLinkService';
import {
  POINT_TRANSACTION_TYPE_LABELS,
  type PointTransaction,
} from '@/capabilities/commerce';
import { PageHeader } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleListItem,
} from '../../types/sale';
import { RETAIL_CUSTOMER_COPY as COPY } from './customerCopy';
import {
  formatPointAmount,
  formatPointDateTime,
} from './customerPointsFormat';

export type RetailCustomerDetailData = {
  profile: CustomerProfile;
  balance: number;
  purchaseCount: number;
  latestAmount: number;
  recentSales: SaleListItem[];
  recentTransactions: PointTransaction[];
};

interface Props {
  data: RetailCustomerDetailData | null;
  loading: boolean;
  onBack: () => void;
  onOpenPoints: () => void;
  onOpenSale: (saleId: string) => void;
}

/**
 * Retail 고객 상세.
 * Core 기본 정보(CoreCustomerInfoCard) + 구매·포인트 요약.
 */
export const RetailCustomerDetailPanel: FC<Props> = ({
  data,
  loading,
  onBack,
  onOpenPoints,
  onOpenSale,
}) => (
  <div className="p-4 sm:p-6 space-y-4">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-slate-600"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      {COPY.detailBack}
    </button>

    <PageHeader
      title={COPY.detailTitle}
      description={data?.profile.name ?? ''}
    />

    {loading || !data ? (
      <p className="text-sm text-slate-500 py-8 text-center">{COPY.detailLoading}</p>
    ) : (
      <>
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {COPY.detailCoreSection}
          </h3>
          <CoreCustomerInfoCard customer={data.profile} />
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {COPY.detailPurchaseSection}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold text-slate-500">
                {COPY.detailPurchaseCount}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {data.purchaseCount.toLocaleString('ko-KR')}
                <span className="text-sm font-bold text-slate-500 ml-0.5">
                  {COPY.detailPurchaseCountUnit}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold text-slate-500">
                {COPY.detailLatestAmount}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-teal-700">
                {formatCurrency(data.latestAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">
              {COPY.detailRecentPurchases}
            </p>
            {data.recentSales.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                {COPY.detailPurchaseEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recentSales.map((sale) => (
                  <li key={sale.id}>
                    <button
                      type="button"
                      onClick={() => onOpenSale(sale.id)}
                      className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" aria-hidden />
                          {formatSaleNumber(sale.id)}
                        </span>
                        <span className="text-sm font-bold tabular-nums text-teal-700">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        {sale.productSummaries[0] ?? '-'}
                        {sale.itemCount > 1
                          ? ` 외 ${sale.itemCount - 1}건`
                          : ''}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatPointDateTime(sale.createdAt)} ·{' '}
                        {SALE_PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {COPY.detailPointsSection}
          </h3>
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-xs font-bold text-teal-800">
              {COPY.detailPointsBalance}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-teal-900">
              {data.balance.toLocaleString('ko-KR')}
              {COPY.pointsUnit}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">
              {COPY.detailRecentPoints}
            </p>
            {data.recentTransactions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                {COPY.detailPointsEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recentTransactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex justify-between items-start gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-500">
                        {POINT_TRANSACTION_TYPE_LABELS[tx.type]}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatPointDateTime(tx.createdAt)}
                      </p>
                      {tx.description?.trim() && (
                        <p className="text-xs text-slate-700 mt-0.5 truncate">
                          {tx.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums shrink-0 ${
                        tx.amount >= 0 ? 'text-teal-700' : 'text-slate-900'
                      }`}
                    >
                      {formatPointAmount(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenPoints}
            className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50"
          >
            <span>
              <span className="block text-sm font-bold text-slate-900">
                {COPY.detailPointsMenu}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {COPY.detailPointsHint}
              </span>
            </span>
            <Coins className="w-5 h-5 text-teal-600 shrink-0" aria-hidden />
          </button>
        </section>
      </>
    )}
  </div>
);
