import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import {
  type BudgetItemQuota,
  type OverbudgetPolicy,
  calculateBudgetUsageRate,
  calculateRemainingBudget,
  checkSpendEligibility,
} from '../domain/budgetCeilingEngine';

export const BudgetCeilingListPage: React.FC = () => {
  const { query } = useList<BudgetItemQuota>({
    resource: 'budget_quotas',
  });
  const items = (query?.data?.data as BudgetItemQuota[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createQuota } = useCreate();

  const [categoryName, setCategoryName] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState(500000);
  const [currentSpent, setCurrentSpent] = useState(0);
  const [yearMonth, setYearMonth] = useState('2026-10');
  const [overbudgetPolicy, setOverbudgetPolicy] = useState<OverbudgetPolicy>('block');

  const [checkCategory, setCheckCategory] = useState('');
  const [checkExpense, setCheckExpense] = useState(100000);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showToast('예산 항목명을 입력해주세요.', 'error');
      return;
    }

    createQuota(
      {
        resource: 'budget_quotas',
        values: {
          categoryName,
          monthlyLimit: Number(monthlyLimit),
          currentSpent: Number(currentSpent),
          yearMonth,
          overbudgetPolicy,
        },
      },
      {
        onSuccess: () => {
          showToast('예산 한도가 등록되었습니다.', 'success');
          setCategoryName('');
          refetch();
        },
      }
    );
  };

  const selectedItemForCheck = items.find((i) => i.categoryName === checkCategory);
  const eligibilityResult = selectedItemForCheck
    ? checkSpendEligibility(
        selectedItemForCheck.monthlyLimit,
        selectedItemForCheck.currentSpent,
        Number(checkExpense),
        selectedItemForCheck.overbudgetPolicy
      )
    : undefined;

  const columns: StandardColumn<BudgetItemQuota>[] = [
    {
      key: 'yearMonth',
      header: '연월',
      render: (item) => <span className="font-mono text-xs text-slate-500">{item.yearMonth}</span>,
    },
    {
      key: 'categoryName',
      header: '예산 항목명',
      render: (item) => <span className="font-semibold text-slate-900">{item.categoryName}</span>,
    },
    {
      key: 'monthlyLimit',
      header: '월 한도액',
      align: 'right',
      render: (item) => <span className="tabular-nums font-mono text-slate-700">{item.monthlyLimit.toLocaleString()}원</span>,
    },
    {
      key: 'currentSpent',
      header: '현재 지출액',
      align: 'right',
      render: (item) => <span className="tabular-nums font-mono text-slate-600">{item.currentSpent.toLocaleString()}원</span>,
    },
    {
      key: 'remaining',
      header: '잔여 예산',
      align: 'right',
      render: (item) => {
        const remaining = calculateRemainingBudget(item.monthlyLimit, item.currentSpent);
        return (
          <span className={`tabular-nums font-mono font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {remaining.toLocaleString()}원
          </span>
        );
      },
    },
    {
      key: 'usageRate',
      header: '소진율',
      render: (item) => {
        const usageRate = calculateBudgetUsageRate(item.monthlyLimit, item.currentSpent);
        return (
          <div className="w-24">
            <div className="text-xs font-mono mb-1">{usageRate}%</div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${usageRate >= 100 ? 'bg-rose-500' : usageRate >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, usageRate)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'overbudgetPolicy',
      header: '초과 정책',
      align: 'center',
      render: (item) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            item.overbudgetPolicy === 'block'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {item.overbudgetPolicy === 'block' ? '엄격 차단' : '경고 허용'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>부서/항목별 월 예산 한도 통제기</h2>
      <p style={{ color: '#666' }}>
        간식비, 마케팅비, 소모품비 등 계정과목별 월 지출 한도를 설정하고 한도 초과 시 결재를 사전 차단하거나 경고합니다.
      </p>

      {/* 지출 전 한도 시뮬레이션 */}
      <div style={{ padding: 16, backgroundColor: '#fdf4ff', borderRadius: 8, marginBottom: 24, border: '1px solid #f0abfc' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#86198f' }}>💡 지출 결재 전 예산 한도 사전 시뮬레이션</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={checkCategory}
            onChange={(e) => setCheckCategory(e.target.value)}
            style={{ padding: 8 }}
          >
            <option value="">항목 선택...</option>
            {items.map((i) => (
              <option key={i.id} value={i.categoryName}>
                {i.categoryName} (잔여: {(i.monthlyLimit - i.currentSpent).toLocaleString()}원)
              </option>
            ))}
          </select>
          <input
            type="number"
            value={checkExpense}
            onChange={(e) => setCheckExpense(Number(e.target.value))}
            placeholder="지출 예정 금액"
            style={{ width: 160, padding: 8 }}
          />
          {eligibilityResult && (
            <div style={{ fontSize: 13 }}>
              {eligibilityResult.isAllowed ? (
                <span style={{ color: '#047857', fontWeight: 'bold' }}>✓ 지출 승인 가능 (집행 후 잔여 예산 정상)</span>
              ) : (
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  🚨 {eligibilityResult.warningMessage}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleRegister}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          padding: 16,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>예산 항목명</label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="예: 직원 복리후생비(간식)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>월 한도액 (원)</label>
          <input
            type="number"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>당월 누적 지출 (원)</label>
          <input
            type="number"
            value={currentSpent}
            onChange={(e) => setCurrentSpent(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>적용 연월</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>초과 통제 정책</label>
          <select
            value={overbudgetPolicy}
            onChange={(e) => setOverbudgetPolicy(e.target.value as OverbudgetPolicy)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="block">결재 차단 (Block)</option>
            <option value="warn_only">경고 후 특별승인 허용 (Warn Only)</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            예산 설정
          </button>
        </div>
      </form>

      <StandardDataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="설정된 예산 한도가 없습니다"
        emptyDescription="새로운 예산 항목 및 월 한도액을 등록하여 지출 통제를 시작하세요."
        keyExtractor={(item) => item.id}
      />
    </div>
  );
};
