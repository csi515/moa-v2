import React, { useMemo } from 'react';
import type {
  TuitionInvoice,
  StudentMonthlyBillingSummary,
  TextbookSale,
  PaymentMethod,
  InvoiceStatus,
} from '@/types';
import { formatCurrency, getInvoiceStatusBadge } from '@/utils/formatters';
import { resolveInvoiceBaseFee } from '@/capabilities/finance/invoiceModel';
import {
  getLatestTuitionPaymentForInvoice,
  lastTuitionPaymentSummaryText,
} from '@/capabilities/finance/latestTuitionPayment';
import { TuitionService } from '@/capabilities/finance';
import { AlertCircle, CheckCircle2, Plus, Receipt } from 'lucide-react';

interface StudentDetailTuitionTabProps {
  allInvoices: TuitionInvoice[];
  billingSummary?: StudentMonthlyBillingSummary;
  studentSales?: TextbookSale[];
  payInvoiceId?: string | null;
  setPayInvoiceId?: (id: string | null) => void;
  payAmount?: number;
  setPayAmount?: (amount: number) => void;
  payMethod?: PaymentMethod;
  setPayMethod?: (method: PaymentMethod) => void;
  payMemo?: string;
  setPayMemo?: (memo: string) => void;
  onOpenPayModal: (inv: TuitionInvoice) => void;
  onProcessPayment?: (e: React.FormEvent) => void;
  /** 일회성 교재 수납 등록 */
  onOpenTextbookSale?: () => void;
  onOpenTextbookTab?: () => void;
  onOpenTextbookPayment?: (sale: TextbookSale) => void;
}

type TuitionHistoryRow =
  | {
      kind: 'invoice';
      id: string;
      title: string;
      receiptNumber?: string;
      date: string;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
      status: InvoiceStatus;
      detailNote?: string;
      paymentText?: string;
      raw: TuitionInvoice;
    }
  | {
      kind: 'textbook';
      id: string;
      title: string;
      receiptNumber?: string;
      date: string;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
      status: InvoiceStatus;
      detailNote?: string;
      paymentText?: string;
      raw: TextbookSale;
    };

/**
 * 학생 상세 모달 — 개인 수납 탭 (슬림 영수증 리스트 & 컴팩트 간편 수납)
 */
