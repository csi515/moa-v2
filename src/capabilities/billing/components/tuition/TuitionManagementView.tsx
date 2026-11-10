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
import { CreditCard, Building, AlertCircle, Copy, Check } from 'lucide-react';
import { settingsStorage } from '@/services/storage/settingsStorage';
import { formatBankAccountText } from '@/capabilities/billing/finance/paymentMethodLabels';
import { Modal } from '@/shared/components/ui/Modal';
import { PageHeader } from '@/shared/components';
import { CombinedPaymentModal } from './CombinedPaymentModal';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { TuitionSummaryCards, type TuitionSummaryFilterType } from './TuitionSummaryCards';
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
  const [settings, setSettingsState] = useState(() => settingsStorage.getSettings());
  const bankAccountText = formatBankAccountText(settings.bankAccount);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank: typeof settings.bankAccount === 'object' && settings.bankAccount ? settings.bankAccount.bank || '' : '',
    accountNumber: typeof settings.bankAccount === 'object' && settings.bankAccount ? settings.bankAccount.accountNumber || '' : typeof settings.bankAccount === 'string' ? settings.bankAccount : '',
    holder: typeof settings.bankAccount === 'object' && settings.bankAccount ? settings.bankAccount.holder || '' : '',
  });
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleSaveBank = () => {
    const updated = settingsStorage.saveSettings({
      ...settings,
      bankAccount: {
        bank: bankForm.bank.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        holder: bankForm.holder.trim(),
      },
    });
    setSettingsState(updated);
    setIsBankModalOpen(false);
    showToast('학원 수납 계좌가 성공적으로 저장되었습니다.', 'success');
  };

  const handleCopyBank = async () => {
    if (!bankAccountText) return;
    await navigator.clipboard.writeText(bankAccountText);
    setCopiedAccount(true);
    showToast('수납 계좌가 복사되었습니다.', 'success');
    setTimeout(() => setCopiedAccount(false), 2000);
  };

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

  const activeSummaryFilter: TuitionSummaryFilterType = useMemo(() => {
    if (viewMode === 'invoices') {
      if (statusFilter === 'unpaid') return 'unpaid';
      if (statusFilter === 'paid') return 'paid';
      return 'all';
    } else {
      if (combinedStatusFilter === 'unpaid') return 'unpaid';
      if (combinedStatusFilter === 'paid') return 'paid';
      return 'all';
    }
  }, [viewMode, statusFilter, combinedStatusFilter]);

  const handleSummaryCardFilterChange = (filter: TuitionSummaryFilterType) => {
    if (filter === 'unpaid') {
      setStatusFilter('unpaid');
      setCombinedStatusFilter('unpaid');
    } else if (filter === 'paid') {
      setStatusFilter('paid');
      setCombinedStatusFilter('paid');
    } else {
      setStatusFilter('ALL');
      setCombinedStatusFilter('all');
    }
  };

  const isUnpaidActive =
    viewMode === 'invoices' ? statusFilter === 'unpaid' : combinedStatusFilter === 'unpaid';

  const handleToggleUnpaidFilter = () => {
    if (viewMode === 'invoices') {
      const next = statusFilter === 'unpaid' ? 'ALL' : 'unpaid';
      setStatusFilter(next);
      setCombinedStatusFilter(next === 'unpaid' ? 'unpaid' : 'all');
    } else {
      const next = combinedStatusFilter === 'unpaid' ? 'all' : 'unpaid';
      setCombinedStatusFilter(next);
      setStatusFilter(next === 'unpaid' ? 'unpaid' : 'ALL');
    }
  };

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (isUnpaidActive) {
      if (nextMode === 'invoices') {
        setStatusFilter('unpaid');
      } else {
        setCombinedStatusFilter('unpaid');
      }
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
        <TuitionSummaryCards
          selectedMonth={formatYearMonthLabel(selectedMonth)}
          stats={stats}
          activeFilter={activeSummaryFilter}
          onFilterChange={handleSummaryCardFilterChange}
        />
      ) : (
        <>
          <PageHeader
            icon={<CreditCard className="w-6 h-6" />}
            title="수강료 수납 및 청구"
            description={`${customerLabel}별 수강료 납부 현황 조회와 즉시 수납 처리`}
          />
          <TuitionSummaryCards
          selectedMonth={formatYearMonthLabel(selectedMonth)}
          stats={stats}
          activeFilter={activeSummaryFilter}
          onFilterChange={handleSummaryCardFilterChange}
        />
        </>
      )}

      {/* 학원 수납 계좌 안내 배너 (3번 구멍 방어) */}
      {!bankAccountText ? (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">학원 수납 계좌번호가 아직 등록되지 않았습니다.</span>
              <span className="text-amber-800 ml-1 hidden sm:inline">학부모가 청구서에서 확인할 입금 계좌를 등록해주세요.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            수납 계좌 등록
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2.5 min-w-0">
            <Building className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-900 shrink-0">학원 수납 계좌:</span>
            <span className="font-mono font-bold text-slate-800 truncate">{bankAccountText}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopyBank}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedAccount ? '복사됨' : '계좌 복사'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBankModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              수정
            </button>
          </div>
        </div>
      )}

      <TuitionFilterBar
        customerLabel={customerLabel}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
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
