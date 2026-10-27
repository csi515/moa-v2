import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Percent, Plus, FileText, CheckCircle, Calculator } from 'lucide-react';
import {
  calculateWithholdingTax,
  validatePaymentInput,
  type WithholdingTaxRecord,
} from '../domain/taxWithholdingEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const TaxWithholdingListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [freelancerName, setFreelancerName] = useState('');
  const [grossPay, setGrossPay] = useState(2500000);
  const [paymentMonth, setPaymentMonth] = useState('2026-10');

  const { query } = useList<WithholdingTaxRecord>({
    resource: 'withholding_tax_ledgers',
    sorters: [{ field: 'payment_month', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const ledgers = (query?.data?.data as WithholdingTaxRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createLedger } = useCreate();
  const { mutate: updateLedger } = useUpdate();

  const preview = calculateWithholdingTax(grossPay);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validatePaymentInput(freelancerName, grossPay, paymentMonth);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createLedger(
      {
        resource: 'withholding_tax_ledgers',
        values: {
          freelancer_id: `free-${Date.now().toString().slice(-4)}`,
          freelancer_name: freelancerName.trim(),
          payment_month: paymentMonth,
          gross_pay: grossPay,
          income_tax: preview.incomeTax,
          local_tax: preview.localTax,
          total_tax: preview.totalTax,
          net_pay: preview.netPay,
          paid_at: new Date().toISOString(),
          is_remitted: false,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${freelancerName}] 3.3% 원천징수 원장 등록 완료 (실지급: ${preview.netPay.toLocaleString()}원)`, 'success');
          setIsModalOpen(false);
          setFreelancerName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '등록 실패', 'error');
        },
      }
    );
  };

  const handleToggleRemit = (ledger: WithholdingTaxRecord) => {
    updateLedger(
      {
        resource: 'withholding_tax_ledgers',
        id: ledger.id,
        values: { is_remitted: !ledger.is_remitted },
      },
      {
        onSuccess: () => {
          showToast(`세무서 신고납부 상태가 ${!ledger.is_remitted ? '완료' : '미납'}로 변경되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Percent className="w-7 h-7 text-teal-600" />
            강사·프리랜서 3.3% 사업소득세 원천징수 원장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            강사료 및 프리랜서 정산 시 소득세(3.0%) 및 지방소득세(0.3%) 원단위 절사 공제와 지급명세를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 원천징수 정산 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">지급 연월</th>
              <th className="p-3">소득자 성명</th>
              <th className="p-3 text-right">세전 총액</th>
              <th className="p-3 text-right">소득세(3%)</th>
              <th className="p-3 text-right">지방세(0.3%)</th>
              <th className="p-3 text-right font-bold text-teal-700 dark:text-teal-400">차인 실지급액</th>
              <th className="p-3 text-center">세무 신고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : ledgers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 원천징수 내역이 없습니다.</td>
              </tr>
            ) : (
              ledgers.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-medium">{l.payment_month}</td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{l.freelancer_name}</td>
                  <td className="p-3 text-right font-medium">{l.gross_pay.toLocaleString()}원</td>
                  <td className="p-3 text-right text-slate-500">{l.income_tax.toLocaleString()}원</td>
                  <td className="p-3 text-right text-slate-500">{l.local_tax.toLocaleString()}원</td>
                  <td className="p-3 text-right font-bold text-teal-700 dark:text-teal-400 text-base">
                    {l.net_pay.toLocaleString()}원
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleRemit(l)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        l.is_remitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.is_remitted ? '신고납부 완료' : '미납 (신고예정)'}
                    </button>
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
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-700">
              <Percent className="w-5 h-5" />
              신규 강사료 3.3% 원천징수 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">프리랜서/강사 성명 *</label>
                <input
                  type="text"
                  value={freelancerName}
                  onChange={(e) => setFreelancerName(e.target.value)}
                  placeholder="예: 김선생"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">지급 대상 연월 *</label>
                  <input
                    type="month"
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">세전 지급 총액(원) *</label>
                  <input
                    type="number"
                    value={grossPay}
                    onChange={(e) => setGrossPay(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                    required
                  />
                </div>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>소득세 (3.0% 원단위 절사):</span>
                  <span className="font-semibold text-rose-600">-{preview.incomeTax.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>지방소득세 (0.3% 원단위 절사):</span>
                  <span className="font-semibold text-rose-600">-{preview.localTax.toLocaleString()}원</span>
                </div>
                <div className="pt-2 border-t flex justify-between text-sm font-bold text-teal-900 dark:text-teal-200">
                  <span>강사 실지급액:</span>
                  <span>{preview.netPay.toLocaleString()}원</span>
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  정산 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
