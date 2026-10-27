import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Box, Plus, TrendingDown, Users, CheckCircle } from 'lucide-react';
import {
  computeDispenseCost,
  validateDispenseInput,
  type ConsumableDispenseRecord,
} from '../domain/consumableDispenserEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const ConsumableDispenserListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('복사용지 A4 (Box)');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(25000);
  const [department, setDepartment] = useState('교무기획팀');
  const [staffName, setStaffName] = useState('');

  const { query } = useList<ConsumableDispenseRecord>({
    resource: 'consumable_dispenses',
    sorters: [{ field: 'dispensed_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as ConsumableDispenseRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();

  const totalCost = computeDispenseCost(unitCost, quantity);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateDispenseInput(itemName, quantity, department, staffName);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'consumable_dispenses',
        values: {
          item_id: 'item-auto',
          item_name: itemName.trim(),
          quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          department: department.trim(),
          staff_name: staffName.trim(),
          dispensed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${itemName} x ${quantity}] 불출 등록 완료 (${department})`, 'success');
          setIsModalOpen(false);
          setStaffName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '불출 등록 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Box className="w-7 h-7 text-orange-600" />
            사내 소모품 자율 불출 및 부서별 비용 배부
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            A4용지, 음료 캡슐, 테이핑, 타월 등 직원 자율 불출 기록과 부서별 예산 소진을 추적합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 소모품 불출 기록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">불출 일시</th>
              <th className="p-3">품목명</th>
              <th className="p-3 text-right">수량</th>
              <th className="p-3 text-right">단가</th>
              <th className="p-3 text-right font-semibold">배부 금액</th>
              <th className="p-3">비용 귀속 부서</th>
              <th className="p-3">불출 직원</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 소모품 불출 이력이 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{new Date(r.dispensed_at).toLocaleString('ko-KR')}</td>
                  <td className="p-3 font-semibold text-orange-700 dark:text-orange-400">{r.item_name}</td>
                  <td className="p-3 text-right font-bold">{r.quantity}</td>
                  <td className="p-3 text-right text-slate-500">{r.unit_cost.toLocaleString()}원</td>
                  <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                    {r.total_cost.toLocaleString()}원
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-800 font-medium border border-orange-200">
                      {r.department}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{r.staff_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-600">
              <Box className="w-5 h-5" />
              사내 소모품 불출 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">소모품 품목명 *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 복사용지 A4, 네스프레소 캡슐"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">불출 수량 *</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">단위 단가(원)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg flex justify-between text-xs font-bold text-orange-800 dark:text-orange-200">
                <span>총 소모 비용:</span>
                <span>{totalCost.toLocaleString()}원</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">비용 귀속 부서 *</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 초등영어부"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">불출 직원 성명 *</label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="예: 정선생"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
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
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  불출 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
