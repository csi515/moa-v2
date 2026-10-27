import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Receipt, Plus, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import {
  validateExpenseClaim,
  type PettyCashExpenseRecord,
  type ExpenseCategory,
  type ExpenseApprovalStatus,
} from '../domain/pettyCashEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const PettyCashListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimantName, setClaimantName] = useState('김직원');
  const [category, setCategory] = useState<ExpenseCategory>('SUPPLIES');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [amount, setAmount] = useState(15000);
  const [merchantName, setMerchantName] = useState('');

  const { query } = useList<PettyCashExpenseRecord>({
    resource: 'petty_cash_expenses',
    sorters: [{ field: 'spent_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const expenses = (query?.data?.data as PettyCashExpenseRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createExpense } = useCreate();
  const { mutate: updateExpense } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateExpenseClaim(expenseTitle, amount, claimantName);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createExpense(
      {
        resource: 'petty_cash_expenses',
        values: {
          claimant_name: claimantName.trim(),
          category,
          expense_title: expenseTitle.trim(),
          amount,
          merchant_name: merchantName.trim() || undefined,
          spent_at: new Date().toISOString(),
          status: 'PENDING_REVIEW',
        },
      },
      {
        onSuccess: () => {
          showToast(`소액 지출 품의(${amount.toLocaleString()}원)가 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          setExpenseTitle('');
          setMerchantName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '지출 등록 실패', 'error');
        },
      }
    );
  };

  const handleApprove = (exp: PettyCashExpenseRecord, status: 'APPROVED' | 'REJECTED') => {
    updateExpense(
      {
        resource: 'petty_cash_expenses',
        id: exp.id,
        values: {
          status,
          approved_by: status === 'APPROVED' ? '원장' : undefined,
        },
      },
      {
        onSuccess: () => {
          showToast(`지출이 ${status === 'APPROVED' ? '승인' : '반려'}되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'SUPPLIES':
        return '사무/비품';
      case 'SNACKS_BEVERAGE':
        return '다과/음료';
      case 'MAINTENANCE_REPAIR':
        return '긴급 수리비';
      case 'DELIVERY_FEE':
        return '택배/우편';
      case 'MISCELLANEOUS':
        return '기타 잡비';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Receipt className="w-7 h-7 text-emerald-600" />
            소액 현금 지출 증빙 및 영수증 실사 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            비품 구매, 다과비, 배달비 등 현장 전도금 소액 지출 영수증을 품의하고 승인합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 소액 지출 품의
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">지출 일시</th>
              <th className="p-3">신청자</th>
              <th className="p-3">세목 분류</th>
              <th className="p-3">지출 내역 / 상호</th>
              <th className="p-3 text-right font-bold">지출 금액</th>
              <th className="p-3 text-center">승인 상태</th>
              <th className="p-3 text-right">결재</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 소액 지출 내역이 없습니다.</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{new Date(exp.spent_at).toLocaleDateString('ko-KR')}</td>
                  <td className="p-3 font-medium">{exp.claimant_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                      {getCategoryLabel(exp.category)}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{exp.expense_title}</p>
                    {exp.merchant_name && <p className="text-xs text-slate-400">{exp.merchant_name}</p>}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    {exp.amount.toLocaleString()}원
                  </td>
                  <td className="p-3 text-center">
                    {exp.status === 'PENDING_REVIEW' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-semibold">결재 대기</span>
                    )}
                    {exp.status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">승인 완료</span>
                    )}
                    {exp.status === 'REJECTED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-semibold">반려</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {exp.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          onClick={() => handleApprove(exp, 'APPROVED')}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleApprove(exp, 'REJECTED')}
                          className="px-2.5 py-1 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-100 font-medium"
                        >
                          반려
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <Receipt className="w-5 h-5" />
              신규 소액 현금 지출 품의
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">지출 직원 *</label>
                  <input
                    type="text"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">세목 분류 *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="SUPPLIES">사무/비품비</option>
                    <option value="SNACKS_BEVERAGE">다과/음료비</option>
                    <option value="MAINTENANCE_REPAIR">긴급 수리비</option>
                    <option value="DELIVERY_FEE">택배/우편비</option>
                    <option value="MISCELLANEOUS">기타 잡비</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">지출 항목명 *</label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="예: 다이소 멀티탭 및 청소용품 구매"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">지출 금액 (원) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">거래처 상호</label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="예: 다이소 강남점"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  품의 제출
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
