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
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import { Modal } from '@/shared/components/ui/Modal';

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
          showToast.error(err, '시재금 마감 저장 실패');
        },
      }
    );
  };

  const columns: StandardColumn<PosReconciliationRecord>[] = [
    {
      key: 'reconciled_at',
      header: '일시',
      render: (rec) => <span className="text-xs font-mono text-slate-500">{new Date(rec.reconciled_at).toLocaleString('ko-KR')}</span>,
    },
    {
      key: 'register_name',
      header: '금고/포스',
      render: (rec) => <span className="font-medium text-slate-900">{rec.register_name}</span>,
    },
    {
      key: 'opening_cash',
      header: '개점 준비금',
      align: 'right',
      render: (rec) => <span className="tabular-nums font-mono text-slate-600">{rec.opening_cash.toLocaleString()}원</span>,
    },
    {
      key: 'expected_cash',
      header: '기대 시재액',
      align: 'right',
      render: (rec) => <span className="tabular-nums font-mono text-slate-700">{rec.expected_cash.toLocaleString()}원</span>,
    },
    {
      key: 'actual_cash',
      header: '실사 현금',
      align: 'right',
      render: (rec) => <span className="tabular-nums font-mono font-semibold text-slate-900">{rec.actual_cash.toLocaleString()}원</span>,
    },
    {
      key: 'difference',
      header: '차액(과부족)',
      align: 'right',
      render: (rec) => (
        <span
          className={`tabular-nums font-mono font-bold ${
            rec.difference === 0
              ? 'text-slate-600 dark:text-slate-400'
              : rec.difference > 0
              ? 'text-blue-600'
              : 'text-rose-600'
          }`}
        >
          {rec.difference > 0 ? `+${rec.difference.toLocaleString()}` : rec.difference.toLocaleString()}원
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (rec) => (
        <>
          {rec.difference === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" /> 시재 일치
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              <AlertTriangle className="w-3.5 h-3.5" /> 차액 발생
            </span>
          )}
        </>
      ),
    },
  ];

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
      <StandardDataTable
        data={reconciliations}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="등록된 시재 마감 내역이 없습니다"
        emptyDescription="신규 마감 실사 버튼을 눌러 오늘 일일 시재를 점검하세요."
        keyExtractor={(rec) => rec.id}
      />

      {/* 등록 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="신규 시재금 실사 마감"
        maxWidth="lg"
      >
        <div className="p-1">
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
      </Modal>
    </div>
  );
};
