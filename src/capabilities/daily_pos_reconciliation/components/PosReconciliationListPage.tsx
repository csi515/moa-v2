import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Calculator, Plus, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import {
  computeExpectedCash,
  computeDiscrepancy,
  validateReconciliationInput,
  type PosReconciliationRecord,
} from '../domain/posReconciliationEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const PosReconciliationListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerName, setRegisterName] = useState('메인 금고 1호');
  const [openingCash, setOpeningCash] = useState(100000);
  const [cashSales, setCashSales] = useState(0);
  const [cashRefunds, setCashRefunds] = useState(0);
  const [cashExpenses, setCashExpenses] = useState(0);
  const [actualCash, setActualCash] = useState(100000);
  const [notes, setNotes] = useState('');

  const { query } = useList<PosReconciliationRecord>({
    resource: 'daily_pos_reconciliations',
    sorters: [{ field: 'reconciled_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const reconciliations = (query?.data?.data as PosReconciliationRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createReconciliation } = useCreate();

  const expected = computeExpectedCash(openingCash, cashSales, cashRefunds, cashExpenses);
  const discrepancy = computeDiscrepancy(expected, actualCash);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateReconciliationInput(registerName, openingCash, actualCash);
    if (!validation.isValid) {
      showToast(validation.error || '입력값을 확인해 주세요.', 'error');
      return;
    }

    createReconciliation(
      {
        resource: 'daily_pos_reconciliations',
        values: {
          register_name: registerName,
          opening_cash: openingCash,
          cash_sales: cashSales,
          cash_refunds: cashRefunds,
          cash_expenses: cashExpenses,
          expected_cash: expected,
          actual_cash: actualCash,
          difference: discrepancy.difference,
          status: discrepancy.status,
          notes,
          reconciled_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('일일 시재금 마감이 저장되었습니다.', 'success');
          setIsModalOpen(false);
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '시재금 마감 저장 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Calculator className="w-7 h-7 text-emerald-600" />
            일일 현금 시재금 마감 및 금고 실사
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            당일 영업 시작 준비금과 현금 매출·지출 내역을 금고 실사액과 대조하여 마감합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 시재금 실사 등록
        </button>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">일시</th>
              <th className="p-3">금고/포스</th>
              <th className="p-3 text-right">개점 준비금</th>
              <th className="p-3 text-right">기대 시재액</th>
              <th className="p-3 text-right">실사 현금</th>
              <th className="p-3 text-right">차액(과부족)</th>
              <th className="p-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  데이터 불러오는 중...
                </td>
              </tr>
            ) : reconciliations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  등록된 시재 마감 내역이 없습니다.
                </td>
              </tr>
            ) : (
              reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3">{new Date(rec.reconciled_at).toLocaleString('ko-KR')}</td>
                  <td className="p-3 font-medium">{rec.register_name}</td>
                  <td className="p-3 text-right">{rec.opening_cash.toLocaleString()}원</td>
                  <td className="p-3 text-right">{rec.expected_cash.toLocaleString()}원</td>
                  <td className="p-3 text-right font-semibold">{rec.actual_cash.toLocaleString()}원</td>
                  <td
                    className={`p-3 text-right font-bold ${
                      rec.difference === 0
                        ? 'text-slate-600 dark:text-slate-400'
                        : rec.difference > 0
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {rec.difference > 0 ? `+${rec.difference.toLocaleString()}` : rec.difference.toLocaleString()}원
                  </td>
                  <td className="p-3 text-center">
                    {rec.difference === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5" /> 시재 일치
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3.5 h-3.5" /> 차액 발생
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              신규 시재금 실사 마감
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">포스/금고 식별명</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">개점 준비금(원)</label>
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">현금 매출 합계(원)</label>
                  <input
                    type="number"
                    value={cashSales}
                    onChange={(e) => setCashSales(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">현금 환불 합계(원)</label>
                  <input
                    type="number"
                    value={cashRefunds}
                    onChange={(e) => setCashRefunds(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">현금 소액 지출(원)</label>
                  <input
                    type="number"
                    value={cashExpenses}
                    onChange={(e) => setCashExpenses(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>장부상 기대 시재:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {expected.toLocaleString()}원
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  실제 실사 금고 현금(원) *
                </label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-emerald-500 rounded-lg text-base font-bold text-slate-800"
                  required
                />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs flex justify-between items-center">
                <span>차액 (실사 - 장부):</span>
                <span
                  className={`font-bold ${
                    discrepancy.difference === 0
                      ? 'text-emerald-600'
                      : discrepancy.difference > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}
                >
                  {discrepancy.difference > 0 ? `+${discrepancy.difference}` : discrepancy.difference}원
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">특이사항 메모</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
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
                  마감 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
