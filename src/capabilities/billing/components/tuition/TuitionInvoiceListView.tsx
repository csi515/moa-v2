import React, { useState, useMemo, useEffect } from 'react';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import { formatCurrency } from '@/utils/formatters';
import { resolveInvoiceBaseFee } from '@/capabilities/billing/finance/invoiceModel';
import {
  getLatestTuitionPaymentForInvoice,
  lastTuitionPaymentSummaryText,
} from '@/capabilities/billing/finance/latestTuitionPayment';
import { TuitionService } from '@/capabilities/billing/finance';
import { Printer, MessageSquare } from 'lucide-react';
import { TuitionInvoiceShareModal } from './TuitionInvoiceShareModal';
import { formatBankAccountText } from '@/capabilities/billing/finance/paymentMethodLabels';
import { TuitionReceiptModal } from './TuitionReceiptModal';
import { StandardDataTable, type StandardColumn, StatusBadge, Button } from '@/shared/components';

export interface TuitionListStudent {
  id: string;
  name?: string;
  parentPhone?: string | null;
}

interface TuitionInvoiceListViewProps {
  customerLabel: string;
  filteredInvoices: TuitionInvoice[];
  students: TuitionListStudent[];
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
  const settings = TuitionService.getSettings();
  const bankAccountText = formatBankAccountText(settings.bankAccount);
  const [selectedShareInvoice, setSelectedShareInvoice] = useState<TuitionInvoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<TuitionInvoice | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredInvoices.length]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const columns: StandardColumn<TuitionInvoice>[] = useMemo(
    () => [
      {
        key: 'yearMonth',
        header: '청구월',
        className: 'font-mono font-bold text-slate-700',
        render: (inv) => inv.yearMonth,
      },
      {
        key: 'studentName',
        header: `${customerLabel} 이름`,
        render: (inv) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectStudent(inv.studentId)}
              className="font-bold text-slate-900 hover:underline transition-colors text-left"
            >
              {inv.studentName}
            </button>
            {inv.cashReceiptRequested && inv.status !== 'paid' && (
              <StatusBadge status="info" size="sm">
                현금영수증 요청
              </StatusBadge>
            )}
          </div>
        ),
      },
      {
        key: 'baseFee',
        header: '기본 수강료',
        className: 'tabular-nums text-slate-600',
        render: (inv) => formatCurrency(resolveInvoiceBaseFee(inv)),
      },
      {
        key: 'discount',
        header: '할인/감면',
        className: 'tabular-nums text-rose-500 font-medium',
        render: (inv) =>
          (inv.discountAmount ?? inv.discount ?? 0) > 0
            ? `-${formatCurrency(inv.discountAmount ?? inv.discount ?? 0)}`
            : '-',
      },
      {
        key: 'totalAmount',
        header: '최종 청구액',
        className: 'tabular-nums font-extrabold text-slate-900',
        render: (inv) => (
          <div>
            <span>{formatCurrency(inv.totalAmount)}</span>
            {((inv.textbookFee || 0) > 0 || (inv.extraFee || 0) > 0) && (
              <span className="block text-[10px] font-medium text-slate-500 mt-0.5">
                {(inv.textbookFee || 0) > 0 ? '교재' : ''}
                {(inv.textbookFee || 0) > 0 && (inv.extraFee || 0) > 0 ? '·' : ''}
                {(inv.extraFee || 0) > 0 ? '행사비' : ''} 포함
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'paymentStatus',
        header: '납부액 / 미납액',
        className: 'tabular-nums',
        render: (inv) => {
          const lastPaymentText = lastTuitionPaymentSummaryText(
            getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id)
          );
          return (
            <div>
              <span className="font-semibold text-emerald-700">{formatCurrency(inv.paidAmount)}</span>
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
            </div>
          );
        },
      },
      {
        key: 'dueDate',
        header: '납부기한',
        className: 'text-slate-500 font-mono text-xs',
        render: (inv) => inv.dueDate,
      },
      {
        key: 'status',
        header: '상태',
        render: (inv) => (
          <StatusBadge
            semantic={
              inv.status === 'paid'
                ? '납부완료'
                : inv.status === 'partial'
                ? '부분수납'
                : inv.status === 'cancelled'
                ? '청구취소'
                : '미납'
            }
            dot
          />
        ),
      },
      {
        key: 'actions',
        header: '수납 액션',
        align: 'right',
        render: (inv) => (
          <div className="flex items-center justify-end gap-1.5">
            {inv.paidAmount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceiptInvoice(inv)}
                title="수강료 납입증명서/영수증 인쇄"
                leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
              >
                납입증명서
              </Button>
            )}
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedShareInvoice(inv)}
                title="카카오톡/문자 원비 청구 안내 복사/공유"
                leftIcon={<MessageSquare className="w-3.5 h-3.5 text-slate-500" />}
              >
                청구서 발송
              </Button>
            )}
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenPayModal(inv)}
              >
                결제 완료 처리
              </Button>
            )}
          </div>
        ),
      },
    ],
    [customerLabel, onSelectStudent, tuitionPayments, onOpenPayModal]
  );

  const renderMobileCard = (inv: TuitionInvoice) => {
    const st = students.find((s) => s.id === inv.studentId);
    const lastPaymentText = lastTuitionPaymentSummaryText(
      getLatestTuitionPaymentForInvoice(tuitionPayments, inv.id)
    );

    return (
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectStudent(inv.studentId)}
                className="font-bold text-sm text-slate-900 hover:underline text-left"
              >
                {inv.studentName}
              </button>
              <StatusBadge
                semantic={
                  inv.status === 'paid'
                    ? '납부완료'
                    : inv.status === 'partial'
                    ? '부분수납'
                    : inv.status === 'cancelled'
                    ? '청구취소'
                    : '미납'
                }
                dot
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {inv.yearMonth}월분 (기한: {inv.dueDate})
            </p>
          </div>
          <div className="text-right tabular-nums">
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
              <a href={`tel:${st.parentPhone}`} className="text-slate-900 font-medium hover:underline">
                {st.parentPhone}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {inv.paidAmount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceiptInvoice(inv)}
                title="수강료 납입증명서/영수증 인쇄"
                leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
              >
                증명서
              </Button>
            )}
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedShareInvoice(inv)}
                title="카카오톡/문자 원비 청구 안내 복사/공유"
                leftIcon={<MessageSquare className="w-3.5 h-3.5 text-slate-500" />}
              >
                청구서
              </Button>
            )}
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenPayModal(inv)}
              >
                결제 처리
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <StandardDataTable
        data={paginatedInvoices}
        columns={columns}
        keyExtractor={(inv) => inv.id}
        emptyTitle="해당 조건의 수납 내역이 없습니다."
        emptyDescription="검색어 또는 필터 조건을 변경해 보세요."
        renderMobileCard={renderMobileCard}
        pagination={{
          currentPage,
          totalItems: filteredInvoices.length,
          pageSize,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
      />

      {selectedShareInvoice && (
        <TuitionInvoiceShareModal
          isOpen={Boolean(selectedShareInvoice)}
          invoice={selectedShareInvoice}
          academyName={settings.name || '모아 센터'}
          bankAccountText={bankAccountText}
          onClose={() => setSelectedShareInvoice(null)}
        />
      )}

      {selectedReceiptInvoice && (
        <TuitionReceiptModal
          invoice={selectedReceiptInvoice}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};
