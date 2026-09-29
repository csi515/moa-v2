import React, { useState, useMemo, useEffect } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { StudentService } from '@/core/students';
import { TuitionService } from '@/core/finance';
import { useTuitionInvoicePayment } from '@/core/finance/application/useTuitionInvoicePayment';
import { TuitionInvoice, PaymentMethod, Student } from '@/types';
import { useStorageRefresh } from '@/hooks';
import { buildYearMonthOptions } from '@/core/finance/categories';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { CombinedPaymentModal } from './CombinedPaymentModal';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { TuitionSummaryCards } from './TuitionSummaryCards';
import { TuitionFilterBar } from './TuitionFilterBar';
import { TuitionCombinedBillingView } from './TuitionCombinedBillingView';
import { TuitionInvoiceListView } from './TuitionInvoiceListView';
import { TuitionPaymentModal } from './TuitionPaymentModal';
import { ViewMode } from './tuitionViewTypes';
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
    return invoices.filter((inv) => {
      if (selectedMonth && inv.yearMonth !== selectedMonth) return false;
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!inv.studentName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [invoices, selectedMonth, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const monthInvoices = invoices.filter((i) => i.yearMonth === selectedMonth);
    const totalBilled = monthInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = monthInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalUnpaid = monthInvoices.reduce((sum, i) => sum + i.unpaidAmount, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    const unpaidCount = monthInvoices.filter((i) => i.status === 'unpaid' || i.status === 'partial').length;

    return { totalBilled, totalPaid, totalUnpaid, collectionRate, unpaidCount, totalCount: monthInvoices.length };
  }, [invoices, selectedMonth]);

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
      />

      {viewMode === 'combined' ? (
        <TuitionCombinedBillingView
          customerLabel={customerLabel}
          students={students}
          selectedMonth={selectedMonth}
          searchQuery={searchQuery}
          onSelectStudent={setSelectedStudentId}
          onCombinedPay={setCombinedStudentForPay}
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
