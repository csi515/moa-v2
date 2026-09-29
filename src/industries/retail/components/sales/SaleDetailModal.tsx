import type { FC } from 'react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSaleNumber,
  SALE_PAYMENT_METHOD_LABELS,
  type SaleItem,
  type SalePaymentMethod,
  type SaleStatus,
} from '../../types/sale';
import type { SaleReturnWithItems } from '../../types/saleReturn';
import { SALE_HISTORY_COPY as COPY } from './saleHistoryCopy';

export type SaleDetailData = {
  id: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: SalePaymentMethod;
  status: SaleStatus;
  customerName: string | null;
  items: SaleItem[];
  returnedQtyByItemId: Record<string, number>;
  returns: SaleReturnWithItems[];
};

interface Props {
  isOpen: boolean;
  detail: SaleDetailData | null;
  loading?: boolean;
  onClose: () => void;
  /** 반품 가능 시 판매내역에서만 전달 */
  onReturn?: () => void;
}

function formatSaleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function hasReturnable(detail: SaleDetailData): boolean {
  return detail.items.some((item) => {
    const returned = detail.returnedQtyByItemId[item.id] ?? 0;
    return item.quantity - returned > 0;
  });
}

export const SaleDetailModal: FC<Props> = ({
  isOpen,
  detail,
  loading,
  onClose,
  onReturn,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={COPY.detailTitle} maxWidth="md">
    <div className="flex flex-col max-h-[85vh]">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading || !detail ? (
          <p className="text-sm text-slate-500 py-8 text-center">불러오는 중…</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold text-slate-500">{COPY.saleNo}</dt>
                <dd className="font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatSaleNumber(detail.id)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{COPY.saleTime}</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {formatSaleTime(detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{COPY.customer}</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {detail.customerName ?? COPY.guestName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{COPY.payment}</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {SALE_PAYMENT_METHOD_LABELS[detail.paymentMethod]}
                </dd>
              </div>
            </dl>

            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {COPY.detailItems}
              </h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {detail.items.map((item) => {
                  const returned = detail.returnedQtyByItemId[item.id] ?? 0;
                  return (
                    <li key={item.id} className="px-3 py-3 space-y-1.5">
                      <p className="font-bold text-sm text-slate-900">
                        {item.productNameSnapshot}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span>
                          {COPY.qty}{' '}
                          <span className="font-bold tabular-nums text-slate-800">
                            {item.quantity}
                            {COPY.qtyUnit}
                          </span>
                        </span>
                        {returned > 0 && (
                          <span>
                            {COPY.returnedQtyLabel}{' '}
                            <span className="font-bold tabular-nums text-amber-700">
                              {returned}
                              {COPY.qtyUnit}
                            </span>
                          </span>
                        )}
                        <span>
                          {COPY.unitPrice}{' '}
                          <span className="font-bold tabular-nums text-slate-800">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        </span>
                        <span>
                          {COPY.discount}{' '}
                          <span className="font-bold tabular-nums text-slate-800">
                            {formatCurrency(item.discountAmount)}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm font-bold tabular-nums text-right text-slate-900">
                        {COPY.lineAmount} {formatCurrency(item.lineAmount)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-700">{COPY.total}</span>
              <span className="text-lg font-bold tabular-nums text-teal-700">
                {formatCurrency(detail.totalAmount)}
              </span>
            </div>

            {detail.returns.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {COPY.returnHistory}
                </h3>
                <ul className="space-y-2">
                  {detail.returns.map((ret) => (
                    <li
                      key={ret.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {new Date(ret.createdAt).toLocaleString('ko-KR')}
                        </span>
                        <span className="font-bold tabular-nums text-slate-900">
                          {formatCurrency(ret.totalAmount)}
                        </span>
                      </div>
                      {ret.reason?.trim() && (
                        <p className="text-xs text-slate-600 mt-1">{ret.reason}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {ret.items
                          .map(
                            (i) =>
                              `${i.productNameSnapshot} ${i.quantity}${COPY.qtyUnit}`
                          )
                          .join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 p-4 sm:p-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
        >
          {COPY.close}
        </button>
        {detail && onReturn && hasReturnable(detail) && (
          <button
            type="button"
            onClick={onReturn}
            className="flex-1 min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold"
          >
            {COPY.returnAction}
          </button>
        )}
      </div>
    </div>
  </Modal>
);
