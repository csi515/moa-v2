import React, { useEffect, useMemo, useState } from 'react';
import { useAppNavigation } from '@/shared/navigation/useAppNavigation';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { resolveFinanceHubNav } from '@/capabilities/billing/finance/financeHubNav';
import { formatCurrency } from '@/utils/formatters';
import { buildYearMonthOptions } from '@/capabilities/billing/finance/categories';
import { cn } from '@/shared/lib/utils';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import { yearMonthLocal } from '@/shared/utils/localDate';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ShieldAlert,
  Plus,
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
  const { industry, isOwner } = usePermissions();
  const hasFinanceAccess = isOwner;
  const refreshKey = useStorageRefresh('finance');
  const [selectedMonth, setSelectedMonth] = useState(yearMonthLocal());

  useEffect(() => {
    try {
      billingStorage.backfillBillingLinkedIncome();
    } catch (e) {
      console.warn('Failed to backfill billing income:', e);
    }
  }, []);

  const rawSummary = useMemo(() => {
    try {
      return billingStorage.getFinanceSummary(industry);
    } catch (err) {
      console.warn('getFinanceSummary failed, fallback to empty:', err);
      return null;
    }
  }, [industry, refreshKey]);

  const summary = useMemo(() => {
    return {
      currentYearMonth: rawSummary?.currentYearMonth || yearMonthLocal(),
      totalIncomeThisMonth: rawSummary?.totalIncomeThisMonth || 0,
      totalExpenseThisMonth: rawSummary?.totalExpenseThisMonth || 0,
      netProfitThisMonth: rawSummary?.netProfitThisMonth || 0,
      linkedIncomeThisMonth: rawSummary?.linkedIncomeThisMonth || 0,
      manualIncomeThisMonth: rawSummary?.manualIncomeThisMonth || 0,
      monthlyTrend: Array.isArray(rawSummary?.monthlyTrend) ? rawSummary.monthlyTrend : [],
    };
  }, [rawSummary]);

  const monthOptions = useMemo(() => {
    try {
      const incomeEntries = billingStorage.getIncomeEntries() || [];
      const expenses = billingStorage.getExpenses() || [];
      const dataYearMonths: string[] = [
        ...summary.monthlyTrend.map((t) => t.yearMonth),
        ...incomeEntries.map((e) => e?.date?.slice(0, 7)).filter((d): d is string => Boolean(d)),
        ...expenses.map((e) => e?.date?.slice(0, 7)).filter((d): d is string => Boolean(d)),
      ];
      return buildYearMonthOptions({ dataYearMonths });
    } catch {
      return [{ value: selectedMonth, label: `${selectedMonth} (기본)` }];
    }
  }, [summary.monthlyTrend, selectedMonth, refreshKey]);

  const monthDetail = useMemo(() => {
    try {
      const trend = summary.monthlyTrend.find((t) => t.yearMonth === selectedMonth);
      const incomeEntries = (billingStorage.getIncomeEntries() || []).filter(
        (e) => e?.date && typeof e.date === 'string' && e.date.startsWith(selectedMonth)
      );
      const expenses = (billingStorage.getExpenses() || []).filter(
        (e) => e?.date && typeof e.date === 'string' && e.date.startsWith(selectedMonth)
      );
      return {
        trend,
        incomeCount: incomeEntries.length,
        expenseCount: expenses.length,
      };
    } catch {
      return {
        trend: undefined,
        incomeCount: 0,
        expenseCount: 0,
      };
    }
  }, [selectedMonth, summary.monthlyTrend, refreshKey]);

  const showLinkedBillingIncome = resolveFinanceHubNav(industry).showLinkedBillingIncome;

  if (!hasFinanceAccess) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center max-w-md mx-auto my-6 shadow-2xs space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">재무 요약 열람 권한 제한</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            매출 및 수입/지출 장부 요약은 사업주(원장) 전용입니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(embedded ? 'space-y-4 pb-2' : DESKTOP_CONTAINERS.dashboard, 'space-y-4 pb-4')}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-slate-700" />
              장부 관리
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              사업장 수입과 지출을 한눈에 확인하고 손익을 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className="min-h-[40px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              수입 등록
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className="min-h-[40px] px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              지출 등록
            </button>
          </div>
        </div>
      )}

      {/* 3열 요약 카드 (B2B 차분한 톤앤매너, 순백색 1px 보더) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
        {/* 1. 이번 달 수입 */}
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs text-left hover:border-slate-300 transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">이번 달 총 수입</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight my-1">
            {formatCurrency(summary.totalIncomeThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 font-normal truncate">
            일반 {formatCurrency(summary.manualIncomeThisMonth)}
            {showLinkedBillingIncome && ` · 수납연동 ${formatCurrency(summary.linkedIncomeThisMonth)}`}
          </p>
        </button>

        {/* 2. 이번 달 지출 */}
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs text-left hover:border-slate-300 transition-colors flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">이번 달 총 지출</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight my-1">
            {formatCurrency(summary.totalExpenseThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 font-normal truncate">운영비·인건비·임대료 등</p>
        </button>

        {/* 3. 이번 달 순수익 */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">이번 달 순수익</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <p className={`text-2xl font-bold tracking-tight my-1 ${
            summary.netProfitThisMonth >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatCurrency(summary.netProfitThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 font-normal truncate">수입 − 지출 차액</p>
        </div>
      </div>

      {/* 월별 수입·지출 추이 차트 */}
      <div className="bg-white rounded-lg p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">월별 수입·지출 추이</h4>
            <p className="text-xs text-slate-400 mt-0.5">최근 6개월 손익 동향</p>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {summary.monthlyTrend.some((t) => t.income > 0 || t.expense > 0) ? (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="수입" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="지출" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">등록된 수입·지출 내역이 없습니다</p>
            <p className="text-xs text-slate-400">수입이나 지출을 등록하면 월별 손익 그래프가 자동으로 표시됩니다.</p>
          </div>
        )}

        {monthDetail.trend && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between tabular-nums">
            <span>기준: <strong className="text-slate-800">{selectedMonth}</strong></span>
            <span>수입 {monthDetail.incomeCount}건 · 지출 {monthDetail.expenseCount}건 · 순수익 <strong className="text-slate-900">{formatCurrency(monthDetail.trend.net)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
