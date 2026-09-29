import type { FC } from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { TuitionInvoice } from '@/types';
import { DirectorSectionEmpty } from './DirectorSectionEmpty';

interface DirectorTodayUnpaidSectionProps {
  invoices: TuitionInvoice[];
  onOpenUnpaid?: () => void;
}

/** 원장 홈 — 미납 확인 */
export const DirectorTodayUnpaidSection: FC<DirectorTodayUnpaidSectionProps> = ({
  invoices,
  onOpenUnpaid,
}) => {
  const total = invoices.reduce((sum, inv) => sum + (inv.unpaidAmount || 0), 0);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            미납
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {invoices.length === 0
              ? '이번 달 미납 없음'
              : `이번 달 ${invoices.length}명 · ${formatCurrency(total)}`}
          </p>
        </div>
        {onOpenUnpaid && (
          <button
            type="button"
            onClick={onOpenUnpaid}
            className="text-xs font-bold text-indigo-600 min-h-[44px] px-1"
          >
            미납 전체
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <DirectorSectionEmpty className="py-6">확인할 미납 청구서가 없습니다.</DirectorSectionEmpty>
      ) : (
        <ul className="space-y-2 max-h-[240px] overflow-y-auto">
          {invoices.slice(0, 8).map((inv) => (
            <li
              key={inv.id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-rose-100 bg-rose-50/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{inv.studentName}</p>
                <p className="text-[11px] text-rose-700 font-bold tabular-nums mt-0.5">
                  {formatCurrency(inv.unpaidAmount)}
                  <span className="text-slate-500 font-medium"> · {inv.yearMonth}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
