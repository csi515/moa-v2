import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { PieChart, Plus, DollarSign, Users, CheckCircle, Calculator } from 'lucide-react';
import {
  computeProfitDistribution,
  validateEquityRatios,
  type ProfitShareRecord,
  type EquityPartner,
} from '../domain/profitShareEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

const DEFAULT_PARTNERS: EquityPartner[] = [
  { partner_id: 'p-1', partner_name: '김공동대표', equity_ratio_percent: 60 },
  { partner_id: 'p-2', partner_name: '이공동대표', equity_ratio_percent: 40 },
];

export const ProfitShareListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [month, setMonth] = useState('2026-10');
  const [totalRevenue, setTotalRevenue] = useState(35000000);
  const [totalExpenses, setTotalExpenses] = useState(15000000);
  const [reserveRate, setReserveRate] = useState(10);

  const { query } = useList<ProfitShareRecord>({
    resource: 'profit_share_distributions',
    sorters: [{ field: 'settlement_month', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const distributions = (query?.data?.data as ProfitShareRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const preview = computeProfitDistribution(totalRevenue, totalExpenses, reserveRate, DEFAULT_PARTNERS);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createRecord(
      {
        resource: 'profit_share_distributions',
        values: {
          settlement_month: month,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: preview.netProfit,
          reserve_rate_percent: reserveRate,
          reserve_amount: preview.reserveAmount,
          distributable_profit: preview.distributableProfit,
          distributions: preview.distributions,
          is_confirmed: false,
          settled_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`${month}월 파트너 손익 배당안이 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '배당안 등록 실패', 'error');
        },
      }
    );
  };

  const handleConfirm = (rec: ProfitShareRecord) => {
    updateRecord(
      {
        resource: 'profit_share_distributions',
        id: rec.id,
        values: { is_confirmed: true },
      },
      {
        onSuccess: () => {
          showToast(`[${rec.settlement_month}월] 동업자 배당이 최종 확정되었습니다.`, 'success');
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
            <PieChart className="w-7 h-7 text-indigo-600" />
            동업자·파트너 지분별 손익 안분 계산기
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            월간 총매출-총지출 순이익에서 비상 유보금을 공제한 후 약정 지분율(6:4 등)에 따라 배당액을 안분합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 월간 손익 배당안 산출
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">정산 연월</th>
              <th className="p-3 text-right">총매출액</th>
              <th className="p-3 text-right">총운영비용</th>
              <th className="p-3 text-right font-bold">당월 순이익</th>
              <th className="p-3 text-right">사내 유보금</th>
              <th className="p-3">파트너별 배당 안분 내역</th>
              <th className="p-3 text-center">확정 여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : distributions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 손익 안분 배당 내역이 없습니다.</td>
              </tr>
            ) : (
              distributions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-indigo-600">{d.settlement_month}</td>
                  <td className="p-3 text-right font-medium">{d.total_revenue.toLocaleString()}원</td>
                  <td className="p-3 text-right text-slate-500">{d.total_expenses.toLocaleString()}원</td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    {d.net_profit.toLocaleString()}원
                  </td>
                  <td className="p-3 text-right text-xs text-slate-400">
                    {d.reserve_amount.toLocaleString()}원 ({d.reserve_rate_percent}%)
                  </td>
                  <td className="p-3 text-xs">
                    <div className="space-y-1">
                      {d.distributions.map((dist, idx) => (
                        <div key={idx} className="flex justify-between gap-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {dist.partner_name} ({dist.equity_ratio_percent}%)
                          </span>
                          <span className="font-bold text-indigo-600">
                            {dist.dividend_amount.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {d.is_confirmed ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">확정 배당완료</span>
                    ) : (
                      <button
                        onClick={() => handleConfirm(d)}
                        className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 font-semibold"
                      >
                        배당 확정 서명
                      </button>
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
            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
              <PieChart className="w-5 h-5" />
              당월 파트너 손익 배당안 산출
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">정산 대상 연월 *</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">유보금 비율 (%)</label>
                  <input
                    type="number"
                    value={reserveRate}
                    onChange={(e) => setReserveRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">총매출액(원) *</label>
                  <input
                    type="number"
                    value={totalRevenue}
                    onChange={(e) => setTotalRevenue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">총운영비용(원) *</label>
                  <input
                    type="number"
                    value={totalExpenses}
                    onChange={(e) => setTotalExpenses(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>당월 순이익:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preview.netProfit.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>사내 유보금 ({reserveRate}%):</span>
                  <span className="font-semibold text-slate-500">-{preview.reserveAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-700">
                  <span>배당 대상 순익:</span>
                  <span>{preview.distributableProfit.toLocaleString()}원</span>
                </div>
                <div className="pt-2 border-t space-y-1">
                  {preview.distributions.map((p, idx) => (
                    <div key={idx} className="flex justify-between font-semibold">
                      <span>{p.partner_name} ({p.equity_ratio_percent}%):</span>
                      <span className="text-emerald-600 font-bold">{p.dividend_amount.toLocaleString()}원</span>
                    </div>
                  ))}
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  배당안 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
