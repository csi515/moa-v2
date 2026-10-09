import React, { useMemo, useState } from 'react';
import { showToast, triggerRefresh } from '@/shared/feedback/uiFeedback';
import { useAppNavigation } from '@/shared/navigation/useAppNavigation';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { resolveFinanceHubNav } from '@/capabilities/billing/finance/financeHubNav';
import { formatCurrency } from '@/utils/formatters';
import { buildYearMonthOptions } from '@/capabilities/billing/finance/categories';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const FinanceOverviewView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { setActiveTab } = useAppNavigation();
  const { industry } = usePermissions();
  const refreshKey = useStorageRefresh('finance');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const summary = useMemo(
    () => billingStorage.getFinanceSummary(industry),
    [industry, refreshKey]
  );

  const monthOptions = useMemo(
    () =>
      buildYearMonthOptions({
        dataYearMonths: [
          ...summary.monthlyTrend.map((t) => t.yearMonth),
          ...billingStorage.getIncomeEntries().map((e) => e.date?.slice(0, 7)),
          ...billingStorage.getExpenses().map((e) => e.date?.slice(0, 7)),
        ],
      }),
    [summary.monthlyTrend, refreshKey]
  );

  const monthDetail = useMemo(() => {
    const trend = summary.monthlyTrend.find((t) => t.yearMonth === selectedMonth);
    const incomeEntries = billingStorage.getIncomeEntries().filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    const expenses = billingStorage.getExpenses().filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    return {
      trend,
      incomeCount: incomeEntries.length,
      expenseCount: expenses.length,
    };
  }, [selectedMonth, summary.monthlyTrend, refreshKey]);

  const showLinkedBillingIncome = resolveFinanceHubNav(industry).showLinkedBillingIncome;

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {!embedded && (
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            재무 요약
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            수입과 지출을 한눈에 확인하고 손익을 관리합니다. (원장 전용)
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-emerald-200 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold">이번 달 수입</span>
          </div>
          <p className="text-xl font-black text-emerald-600">
            {formatCurrency(summary.totalIncomeThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            일반 {formatCurrency(summary.manualIncomeThisMonth)}
            {showLinkedBillingIncome && ` · 수납연동 ${formatCurrency(summary.linkedIncomeThisMonth)}`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-rose-200 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 text-rose-600 mb-1.5">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-bold">이번 달 지출</span>
          </div>
          <p className="text-xl font-black text-rose-600">
            {formatCurrency(summary.totalExpenseThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">운영비·인건비 등</p>
        </button>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-3.5 text-white shadow-md">
          <div className="flex items-center gap-2 text-indigo-200 mb-1.5">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-bold">이번 달 순수익</span>
          </div>
          <p className="text-xl font-black">
            {formatCurrency(summary.netProfitThisMonth)}
          </p>
          <p className="text-[11px] text-indigo-200 mt-1">수입 − 지출</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h4 className="font-bold text-slate-900 text-sm">월별 수입·지출 추이</h4>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold min-h-[44px]"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {summary.monthlyTrend.some((t) => t.income > 0 || t.expense > 0) ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="수입" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="지출" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">
            아직 재무 데이터가 없습니다. 수입·지출을 등록해 보세요.
          </p>
        )}

        {monthDetail.trend && (
          <p className="text-xs text-slate-500 mt-3 text-center">
            {selectedMonth} — 수입 {monthDetail.incomeCount}건 · 지출 {monthDetail.expenseCount}건 ·
            순수익 {formatCurrency(monthDetail.trend.net)}
          </p>
        )}
      </div>

      {showLinkedBillingIncome && (
        <div className="bg-indigo-50/60 rounded-2xl p-3.5 border border-indigo-100 space-y-3">
          <p className="text-xs text-indigo-800 leading-relaxed">
            수강료·교재 납부는 납부일 기준으로 수입 원장에 연동됩니다. 수입 관리에서는 일반 수입(대관
            등)을 직접 등록할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              const result = billingStorage.backfillBillingLinkedIncome();
              triggerRefresh();
              showToast(
                `수납 수입 동기화 완료 (월회비 ${result.tuitionCreated}건 · 교재 ${result.textbookCreated}건)`,
                'success'
              );
            }}
            className="w-full sm:w-auto min-h-[44px] px-4 text-xs font-bold rounded-xl bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
          >
            과거 수납 → 수입 원장 동기화
          </button>
        </div>
      )}
    </div>
  );
};
