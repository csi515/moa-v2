import React, { useState, useMemo } from 'react';
import { TextbookSale } from '@/types';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  RotateCcw
} from 'lucide-react';
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
  onCancelSale
}) => {
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<SalesStatusFilter>('all');

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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="학생명, 학부모명, 교재명 검색..."
            value={salesSearch}
            onChange={(e) => setSalesSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">납부 상태:</span>
          <div className="flex gap-1">
            {(['all', 'unpaid', 'partial', 'paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSalesStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
                  salesStatusFilter === st
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st === 'all' ? '전체' : st === 'unpaid' ? '미납' : st === 'partial' ? '일부납부' : '납부완료'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">판매일</th>
                <th className="py-3 px-4">학생 (학부모)</th>
                <th className="py-3 px-4">교재명</th>
                <th className="py-3 px-3 text-center">수량</th>
                <th className="py-3 px-3 text-right">판매단가</th>
                <th className="py-3 px-3 text-right">최종금액</th>
                <th className="py-3 px-3 text-right">수납액</th>
                <th className="py-3 px-3 text-right">미납 잔액</th>
                <th className="py-3 px-3 text-center">상태</th>
                <th className="py-3 px-4 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    교재 판매 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const statusBadge =
                    sale.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        완납
                      </span>
                    ) : sale.status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                        <Clock className="w-3 h-3" />
                        일부납부
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        미납
                      </span>
                    );

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{sale.saleDate}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{sale.studentName}</span>
                        <span className="text-[11px] text-slate-400">
                          {sale.parentName || '학부모'} ({sale.parentPhone || '-'})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{sale.textbookTitle}</span>
                        {sale.memo && <span className="text-[11px] text-slate-400 block truncate max-w-xs">{sale.memo}</span>}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {sale.quantity}권
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ₩{sale.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₩{sale.totalAmount.toLocaleString()}
                        {sale.discount > 0 && (
                          <span className="text-[10px] text-slate-400 block">(-₩{sale.discount.toLocaleString()})</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                        ₩{sale.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-600">
                        ₩{sale.unpaidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">{statusBadge}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {sale.unpaidAmount > 0 && !sale.billingInvoiceId ? (
                            <button
                              onClick={() => onOpenPaymentModal(sale)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              수납하기
                            </button>
                          ) : sale.unpaidAmount > 0 && sale.billingInvoiceId ? (
                            <span
                              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-500"
                              title="월 청구에 합산됨 — 수강료에서 수납"
                            >
                              월청구 합산
                            </span>
                          ) : (
                            <button
                              onClick={() => onOpenReceiptModal(sale)}
                              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                              title="영수증 보기"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              영수증
                            </button>
                          )}

                          <button
                            onClick={() => onCancelSale(sale)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="판매 취소 및 재고 원복"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
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

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center text-slate-400 text-sm">
            교재 판매 내역이 없습니다.
          </div>
        ) : (
          filteredSales.map((sale) => {
            const statusBadge =
              sale.status === 'paid' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                  <CheckCircle2 className="w-3 h-3" />
                  완납
                </span>
              ) : sale.status === 'partial' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                  <Clock className="w-3 h-3" />
                  일부납부
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                  <AlertTriangle className="w-3 h-3" />
                  미납
                </span>
              );

            return (
              <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{sale.studentName}</p>
                    <p className="text-[11px] text-slate-400">{sale.parentName || '학부모'} · {sale.saleDate}</p>
                  </div>
                  {statusBadge}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{sale.textbookTitle}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sale.quantity}권 · ₩{sale.totalAmount.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] text-slate-500">미납 잔액</p>
                    <p className={`text-base font-black ${sale.unpaidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₩{sale.unpaidAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {sale.unpaidAmount > 0 && !sale.billingInvoiceId ? (
                      <button
                        onClick={() => onOpenPaymentModal(sale)}
                        className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        수납하기
                      </button>
                    ) : sale.unpaidAmount > 0 && sale.billingInvoiceId ? (
                      <span className="px-3 py-2 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-500">
                        월청구 합산
                      </span>
                    ) : (
                      <button
                        onClick={() => onOpenReceiptModal(sale)}
                        className="px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        영수증
                      </button>
                    )}
                    <button
                      onClick={() => onCancelSale(sale)}
                      className="p-2.5 min-h-[44px] min-w-[44px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="판매 취소"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
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
