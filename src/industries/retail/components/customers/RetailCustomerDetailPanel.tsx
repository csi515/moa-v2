import type { FC } from 'react';
import { ArrowLeft, Coins, Receipt, Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CoreCustomerInfoCard } from '@/core/customer/components/CoreCustomerInfoCard';
import type { CustomerProfile } from '@/core/customer/services/customerLinkService';
import {
  POINT_TRANSACTION_TYPE_LABELS,
  type PointTransaction,
} from '@/capabilities/commerce';
import type { WalletTransaction } from '@/capabilities/credit_wallet';
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
  creditBalance: number;
  purchaseCount: number;
  latestAmount: number;
  recentSales: SaleListItem[];
  recentTransactions: PointTransaction[];
  recentCreditTransactions?: WalletTransaction[];
};

interface Props {
  data: RetailCustomerDetailData | null;
  loading: boolean;
  onBack: () => void;
  onOpenPoints: () => void;
  onOpenSale: (saleId: string) => void;
  onOpenChargeCredit?: () => void;
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
  onOpenChargeCredit,
}) => (
  <div className="space-y-4">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex lg:hidden items-center gap-1.5 min-h-[44px] text-sm font-bold text-slate-600"
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

        {/* 선불 예치금 섹션 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              선불 예치금
            </h3>
            {onOpenChargeCredit && (
              <button
                type="button"
                onClick={onOpenChargeCredit}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 min-h-[32px] px-2 rounded-lg hover:bg-teal-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                충전하기
              </button>
            )}
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-teal-800">
                보유 잔액
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-teal-900">
                {formatCurrency(data.creditBalance ?? 0)}
              </p>
            </div>
            {onOpenChargeCredit && (
              <button
                type="button"
                onClick={onOpenChargeCredit}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 min-h-[40px] shadow-2xs cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                예치금 충전
              </button>
            )}
          </div>

          {/* 최근 예치금 거래 내역 */}
          {data.recentCreditTransactions && data.recentCreditTransactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600">
                최근 예치금 변동 내역
              </p>
              <ul className="space-y-2">
                {data.recentCreditTransactions.map((tx) => {
                  const isPositive = tx.type === 'CHARGE' || tx.type === 'BONUS' || tx.type === 'REFUND';
                  const label =
                    tx.type === 'CHARGE'
                      ? '충전'
                      : tx.type === 'USE'
                      ? '사용'
                      : tx.type === 'REFUND'
                      ? '환불'
                      : tx.type === 'BONUS'
                      ? '보너스'
                      : '만료';
                  return (
                    <li
                      key={tx.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex justify-between items-start gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPositive
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatPointDateTime(tx.timestamp)}
                          </span>
                        </div>
                        {tx.description && (
                          <p className="text-xs text-slate-700 mt-1 truncate">
                            {tx.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold tabular-nums shrink-0 ${
                          isPositive ? 'text-teal-700' : 'text-slate-900'
                        }`}
                      >
                        {isPositive ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
