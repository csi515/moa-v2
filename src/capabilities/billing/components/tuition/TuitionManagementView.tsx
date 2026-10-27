import React, { useState, useMemo, useEffect } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { StudentService } from '@/core/students';
import { TuitionService, type MonthlyTuitionWorkFilter } from '@/capabilities/billing/finance';
import { useTuitionInvoicePayment } from '@/capabilities/billing/finance/application/useTuitionInvoicePayment';
import type { TuitionInvoice } from '@/capabilities/billing/finance/billingLedgerTypes';
import type { PaymentMethod } from '@/capabilities/billing/finance/paymentMethod';
import type { Student } from '@/types';
import { useStorageRefresh } from '@/hooks';
import { buildYearMonthOptions } from '@/capabilities/billing/finance/categories';
import { CreditCard, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { CombinedPaymentModal } from './CombinedPaymentModal';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { TuitionSummaryCards } from './TuitionSummaryCards';
import { TuitionFilterBar } from './TuitionFilterBar';
import { TuitionCombinedBillingView } from './TuitionCombinedBillingView';
import { TuitionInvoiceListView } from './TuitionInvoiceListView';
import { TuitionPaymentModal } from './TuitionPaymentModal';
import { ViewMode } from './tuitionViewTypes';
import { filterInvoices, hasOutstandingBalance } from '@/domain/billing/invoiceFilterPredicate';
import { getCurrentYearMonth, formatYearMonthLabel } from './tuitionUtils';

export const TuitionManagementView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { showToast, setSelectedStudentId, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const { submit: submitInvoicePayment, submitting: invoicePaymentSubmitting } =
    useTuitionInvoicePayment(customerLabel);
  const refreshKey = useStorageRefresh('finance');

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [combinedStatusFilter, setCombinedStatusFilter] = useState<MonthlyTuitionWorkFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  const [combinedStudentForPay, setCombinedStudentForPay] = useState<Student | null>(null);
  const [payModalInvoice, setPayModalInvoice] = useState<TuitionInvoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('onsite_card');
  const [payMemo, setPayMemo] = useState('');
  const [payDate, setPayDate] = useState(todayIsoLocal);
  const [cashReceiptIssued, setCashReceiptIssued] = useState(false);

  const invoices = useMemo(() => TuitionService.getInvoices(), [refreshKey]);
  const students = useMemo(() => StudentService.getStudents(), [refreshKey]);

  const monthOptions = useMemo(
    () =>
      buildYearMonthOptions({
        dataYearMonths: invoices.map((i) => i.yearMonth),
      }),
    [invoices]
  );

  useEffect(() => {
    let cancelled = false;
    void TuitionService.ensureMonthlyInvoicesForMonth(selectedMonth).catch((err) => {
      if (cancelled) return;
      showToast(err instanceof Error ? err.message : '월회비 청구를 준비하지 못했습니다.', 'error');
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, showToast]);

  const filteredInvoices = useMemo(() => {
    return filterInvoices(invoices, {
      selectedMonth,
      statusFilter,
      searchQuery,
    });
  }, [invoices, selectedMonth, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const monthInvoices = invoices.filter((i) => i.yearMonth === selectedMonth);
    const totalBilled = monthInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = monthInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalUnpaid = monthInvoices.reduce((sum, i) => sum + i.unpaidAmount, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    const unpaidCount = monthInvoices.filter(hasOutstandingBalance).length;

    return { totalBilled, totalPaid, totalUnpaid, collectionRate, unpaidCount, totalCount: monthInvoices.length };
  }, [invoices, selectedMonth]);

  const isUnpaidActive =
    viewMode === 'invoices' ? statusFilter === 'unpaid' : combinedStatusFilter === 'unpaid';

  const handleToggleUnpaidFilter = () => {
    if (viewMode === 'invoices') {
      setStatusFilter((prev) => (prev === 'unpaid' ? 'ALL' : 'unpaid'));
    } else {
      setCombinedStatusFilter((prev) => (prev === 'unpaid' ? 'all' : 'unpaid'));
    }
  };

  const handleOpenPayModal = (inv: TuitionInvoice) => {
    setPayModalInvoice(inv);
    setPayAmount(inv.unpaidAmount);
    setPayMethod('onsite_card');
    setPayMemo('');
    setPayDate(todayIsoLocal());
    setCashReceiptIssued(false);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submitInvoicePayment({
      invoice: payModalInvoice,
      amount: payAmount,
      method: payMethod,
      memo: payMemo,
      paymentDate: payDate,
      cashReceiptIssued,
    });
    if (ok) setPayModalInvoice(null);
  };

  const handleSelectStudentFromInvoice = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('students');
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {embedded ? (
        <TuitionSummaryCards selectedMonth={formatYearMonthLabel(selectedMonth)} stats={stats} />
      ) : (
        <>
          <PageHeader
            icon={<CreditCard className="w-6 h-6" />}
            title="수강료 및 수납 관리"
            description={`${customerLabel}별 월회비 납부 현황 조회와 수납 처리`}
          />
          <TuitionSummaryCards selectedMonth={formatYearMonthLabel(selectedMonth)} stats={stats} />
        </>
      )}

      {/* 이번 달 총 미수금 합계 강조 배너 */}
      {stats.totalUnpaid > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-rose-950">
                  이번 달 총 미수금: {stats.totalUnpaid.toLocaleString()}원
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[11px] font-bold">
                  {stats.unpaidCount}명 미납
                </span>
              </div>
              <p className="text-xs text-rose-700/80 mt-0.5">
                수납 지연 회원에게 정기 수납 알림을 발송하거나 하단 필터에서 미납 내역을 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <TuitionFilterBar
        customerLabel={customerLabel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedMonth={selectedMonth}
        onSelectedMonthChange={setSelectedMonth}
        monthOptions={monthOptions}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filteredInvoicesCount={filteredInvoices.length}
        studentsCount={students.length}
        unpaidCount={stats.unpaidCount}
        isUnpaidActive={isUnpaidActive}
        onToggleUnpaidFilter={handleToggleUnpaidFilter}
      />

      {viewMode === 'combined' ? (
        <TuitionCombinedBillingView
          customerLabel={customerLabel}
          students={students}
          selectedMonth={selectedMonth}
          searchQuery={searchQuery}
          onSelectStudent={setSelectedStudentId}
          onCombinedPay={setCombinedStudentForPay}
          statusFilter={combinedStatusFilter}
          onStatusFilterChange={setCombinedStatusFilter}
        />
      ) : (
        <TuitionInvoiceListView
          customerLabel={customerLabel}
          filteredInvoices={filteredInvoices}
          students={students}
          onSelectStudent={handleSelectStudentFromInvoice}
          onOpenPayModal={handleOpenPayModal}
        />
      )}

      {combinedStudentForPay && (
        <CombinedPaymentModal
          customerLabel={customerLabel}
          student={combinedStudentForPay}
          yearMonth={selectedMonth}
          onSuccess={() => {
            setCombinedStudentForPay(null);
          }}
          onClose={() => setCombinedStudentForPay(null)}
        />
      )}

      {payModalInvoice && (
        <TuitionPaymentModal
          invoice={payModalInvoice}
          payAmount={payAmount}
          onPayAmountChange={setPayAmount}
          payMethod={payMethod}
          onPayMethodChange={setPayMethod}
          payMemo={payMemo}
          onPayMemoChange={setPayMemo}
          payDate={payDate}
          onPayDateChange={setPayDate}
          cashReceiptIssued={cashReceiptIssued}
          onCashReceiptIssuedChange={setCashReceiptIssued}
          submitting={invoicePaymentSubmitting}
          onSubmit={handleProcessPayment}
          onClose={() => setPayModalInvoice(null)}
        />
      )}
    </div>
  );
};
