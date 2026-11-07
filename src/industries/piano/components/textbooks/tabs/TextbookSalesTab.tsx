import React, { useState, useMemo } from 'react';
import { TextbookSale } from '@/types';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { SalesStatusFilter } from '../textbookViewTypes';

interface TextbookSalesTabProps {
  sales: TextbookSale[];
  onOpenPaymentModal: (sale: TextbookSale) => void;
  onOpenReceiptModal: (sale: TextbookSale) => void;
  onCancelSale: (sale: TextbookSale) => void;
}

export const TextbookSalesTab: React.FC<TextbookSalesTabProps> = ({
  sales,
  onOpenPaymentModal,
  onOpenReceiptModal,
  onCancelSale,
}) => {
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<SalesStatusFilter>('all');

  // 미납 및 일부납부 건 (빠른 수납 큐용)
  const unpaidSales = useMemo(
    () => sales.filter((s) => s.unpaidAmount > 0 && !s.billingInvoiceId),
    [sales]
  );

  const filteredSales = useMemo(
    () =>
      sales.filter((s) => {
        const matchSearch =
          s.studentName.toLowerCase().includes(salesSearch.toLowerCase()) ||
          s.textbookTitle.toLowerCase().includes(salesSearch.toLowerCase()) ||
          studentMatchesGuardianQuery(s.studentId, salesSearch);

        const matchStatus = salesStatusFilter === 'all' || s.status === salesStatusFilter;
        return matchSearch && matchStatus;
      }),
    [sales, salesSearch, salesStatusFilter]
  );

  const counts = useMemo(() => {
    let unpaid = 0;
    let partial = 0;
    let paid = 0;
    sales.forEach((s) => {
      if (s.status === 'unpaid') unpaid++;
      else if (s.status === 'partial') partial++;
      else if (s.status === 'paid') paid++;
    });
    return { all: sales.length, unpaid, partial, paid };
  }, [sales]);

  return (
    <div className="space-y-5">
      {/* 1. 미납 교재비 빠른 수납 큐 */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">
                교재비 미납 및 분할 수납 대상
              </h2>
              <p className="text-xs text-slate-500">
                현재 수납해야 할 잔액이 남아있는 교재 배부 내역입니다.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
              unpaidSales.length > 0
                ? 'text-rose-700 bg-rose-50 border border-rose-200'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            }`}
          >
            {unpaidSales.length > 0 ? `총 ${unpaidSales.length}건 미납 대기` : '미납 없음'}
          </span>
        </div>

        {unpaidSales.length === 0 ? (
          <div className="py-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600 font-medium">
            🎉 현재 미납된 교재비가 없습니다! 모든 교재비가 완납되었습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpaidSales.map((sale) => (
              <div
                key={sale.id}
                className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/30 flex flex-col justify-between space-y-3 hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm">{sale.studentName}</span>
                      <span className="text-[11px] text-slate-500 block">
                        학부모: {sale.parentName || '미지정'} ({sale.parentPhone ? sale.parentPhone.slice(-4) : '-'})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      {sale.status === 'partial' ? '일부납부' : '미납'}
                    </span>
                  </div>

                  <div className="mt-2 text-xs space-y-0.5">
                    <p className="text-slate-800 font-semibold truncate">
                      {sale.textbookTitle} ({sale.quantity}권)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      배부일: {sale.saleDate} · 총액: {formatCurrency(sale.totalAmount)}
                    </p>
                    {sale.paidAmount > 0 && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        기수납액: {formatCurrency(sale.paidAmount)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-rose-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">미납 잔액</span>
                    <span className="font-black text-rose-600 text-sm tabular-nums">
                      {formatCurrency(sale.unpaidAmount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPaymentModal(sale)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    수납 처리
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. 전체 배부 및 수납 내역 마스터 */}
      <section className="space-y-3.5">
        {/* 검색 및 필터 컨트롤 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="학생명, 학부모명, 교재명 검색..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-900 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {(
              [
                ['all', `전체 (${counts.all})`],
                ['unpaid', `미납 (${counts.unpaid})`],
                ['partial', `일부납부 (${counts.partial})`],
                ['paid', `완납 (${counts.paid})`],
              ] as const
            ).map(([st, label]) => (
              <button
                key={st}
                type="button"
                onClick={() => setSalesStatusFilter(st)}
                className={`px-3 py-2 min-h-[44px] sm:min-h-[38px] rounded-xl border font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  salesStatusFilter === st
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">지급일</th>
                  <th className="py-3.5 px-4">학생 (학부모)</th>
                  <th className="py-3.5 px-4">교재명</th>
                  <th className="py-3.5 px-3 text-center">수량</th>
                  <th className="py-3.5 px-3 text-right">청구금액</th>
                  <th className="py-3.5 px-3 text-right">수납액</th>
                  <th className="py-3.5 px-3 text-right">미납 잔액</th>
                  <th className="py-3.5 px-3 text-center">상태</th>
                  <th className="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      {salesSearch.trim() || salesStatusFilter !== 'all'
                        ? '조건에 맞는 배부 내역이 없습니다.'
                        : '등록된 교재 배부 내역이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isUnpaid = sale.unpaidAmount > 0;
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {sale.saleDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {sale.studentName}
                          {sale.parentName && (
                            <span className="text-slate-400 font-normal text-[11px] block">
                              {sale.parentName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                          {sale.textbookTitle}
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums">
                          {sale.quantity}권
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-semibold tabular-nums">
                          {formatCurrency(sale.paidAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-black tabular-nums">
                          {isUnpaid ? (
                            <span className="text-rose-600">{formatCurrency(sale.unpaidAmount)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">0원</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {sale.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              완납
                            </span>
                          ) : sale.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              일부납부
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                              미납
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {isUnpaid && !sale.billingInvoiceId && (
                              <button
                                type="button"
                                onClick={() => onOpenPaymentModal(sale)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                              >
                                수납
                              </button>
                            )}

                            {sale.paidAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenReceiptModal(sale)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="영수증 보기"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                            {sale.paidAmount === 0 && (
                              <button
                                type="button"
                                onClick={() => onCancelSale(sale)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="배부 취소 (재고 복구)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
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

        {/* 모바일 카드 뷰 */}
        <div className="md:hidden space-y-3">
          {filteredSales.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              조건에 맞는 배부 내역이 없습니다.
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isUnpaid = sale.unpaidAmount > 0;
              return (
                <div
                  key={sale.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {sale.studentName}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {sale.saleDate}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-xs mt-1">
                        {sale.textbookTitle} ({sale.quantity}권)
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        sale.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : sale.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {sale.status === 'paid'
                        ? '완납'
                        : sale.status === 'partial'
                          ? '일부납부'
                          : '미납'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">청구액</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">수납액</span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(sale.paidAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">미납 잔액</span>
                      <span
                        className={`font-black tabular-nums ${
                          isUnpaid ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(sale.unpaidAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    {sale.paidAmount === 0 && (
                      <button
                        type="button"
                        onClick={() => onCancelSale(sale)}
                        className="px-2.5 py-1.5 min-h-[44px] text-xs font-semibold text-slate-500 hover:text-rose-600 rounded-lg"
                      >
                        배부 취소
                      </button>
                    )}

                    {sale.paidAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenReceiptModal(sale)}
                        className="px-3 py-1.5 min-h-[44px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        영수증
                      </button>
                    )}

                    {isUnpaid && !sale.billingInvoiceId && (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(sale)}
                        className="px-3.5 py-1.5 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                      >
                        수납 처리
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