export const StudentDetailTuitionTab: React.FC<StudentDetailTuitionTabProps> = ({
  allInvoices,
  studentSales = [],
  onOpenPayModal,
  onOpenTextbookSale,
  onOpenTextbookPayment,
}) => {
  const tuitionPayments = TuitionService.getTuitionPayments();

  const unpaidInvoices = useMemo(
    () => allInvoices.filter((inv) => inv.status !== 'paid' && inv.unpaidAmount > 0),
    [allInvoices]
  );

  /** 월 청구에 합산되지 않은 별도 미납 교재 건 */
  const unpaidTextbookSales = useMemo(
    () => studentSales.filter((s) => s.unpaidAmount > 0 && !s.billingInvoiceId),
    [studentSales]
  );

  const totalUnpaidAmount = useMemo(() => {
    const invUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.unpaidAmount || 0), 0);
    const tbUnpaid = unpaidTextbookSales.reduce((sum, s) => sum + (s.unpaidAmount || 0), 0);
    return invUnpaid + tbUnpaid;
  }, [unpaidInvoices, unpaidTextbookSales]);

  const totalUnpaidCount = unpaidInvoices.length + unpaidTextbookSales.length;

  /** 전체 히스토리 목록 (최신순) */
  const historyList = useMemo((): TuitionHistoryRow[] => {
    const rows: TuitionHistoryRow[] = [];

    // 1. 월회비 인보이스
    for (const inv of allInvoices) {
      const lastPayment = getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id);
      const lastPaymentText = lastTuitionPaymentSummaryText(lastPayment);

      const feeDetails: string[] = [];
      const baseFee = resolveInvoiceBaseFee(inv);
      if ((inv.textbookFee || 0) > 0 || (inv.extraFee || 0) > 0) {
        feeDetails.push(`월회비 ${formatCurrency(baseFee)}`);
        if ((inv.textbookFee || 0) > 0) feeDetails.push(`교재 ${formatCurrency(inv.textbookFee || 0)}`);
        if ((inv.extraFee || 0) > 0) feeDetails.push(`${inv.extraFeeLabel || '기타'} ${formatCurrency(inv.extraFee || 0)}`);
      }

      rows.push({
        kind: 'invoice',
        id: inv.id,
        title: `${inv.yearMonth} 수강료`,
        receiptNumber: inv.receiptNumber,
        date: inv.dueDate || inv.yearMonth,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        unpaidAmount: inv.unpaidAmount,
        status: inv.status,
        detailNote: feeDetails.length > 0 ? feeDetails.join(' · ') : undefined,
        paymentText: lastPaymentText || undefined,
        raw: inv,
      });
    }

    // 2. 월 청구에 합산되지 않은 개별 교재 판매 내역
    for (const sale of studentSales) {
      if (sale.billingInvoiceId) continue; // 월 청구에 합산된 건은 제외

      const status: InvoiceStatus =
        sale.unpaidAmount <= 0
          ? 'paid'
          : sale.paidAmount > 0
          ? 'partial'
          : 'unpaid';

      rows.push({
        kind: 'textbook',
        id: sale.id,
        title: `${sale.textbookTitle} (교재)`,
        date: sale.saleDate || sale.createdAt || '',
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        unpaidAmount: sale.unpaidAmount,
        status,
        detailNote: sale.unitPrice && sale.quantity > 1 ? `${formatCurrency(sale.unitPrice)} × ${sale.quantity}권` : undefined,
        paymentText: sale.paymentMethod ? `수단: ${sale.paymentMethod}` : undefined,
        raw: sale,
      });
    }

    // 최신순 정렬 (날짜 내림차순)
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [allInvoices, studentSales, tuitionPayments]);

  return (
    <div className="space-y-3.5">
      {/* 1. 슬림 상태 배너 (미납 시 로즈 배너 + 간편 수납 / 완납 시 슬레이트 배너) */}
      {totalUnpaidAmount > 0 ? (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-rose-950 truncate">
                ⚠️ 미납 총액: <span className="text-rose-700 font-extrabold">{formatCurrency(totalUnpaidAmount)}</span> ({totalUnpaidCount}건)
              </p>
              <p className="text-[11px] text-rose-600 truncate mt-0.5">
                미납된 수강료 또는 교재비 결제가 필요합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (unpaidInvoices.length > 0) {
                onOpenPayModal(unpaidInvoices[0]);
              } else if (unpaidTextbookSales.length > 0 && onOpenTextbookPayment) {
                onOpenTextbookPayment(unpaidTextbookSales[0]);
              }
            }}
            className="shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            간편 수납
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <div>
            <p className="font-bold text-slate-900">✓ 모든 수강료 및 교재비가 정상 완납되었습니다.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">현재 미납 내역이 없습니다.</p>
          </div>
        </div>
      )}

      {/* 2. 섹션 헤더 */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-indigo-600" />
            수납 내역 영수증
          </h4>
          <p className="text-[11px] text-slate-500">개인의 월회비 및 교재비 납부 히스토리입니다.</p>
        </div>
        {onOpenTextbookSale && (
          <button
            type="button"
            onClick={onOpenTextbookSale}
            className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" /> 교재 수납
          </button>
        )}
      </div>

      {/* 3. 본문 영수증 리스트 */}
      {historyList.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">청구 및 수납 내역이 없습니다.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">신규 수강료가 청구되면 이곳에 자동으로 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
          {historyList.map((item) => {
            const badge = getInvoiceStatusBadge(item.status);
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* 좌측 정보 */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {item.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {item.receiptNumber && (
                      <span className="text-[10px] font-mono text-slate-400">
                        #{item.receiptNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>기한: {item.date}</span>
                    <span>·</span>
                    <span>
                      청구: <strong className="text-slate-800">{formatCurrency(item.totalAmount)}</strong>
                    </span>
                    {item.paidAmount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">
                          납부: {formatCurrency(item.paidAmount)}
                        </span>
                      </>
                    )}
                    {item.unpaidAmount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-rose-600 font-bold">
                          미납: {formatCurrency(item.unpaidAmount)}
                        </span>
                      </>
                    )}
                  </div>

                  {item.paymentText && (
                    <p className="text-[11px] text-slate-400">
                      최근 결제: {item.paymentText}
                    </p>
                  )}
                  {item.detailNote && (
                    <p className="text-[11px] text-indigo-600 font-medium">
                      {item.detailNote}
                    </p>
                  )}
                </div>

                {/* 우측 액션 버튼 */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.unpaidAmount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.kind === 'invoice') {
                          onOpenPayModal(item.raw);
                        } else if (onOpenTextbookPayment) {
                          onOpenTextbookPayment(item.raw);
                        }
                      }}
                      className="px-3.5 py-1.5 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      수납
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                      정산 완료
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 화면 하단 안내 링크 */}
      <div className="pt-2 text-center">
        <p className="text-[11px] text-slate-400">
          학원 전체 수납 내역 및 청구서 관리는 <span className="font-semibold text-slate-600">[수납]</span> 메뉴에서 확인하실 수 있습니다.
        </p>
      </div>
    </div>
  );
};
