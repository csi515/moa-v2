import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Store, Plus, DollarSign, Calendar, Calculator } from 'lucide-react';
import {
  computeMonthlySubleaseSettlement,
  validateContractDates,
  type SubleaseContractRecord,
  type SubleaseFeeType,
} from '../domain/subleaseEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const SubleaseListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subtenantName, setSubtenantName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [feeType, setFeeType] = useState<SubleaseFeeType>('FIXED_RENT');
  const [deposit, setDeposit] = useState(5000000);
  const [fixedRent, setFixedRent] = useState(700000);
  const [revenueShare, setRevenueShare] = useState(15);
  const [utilityFee, setUtilityFee] = useState(100000);
  const [contractStart, setContractStart] = useState('2026-01-01');
  const [contractEnd, setContractEnd] = useState('2026-12-31');

  // 간이 정산 시뮬레이터 상태
  const [selectedContract, setSelectedContract] = useState<SubleaseContractRecord | null>(null);
  const [simulationRevenue, setSimulationRevenue] = useState(5000000);

  const { query } = useList<SubleaseContractRecord>({
    resource: 'sublease_contracts',
    sorters: [{ field: 'contract_start', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const contracts = (query?.data?.data as SubleaseContractRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createContract } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtenantName.trim()) {
      showToast('입점 사업자명을 입력해 주세요.', 'error');
      return;
    }
    const dateCheck = validateContractDates(contractStart, contractEnd);
    if (!dateCheck.isValid) {
      showToast(dateCheck.error || '계약 기간 오류', 'error');
      return;
    }

    createContract(
      {
        resource: 'sublease_contracts',
        values: {
          subtenant_name: subtenantName.trim(),
          space_description: spaceDescription.trim() || '매장 내 지정 구역',
          fee_type: feeType,
          deposit_amount: deposit,
          fixed_monthly_rent: fixedRent,
          revenue_share_percent: revenueShare,
          utility_fixed_fee: utilityFee,
          contract_start: contractStart,
          contract_end: contractEnd,
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${subtenantName}] 샵인샵 전대차 계약이 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          setSubtenantName('');
          setSpaceDescription('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '계약 등록 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Store className="w-7 h-7 text-indigo-600" />
            샵인샵 전대차 계약 및 매출 쉐어 정산
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            매장 내 네일/카페/에스테틱 입점 전대차 계약과 월별 수수료·공과금 안분을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 전대차 계약 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">입점 사업자명</th>
              <th className="p-3">입점 구역/위치</th>
              <th className="p-3">정산 방식</th>
              <th className="p-3 text-right">보증금</th>
              <th className="p-3 text-right">월 임대료 / 요율</th>
              <th className="p-3">계약 기간</th>
              <th className="p-3 text-right">정산 계산</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 샵인샵 계약이 없습니다.</td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-semibold text-indigo-600">{c.subtenant_name}</td>
                  <td className="p-3 text-slate-600">{c.space_description}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                      {c.fee_type === 'FIXED_RENT'
                        ? '고정 월세'
                        : c.fee_type === 'REVENUE_SHARE'
                        ? '매출 % 수수료'
                        : '하이브리드'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{c.deposit_amount.toLocaleString()}원</td>
                  <td className="p-3 text-right font-medium">
                    {c.fee_type === 'FIXED_RENT'
                      ? `${c.fixed_monthly_rent.toLocaleString()}원`
                      : `${c.revenue_share_percent}%`}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {c.contract_start} ~ {c.contract_end}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedContract(c);
                        setSimulationRevenue(5000000);
                      }}
                      className="px-2.5 py-1 text-xs border rounded hover:bg-slate-100 font-medium inline-flex items-center gap-1 text-indigo-600 border-indigo-200"
                    >
                      <Calculator className="w-3.5 h-3.5" /> 월 정산 계산
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 정산 시뮬레이션 모달 */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-700">
              <Calculator className="w-5 h-5" />
              [{selectedContract.subtenant_name}] 월 정산 산출
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  당월 입점 매장 총매출액(원)
                </label>
                <input
                  type="number"
                  value={simulationRevenue}
                  onChange={(e) => setSimulationRevenue(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                />
              </div>

              {(() => {
                const res = computeMonthlySubleaseSettlement(selectedContract, simulationRevenue);
                return (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">기본 임대료:</span>
                      <span className="font-semibold">{res.baseRent.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">매출 쉐어 수수료:</span>
                      <span className="font-semibold">{res.commissionFee.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">공과금/관리비:</span>
                      <span className="font-semibold">{res.utilityFee.toLocaleString()}원</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      <span>최종 청구 총액:</span>
                      <span>{res.totalSettlementAmount.toLocaleString()}원</span>
                    </div>
                  </div>
                );
              })()}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedContract(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
              <Store className="w-5 h-5" />
              신규 샵인샵 전대차 계약 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">입점 사업자/브랜드명 *</label>
                <input
                  type="text"
                  value={subtenantName}
                  onChange={(e) => setSubtenantName(e.target.value)}
                  placeholder="예: 루미네일"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">입점 구역 및 면적</label>
                <input
                  type="text"
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                  placeholder="예: 1층 데스크 우측 네일존 (12㎡)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">정산 형태 *</label>
                  <select
                    value={feeType}
                    onChange={(e) => setFeeType(e.target.value as SubleaseFeeType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="FIXED_RENT">월 고정 임대료</option>
                    <option value="REVENUE_SHARE">매출 % 수수료</option>
                    <option value="HYBRID">하이브리드 (최저보장+%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">임대 보증금(원)</label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">월 고정세(원)</label>
                  <input
                    type="number"
                    value={fixedRent}
                    onChange={(e) => setFixedRent(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">매출요율(%)</label>
                  <input
                    type="number"
                    value={revenueShare}
                    onChange={(e) => setRevenueShare(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">공과금(원)</label>
                  <input
                    type="number"
                    value={utilityFee}
                    onChange={(e) => setUtilityFee(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">계약 시작일</label>
                  <input
                    type="date"
                    value={contractStart}
                    onChange={(e) => setContractStart(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">계약 종료일</label>
                  <input
                    type="date"
                    value={contractEnd}
                    onChange={(e) => setContractEnd(e.target.value)}
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  계약 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
