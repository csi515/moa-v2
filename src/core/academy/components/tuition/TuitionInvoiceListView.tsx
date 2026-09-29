import React from 'react';
import { Student, TuitionInvoice } from '@/types';
import { formatCurrency, getInvoiceStatusBadge } from '@/utils/formatters';
import { resolveInvoiceBaseFee } from '@/core/finance/invoiceModel';
import {
  getLatestTuitionPaymentForInvoice,
  lastTuitionPaymentSummaryText,
} from '@/core/finance/latestTuitionPayment';
import { TuitionService } from '@/core/finance';

interface TuitionInvoiceListViewProps {
  customerLabel: string;
  filteredInvoices: TuitionInvoice[];
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onOpenPayModal: (invoice: TuitionInvoice) => void;
}

export const TuitionInvoiceListView: React.FC<TuitionInvoiceListViewProps> = ({
  customerLabel,
  filteredInvoices,
  students,
  onSelectStudent,
  onOpenPayModal,
}) => {
  const tuitionPayments = TuitionService.getTuitionPayments();
  return (
    <div className="space-y-3">
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">청구월</th>
                <th className="py-3.5 px-4">{customerLabel} 이름</th>
                <th className="py-3.5 px-4">기본 수강료</th>
                <th className="py-3.5 px-4">할인/감면</th>
                <th className="py-3.5 px-4">최종 청구액</th>
                <th className="py-3.5 px-4">납부액 / 미납액</th>
                <th className="py-3.5 px-4">납부기한</th>
                <th className="py-3.5 px-4">상태</th>
                <th className="py-3.5 px-4 text-right">수납</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    해당 조건의 수납 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const badge = getInvoiceStatusBadge(inv.status);
                  const lastPaymentText = lastTuitionPaymentSummaryText(
                    getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id)
                  );
                  return (
                    <tr key={inv.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        {inv.yearMonth}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(inv.studentId)}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {inv.studentName}
                        </button>
                        {inv.cashReceiptRequested && inv.status !== 'paid' && (
                          <span className="ml-1.5 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">
                            현금영수증 요청
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatCurrency(resolveInvoiceBaseFee(inv))}
                      </td>
                      <td className="py-3.5 px-4 text-rose-500 font-medium">
                        {(inv.discountAmount ?? inv.discount ?? 0) > 0
                          ? `-${formatCurrency(inv.discountAmount ?? inv.discount ?? 0)}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <span className="block">{formatCurrency(inv.totalAmount)}</span>
                        {((inv.textbookFee || 0) > 0 || (inv.extraFee || 0) > 0) && (
                          <span className="block text-[10px] font-medium text-indigo-600 mt-0.5">
                            {(inv.textbookFee || 0) > 0 ? '교재' : ''}
                            {(inv.textbookFee || 0) > 0 && (inv.extraFee || 0) > 0 ? '·' : ''}
                            {(inv.extraFee || 0) > 0 ? '행사비' : ''} 포함
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(inv.paidAmount)}
                        </span>
                        {inv.unpaidAmount > 0 && (
                          <span className="text-rose-600 font-bold ml-1">
                            (미납: {formatCurrency(inv.unpaidAmount)})
                          </span>
                        )}
                        {lastPaymentText && (
                          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                            최근 수납 {lastPaymentText}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{inv.dueDate}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                            <button
                              type="button"
                              onClick={() => onOpenPayModal(inv)}
                              className="px-3 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                            >
                              결제 완료 처리
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 font-medium border border-slate-200">
            해당 조건의 수납 내역이 없습니다.
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const badge = getInvoiceStatusBadge(inv.status);
            const st = students.find((s) => s.id === inv.studentId);
            const lastPaymentText = lastTuitionPaymentSummaryText(
              getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id)
            );

            return (
              <div
                key={inv.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(inv.studentId)}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {inv.studentName}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {inv.yearMonth}월분 (기한: {inv.dueDate})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                      {inv.unpaidAmount > 0 ? (
                        <span className="text-xs font-bold text-rose-600">
                          미납 {formatCurrency(inv.unpaidAmount)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">전액 완납</span>
                      )}
                      {lastPaymentText && (
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                          최근 수납 {lastPaymentText}
                        </span>
                      )}
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    {st?.parentPhone && (
                      <a
                        href={`tel:${st.parentPhone}`}
                        className="text-indigo-600 font-medium hover:underline"
                      >
                        {st.parentPhone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => onOpenPayModal(inv)}
                        className="px-3 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
                      >
                        결제 완료 처리
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
