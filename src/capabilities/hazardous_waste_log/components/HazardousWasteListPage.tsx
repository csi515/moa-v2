import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { AlertOctagon, Plus, Calendar, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  calculateStorageLimitDday,
  validateDischargeInput,
  type WasteDischargeRecord,
  type WasteCategory,
  type WasteContainerStatus,
} from '../domain/hazardousWasteEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const HazardousWasteListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [containerCode, setContainerCode] = useState('');
  const [category, setCategory] = useState<WasteCategory>('INFECTIOUS_NEEDLE');
  const [weightKg, setWeightKg] = useState(1.5);
  const [firstDate, setFirstDate] = useState(new Date().toISOString().split('T')[0]);

  const { query } = useList<WasteDischargeRecord>({
    resource: 'waste_discharge_logs',
    sorters: [{ field: 'first_discharge_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as WasteDischargeRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateDischargeInput(containerCode, weightKg);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'waste_discharge_logs',
        values: {
          container_code: containerCode.trim(),
          category,
          weight_kg: weightKg,
          first_discharge_date: firstDate,
          status: 'STORING',
        },
      },
      {
        onSuccess: () => {
          showToast(`용기 [${containerCode}] 배출 등록 완료`, 'success');
          setIsModalOpen(false);
          setContainerCode('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '등록 실패', 'error');
        },
      }
    );
  };

  const handleStatusChange = (record: WasteDischargeRecord, nextStatus: WasteContainerStatus) => {
    updateRecord(
      {
        resource: 'waste_discharge_logs',
        id: record.id,
        values: {
          status: nextStatus,
          sealed_date: nextStatus === 'SEALED' ? new Date().toISOString().split('T')[0] : record.sealed_date,
          handed_over_date: nextStatus === 'HANDED_OVER' ? new Date().toISOString().split('T')[0] : undefined,
          collector_name: nextStatus === 'HANDED_OVER' ? '한국의료폐기물공사' : undefined,
        },
      },
      {
        onSuccess: () => {
          showToast(`용기 상태가 [${nextStatus}]로 변경되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  const getCategoryLabel = (cat: WasteCategory) => {
    switch (cat) {
      case 'INFECTIOUS_NEEDLE':
        return '손상성 (주사바늘/침)';
      case 'INFECTIOUS_GENERAL':
        return '일반 의료 (거즈/붕대)';
      case 'CHEMICAL_REAGENT':
        return '화학 폐약제 (염색/파마)';
      case 'MEDICATION_EXPIRED':
        return '폐의약품';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <AlertOctagon className="w-7 h-7 text-red-600" />
            의료·유해 폐기물 및 폐약제 배출 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            법정 최대 보관 기한(15일) D-Day 추적 및 전용 수거업체 위탁 인계를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 배출 용기 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">용기 식별 코드</th>
              <th className="p-3">폐기물 분류</th>
              <th className="p-3 text-right">중량(kg)</th>
              <th className="p-3">최초 투입일</th>
              <th className="p-3">보관 기한 (15일)</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">인계 작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 유해 폐기물 용기가 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => {
                const dday = calculateStorageLimitDday(r.first_discharge_date, 15);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-red-600">{r.container_code}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 font-medium border border-red-200">
                        {getCategoryLabel(r.category)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{r.weight_kg} kg</td>
                    <td className="p-3 text-slate-500">{r.first_discharge_date}</td>
                    <td className="p-3">
                      {r.status === 'HANDED_OVER' ? (
                        <span className="text-slate-400 text-xs">인계 완료됨</span>
                      ) : dday.isOverdue ? (
                        <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> 기한초과 ({Math.abs(dday.daysRemaining)}일 위반)
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium text-xs">
                          {dday.deadlineDate} (D-{dday.daysRemaining})
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.status === 'STORING' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium">보관 적재중</span>
                      )}
                      {r.status === 'SEALED' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-semibold">용기 밀봉완료</span>
                      )}
                      {r.status === 'HANDED_OVER' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">수거 인계완료</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {r.status === 'STORING' && (
                        <button
                          onClick={() => handleStatusChange(r, 'SEALED')}
                          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium"
                        >
                          용기 밀봉
                        </button>
                      )}
                      {r.status === 'SEALED' && (
                        <button
                          onClick={() => handleStatusChange(r, 'HANDED_OVER')}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                        >
                          수거업체 인계
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-600">
              <AlertOctagon className="w-5 h-5" />
              신규 유해 폐기물 전용 용기 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">용기 바코드 / 식별 코드 *</label>
                <input
                  type="text"
                  value={containerCode}
                  onChange={(e) => setContainerCode(e.target.value)}
                  placeholder="예: MED-BOX-2026-04"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">폐기물 분류 *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WasteCategory)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="INFECTIOUS_NEEDLE">손상성 (주사바늘, 침, 메스)</option>
                  <option value="INFECTIOUS_GENERAL">일반 의료 (거즈, 붕대, 탈지면)</option>
                  <option value="CHEMICAL_REAGENT">화학 폐액 (파마약, 염색약, 시약)</option>
                  <option value="MEDICATION_EXPIRED">폐의약품</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">배출 중량 (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">최초 투입일 *</label>
                  <input
                    type="date"
                    value={firstDate}
                    onChange={(e) => setFirstDate(e.target.value)}
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
