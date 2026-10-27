import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Zap, Plus, Droplets, Flame, Calendar, DollarSign } from 'lucide-react';
import {
  computeUtilityUsage,
  computeUtilityCost,
  getUtilityUnitLabel,
  type UtilityMeterReadingRecord,
  type UtilityType,
} from '../domain/utilityMeterEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const UtilityMeterListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoneName, setZoneName] = useState('201호 음악연습실');
  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [meterSerial, setMeterSerial] = useState('MTR-8812');
  const [prevReading, setPrevReading] = useState(1200);
  const [currReading, setCurrReading] = useState(1450);
  const [unitPrice, setUnitPrice] = useState(150);
  const [billedMonth, setBilledMonth] = useState('2026-10');

  const { query } = useList<UtilityMeterReadingRecord>({
    resource: 'utility_meter_readings',
    sorters: [{ field: 'reading_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const readings = (query?.data?.data as UtilityMeterReadingRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createReading } = useCreate();

  const usageCalc = computeUtilityUsage(prevReading, currReading);
  const billedCost = usageCalc.isValid ? computeUtilityCost(usageCalc.usage, unitPrice) : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageCalc.isValid) {
      showToast(usageCalc.error || '지침 수치 오류', 'error');
      return;
    }

    createReading(
      {
        resource: 'utility_meter_readings',
        values: {
          zone_name: zoneName.trim(),
          utility_type: utilityType,
          meter_serial: meterSerial.trim(),
          previous_reading: prevReading,
          current_reading: currReading,
          usage_amount: usageCalc.usage,
          unit_price: unitPrice,
          total_billed_amount: billedCost,
          reading_date: new Date().toISOString().split('T')[0],
          billed_month: billedMonth,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${zoneName}] ${billedMonth}월 검침 기록 저장 완료 (${billedCost.toLocaleString()}원)`, 'success');
          setIsModalOpen(false);
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '검침 저장 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Zap className="w-7 h-7 text-yellow-600" />
            구역별 수도·전기 검침 및 관리비 분할 정산
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            호실별/스튜디오별 전기·수도 계량기 지침 차감 및 누진 단가 적용 관리비를 산출합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 계량기 검침 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">부과 연월</th>
              <th className="p-3">구역/호실명</th>
              <th className="p-3">검침 종목</th>
              <th className="p-3 text-right">전월 지침</th>
              <th className="p-3 text-right">당월 지침</th>
              <th className="p-3 text-right font-bold">사용량</th>
              <th className="p-3 text-right">단가</th>
              <th className="p-3 text-right font-bold">부과 금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : readings.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">등록된 검침 내역이 없습니다.</td>
              </tr>
            ) : (
              readings.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-medium">{r.billed_month}</td>
                  <td className="p-3 font-semibold text-yellow-700 dark:text-yellow-400">{r.zone_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-50 text-yellow-800 font-medium border border-yellow-200">
                      {r.utility_type === 'ELECTRICITY' ? '전기' : r.utility_type === 'WATER' ? '수도' : '가스'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-400">{r.previous_reading}</td>
                  <td className="p-3 text-right text-slate-600">{r.current_reading}</td>
                  <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                    {r.usage_amount} {getUtilityUnitLabel(r.utility_type)}
                  </td>
                  <td className="p-3 text-right text-slate-500">{r.unit_price}원</td>
                  <td className="p-3 text-right font-bold text-yellow-800 dark:text-yellow-300">
                    {r.total_billed_amount.toLocaleString()}원
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
            <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-700">
              <Zap className="w-5 h-5" />
              당월 계량기 지침 입력 및 고지
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">구역/호실명 *</label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="예: 301호 밴드실"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">검침 종목 *</label>
                  <select
                    value={utilityType}
                    onChange={(e) => {
                      const t = e.target.value as UtilityType;
                      setUtilityType(t);
                      if (t === 'ELECTRICITY') setUnitPrice(150);
                      else if (t === 'WATER') setUnitPrice(1200);
                      else setUnitPrice(900);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="ELECTRICITY">전기 (kWh)</option>
                    <option value="WATER">수도 (m³)</option>
                    <option value="GAS">도시가스 (m³)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">계량기 번호(S/N)</label>
                  <input
                    type="text"
                    value={meterSerial}
                    onChange={(e) => setMeterSerial(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">부과 연월 (YYYY-MM)</label>
                  <input
                    type="month"
                    value={billedMonth}
                    onChange={(e) => setBilledMonth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">전월 지침</label>
                  <input
                    type="number"
                    value={prevReading}
                    onChange={(e) => setPrevReading(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                    당월 실사 지침 *
                  </label>
                  <input
                    type="number"
                    value={currReading}
                    onChange={(e) => setCurrReading(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-yellow-500 rounded-lg text-sm font-bold"
                    required
                  />
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>실사용량:</span>
                  <span className="font-bold">
                    {usageCalc.isValid ? `${usageCalc.usage} ${getUtilityUnitLabel(utilityType)}` : '지침 오류'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t text-sm font-bold text-yellow-900 dark:text-yellow-200">
                  <span>부과 산출 금액:</span>
                  <span>{billedCost.toLocaleString()}원</span>
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
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  검침 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
