import React, { useMemo, useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  PlusCircle,
  FileText,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useOpsTable } from '@/hooks/useOpsTable';
import {
  EquipmentAsset,
  evaluateRepairVsReplaceDecision,
  evaluateEquipmentUrgency,
  reportEquipmentBreakdown,
} from '../domain/equipmentLifecycleEngine';

type LifecycleRow = {
  id: string;
  name: string;
  status: string;
  meta: Partial<EquipmentAsset> & Record<string, unknown>;
  department_id?: string | null;
};

function toAsset(row: LifecycleRow): EquipmentAsset {
  return {
    id: row.id,
    name: row.name,
    category: (row.meta.category as EquipmentAsset['category']) || 'fitness',
    purchaseCost: Number(row.meta.purchaseCost ?? 0),
    usefulLifeMonths: Number(row.meta.usefulLifeMonths ?? 60),
    installedDate: String(row.meta.installedDate ?? new Date().toISOString()),
    lastMaintenanceDate: String(row.meta.lastMaintenanceDate ?? new Date().toISOString()),
    maintenanceIntervalMonths: Number(row.meta.maintenanceIntervalMonths ?? 6),
    cumulativeRepairCost: Number(row.meta.cumulativeRepairCost ?? 0),
    status: (row.status as EquipmentAsset['status']) || 'good',
    breakdownNotes: row.meta.breakdownNotes as string | undefined,
  };
}

export function EquipmentLifecycleManagementView() {
  const { rows, update } = useOpsTable<LifecycleRow>('equipment_lifecycle');
  const assets = useMemo(() => rows.map(toAsset), [rows]);
  const setAssets = (updater: EquipmentAsset[] | ((prev: EquipmentAsset[]) => EquipmentAsset[])) => {
    const next = typeof updater === 'function' ? updater(assets) : updater;
    void Promise.all(
      next.map((asset) =>
        update(asset.id, {
          name: asset.name,
          status: asset.status,
          meta: asset as unknown as Record<string, unknown>,
        }),
      ),
    );
  };

  // 고장 핫라인 신고 모달
  const [reportingAsset, setReportingAsset] = useState<EquipmentAsset | null>(null);
  const [breakdownNotes, setBreakdownNotes] = useState('');

  const handleOpenReport = (asset: EquipmentAsset) => {
    setReportingAsset(asset);
    setBreakdownNotes('');
  };

  const handleConfirmReport = () => {
    if (!reportingAsset) return;
    setAssets((prev) =>
      prev.map((a) =>
        a.id === reportingAsset.id ? reportEquipmentBreakdown(a, breakdownNotes) : a
      )
    );
    setReportingAsset(null);
  };

  const handleCompleteMaintenance = (id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'good',
              lastMaintenanceDate: new Date().toISOString(),
              breakdownNotes: undefined,
            }
          : a
      )
    );
  };

  const totalCost = assets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalRepairs = assets.reduce((sum, a) => sum + a.cumulativeRepairCost, 0);
  const overdueCount = assets.filter((a) => a.status === 'overdue' || a.status === 'due_soon').length;
  const breakdownCount = assets.filter((a) => a.status === 'breakdown').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 헤더 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-800" />
            고가 기구 점검 주기 & 소모품 감가상각 관리
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            장비별 감가상각 잔존가액을 산출하고, 누적 수리비 대비 신규 교체 vs 수리 의사결정 지표를 제공합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-800" />
          안전사고 0건 예방 모니터링
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">기구 총 취득 원가</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            ₩{(totalCost / 10000).toLocaleString()}<span className="text-xs font-semibold text-slate-400">만 원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">총 {assets.length}대 기구 자산</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">누적 수리/유지보수비</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ₩{(totalRepairs / 10000).toLocaleString()}<span className="text-xs font-semibold text-slate-400">만 원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">원가 대비 {Math.round((totalRepairs / totalCost) * 100)}% 소모</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">점검 지연/임박 기구</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {overdueCount} <span className="text-xs font-semibold text-slate-400">대</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">안전 점검 필요</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">고장 접수 대기</div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {breakdownCount} <span className="text-xs font-semibold text-slate-400">대</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">즉시 수리 요망</div>
        </div>
      </div>

      {/* 장비 자산 목록 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">보유 기구 자산 및 수명 주기 관리</h2>
          <span className="text-xs text-slate-400">총 {assets.length}개 자산</span>
        </div>

        <div className="divide-y divide-slate-100">
          {assets.map((asset) => {
            const decision = evaluateRepairVsReplaceDecision(asset);
            const urgency = evaluateEquipmentUrgency(asset);

            return (
              <div key={asset.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        asset.status === 'breakdown'
                          ? 'bg-rose-100 text-rose-600'
                          : urgency === 'overdue'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-50 text-slate-800'
                      }`}
                    >
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-800 text-sm">{asset.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            asset.status === 'breakdown'
                              ? 'bg-rose-100 text-rose-700 animate-pulse'
                              : urgency === 'overdue'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {asset.status === 'breakdown'
                            ? '고장 발생 (사용중지)'
                            : urgency === 'overdue'
                            ? '정기 점검 기한 초과'
                            : '정상 작동'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        도입일: {asset.installedDate.slice(0, 10)} · 점검 주기: {asset.maintenanceIntervalMonths}개월마다
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {asset.status === 'breakdown' || urgency === 'overdue' ? (
                      <button
                        type="button"
                        onClick={() => handleCompleteMaintenance(asset.id)}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> 점검/수리 완료
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReport(asset)}
                        className="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> 고장 즉각 신고
                      </button>
                    )}
                  </div>
                </div>

                {/* 고장 접수 메모가 있는 경우 */}
                {asset.breakdownNotes && (
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>현장 고장 신고 접수:</strong> {asset.breakdownNotes}</span>
                  </div>
                )}

                {/* 감가상각 가액 및 교체 vs 수리 권장 진단 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-2xl text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-400">취득원가 / 잔존장부가</span>
                    <div className="font-extrabold text-slate-700 mt-0.5">
                      ₩{asset.purchaseCost.toLocaleString()} <span className="text-slate-400">/</span>{' '}
                      <span className="text-slate-800">₩{decision.currentBookValue.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">누적 수리비용 (소모율)</span>
                    <div className="font-extrabold text-slate-700 mt-0.5">
                      ₩{asset.cumulativeRepairCost.toLocaleString()}{' '}
                      <span className={`text-[11px] font-bold ${decision.repairCostRatioPercent >= 50 ? 'text-rose-600' : 'text-slate-500'}`}>
                        ({decision.repairCostRatioPercent}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">의사결정 권고</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                          decision.recommendation === 'recommend_replacement'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {decision.recommendation === 'recommend_replacement' ? '신규 교체 권장' : '추가 수리 유지 권장'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 고장 신고 모달 */}
      {reportingAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                기구 파손 및 고장 핫라인 신고
              </h3>
              <button
                type="button"
                onClick={() => setReportingAsset(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              신고 대상 기구: <strong className="text-slate-800">{reportingAsset.name}</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">고장 증상 및 파손 부위 설명</label>
              <textarea
                rows={3}
                required
                placeholder="예: 와이어 케이블 유격, 스프링 파손, 누수 증상 등"
                value={breakdownNotes}
                onChange={(e) => setBreakdownNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportingAsset(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReport}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md"
              >
                고장 등록 (사용 중지)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
