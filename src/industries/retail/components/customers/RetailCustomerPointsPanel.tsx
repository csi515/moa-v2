import type { FC } from 'react';
import { ArrowLeft, Coins } from 'lucide-react';
import {
  POINT_TRANSACTION_TYPE_LABELS,
  type PointTransaction,
} from '@/capabilities/commerce';
import { EmptyState, PageHeader } from '@/shared/components';
import { FilterBar, FilterTabs } from '@/shared/components/ui';
import {
  CUSTOMER_POINTS_TYPE_TABS,
  RETAIL_CUSTOMER_COPY as COPY,
  type CustomerPointsTypeFilter,
} from './customerCopy';
import {
  formatPointAmount,
  formatPointDateTime,
  saleRefLabel,
} from './customerPointsFormat';

interface Props {
  customerName: string;
  balance: number;
  typeFilter: CustomerPointsTypeFilter;
  onTypeFilterChange: (filter: CustomerPointsTypeFilter) => void;
  loading: boolean;
  transactions: PointTransaction[];
  onBack: () => void;
  onOpenSale: (saleId: string) => void;
}

export const RetailCustomerPointsPanel: FC<Props> = ({
  customerName,
  balance,
  typeFilter,
  onTypeFilterChange,
  loading,
  transactions,
  onBack,
  onOpenSale,
}) => (
  <div className="p-4 sm:p-6 space-y-4">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-slate-600"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      {COPY.pointsBack}
    </button>

    <PageHeader title={COPY.pointsTitle} description={customerName} />

    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {COPY.pointsBalance}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-teal-700">
        {balance.toLocaleString('ko-KR')}
        {COPY.pointsUnit}
      </p>
    </section>

    <FilterBar>
      <FilterTabs
        tabs={CUSTOMER_POINTS_TYPE_TABS}
        active={typeFilter}
        onChange={onTypeFilterChange}
        activeClassName="bg-teal-600 text-white"
      />
    </FilterBar>

    {loading ? (
      <p className="text-sm text-slate-500 py-8 text-center">불러오는 중…</p>
    ) : transactions.length === 0 ? (
      <EmptyState
        icon={<Coins className="w-10 h-10" />}
        title={
          typeFilter === 'ALL' ? COPY.pointsEmptyTitle : COPY.pointsEmptyFilterTitle
        }
        description={
          typeFilter === 'ALL'
            ? COPY.pointsEmptyDescription
            : COPY.pointsEmptyFilterDescription
        }
      />
    ) : (
      <>
        <ul className="sm:hidden space-y-2">
          {transactions.map((tx) => {
            const saleNo = saleRefLabel(tx);
            return (
              <li
                key={tx.id}
                className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {POINT_TRANSACTION_TYPE_LABELS[tx.type]}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      tx.amount >= 0 ? 'text-teal-700' : 'text-slate-900'
                    }`}
                  >
                    {formatPointAmount(tx.amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {formatPointDateTime(tx.createdAt)}
                </p>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>
                    {COPY.pointsSale}{' '}
                    {saleNo && tx.referenceId ? (
                      <button
                        type="button"
                        onClick={() => onOpenSale(tx.referenceId!)}
                        className="font-bold text-teal-700 underline-offset-2 hover:underline min-h-[44px]"
                      >
                        {saleNo}
                      </button>
                    ) : (
                      COPY.pointsSaleNone
                    )}
                  </span>
                  <span className="tabular-nums">
                    {COPY.pointsBalanceAfter}{' '}
                    {tx.balanceAfter.toLocaleString('ko-KR')}
                    {COPY.pointsUnit}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-3 py-3">{COPY.pointsDate}</th>
                <th className="px-3 py-3">{COPY.pointsType}</th>
                <th className="px-3 py-3 text-right">{COPY.pointsAmount}</th>
                <th className="px-3 py-3">{COPY.pointsSale}</th>
                <th className="px-3 py-3 text-right">{COPY.pointsBalanceAfter}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const saleNo = saleRefLabel(tx);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      {formatPointDateTime(tx.createdAt)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {POINT_TRANSACTION_TYPE_LABELS[tx.type]}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold tabular-nums ${
                        tx.amount >= 0 ? 'text-teal-700' : 'text-slate-900'
                      }`}
                    >
                      {formatPointAmount(tx.amount)}
                    </td>
                    <td className="px-3 py-3">
                      {saleNo && tx.referenceId ? (
                        <button
                          type="button"
                          onClick={() => onOpenSale(tx.referenceId!)}
                          className="font-bold text-teal-700 underline-offset-2 hover:underline min-h-[44px]"
                        >
                          {saleNo}
                        </button>
                      ) : (
                        <span className="text-slate-400">{COPY.pointsSaleNone}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                      {tx.balanceAfter.toLocaleString('ko-KR')}
                      {COPY.pointsUnit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>
);
