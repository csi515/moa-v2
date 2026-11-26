import React, { useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Boxes,
} from 'lucide-react';
import {
  HAZARD_CLASS_LABELS,
  checkStorageCompatibility,
  calculateReagentStockStatus,
  validateCasNumber,
  type ChemicalReagent,
  type HazardClass,
} from '../domain/hazardousSubstanceEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

const INITIAL_REAGENTS: ChemicalReagent[] = [
  {
    id: 'chem-1',
    name: '황산 (Sulfuric Acid 98%)',
    formula: 'H2SO4',
    casNumber: '7664-93-9',
    hazardClasses: ['acid'],
    ghsPictograms: ['GHS05_CORROSION', 'GHS06_SKULL'],
    storageCabinetId: 'cab-acid',
    storageCabinetName: '내화 산성 시약장 A-01',
    currentStock: 2500,
    minSafeStock: 1000,
    unit: 'mL',
    msdsPdfUrl: 'https://example.com/msds/sulfuric-acid.pdf',
    isRegulatedPrecursor: true,
  },
  {
    id: 'chem-2',
    name: '수산화나트륨 (Sodium Hydroxide)',
    formula: 'NaOH',
    casNumber: '1310-73-2',
    hazardClasses: ['base'],
    ghsPictograms: ['GHS05_CORROSION'],
    storageCabinetId: 'cab-base',
    storageCabinetName: '염기성 전용 시약장 B-01',
    currentStock: 300,
    minSafeStock: 500,
    unit: 'g',
    msdsPdfUrl: 'https://example.com/msds/naoh.pdf',
    isRegulatedPrecursor: false,
  },
  {
    id: 'chem-3',
    name: '아세톤 (Acetone)',
    formula: 'CH3COCH3',
    casNumber: '67-64-1',
    hazardClasses: ['flammable', 'organic_solvent'],
    ghsPictograms: ['GHS02_FLAME', 'GHS07_EXCLAMATION'],
    storageCabinetId: 'cab-flam',
    storageCabinetName: '방폭 인화성 캐비닛 F-01',
    currentStock: 18000,
    minSafeStock: 4000,
    unit: 'mL',
    msdsPdfUrl: 'https://example.com/msds/acetone.pdf',
    isRegulatedPrecursor: true,
  },
];

export const HazardousSubstanceManagementView: React.FC = () => {
  const [reagents, setReagents] = useState<ChemicalReagent[]>(INITIAL_REAGENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReagent, setSelectedReagent] = useState<ChemicalReagent | null>(INITIAL_REAGENTS[0]);

  // 호환성 검사기 모달
  const [checkOpen, setCheckOpen] = useState(false);
  const [compAId, setCompAId] = useState(INITIAL_REAGENTS[0].id);
  const [compBId, setCompBId] = useState(INITIAL_REAGENTS[1].id);

  // 신규 시약 등록 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCas, setNewCas] = useState('');
  const [newCabinet, setNewCabinet] = useState('');
  const [newStock, setNewStock] = useState(1000);
  const [newUnit, setNewUnit] = useState('mL');
  const [newHazard, setNewHazard] = useState<HazardClass>('acid');

  const filteredReagents = reagents.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.casNumber.includes(searchTerm) ||
      r.storageCabinetName.includes(searchTerm)
  );

  const handleCreateReagent = () => {
    if (!newName.trim()) {
      showToast('시약명을 입력해주세요.', 'warning');
      return;
    }
    const casVal = validateCasNumber(newCas);
    if (!casVal.isValid) {
      showToast(casVal.error || 'CAS 등록번호를 확인해주세요.', 'error');
      return;
    }

    const created: ChemicalReagent = {
      id: `chem-${Date.now()}`,
      name: newName,
      casNumber: newCas,
      hazardClasses: [newHazard],
      ghsPictograms: newHazard === 'acid' || newHazard === 'base' ? ['GHS05_CORROSION'] : ['GHS02_FLAME'],
      storageCabinetId: `cab-${Date.now()}`,
      storageCabinetName: newCabinet || '기본 시약장',
      currentStock: Number(newStock) || 0,
      minSafeStock: Math.floor((Number(newStock) || 0) * 0.3),
      unit: newUnit,
    };

    setReagents([created, ...reagents]);
    setSelectedReagent(created);
    setCreateOpen(false);
    setNewName('');
    setNewCas('');
    setNewCabinet('');
    showToast('새 화학 시약이 등록되었습니다.', 'success');
  };

  const reagentA = reagents.find((r) => r.id === compAId) ?? reagents[0];
  const reagentB = reagents.find((r) => r.id === compBId) ?? reagents[1];
  const compResult = reagentA && reagentB ? checkStorageCompatibility(reagentA, reagentB) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-amber-600" />
            <h1 className="text-xl font-bold text-slate-900">유해화학물질 및 시약 MSDS 대장</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            화학물질 성상별 격리 보관, CAS 등록번호 검증, GHS 경고표지 및 위험물 안전재고 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCheckOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <ShieldAlert className="h-4 w-4 text-rose-500" /> 혼합보관 호환성 검사
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> 시약 등록
          </button>
        </div>
      </div>

      {/* 검색 & 목록 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 시약 목록 */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="시약명, CAS 번호, 보관장소 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredReagents.map((r) => {
              const stockStatus = calculateReagentStockStatus(r.currentStock, r.minSafeStock);
              const isSelected = selectedReagent?.id === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReagent(r)}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">CAS: {r.casNumber}</div>
                    </div>
                    {stockStatus === 'critical' && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        재고 소진
                      </span>
                    )}
                    {stockStatus === 'warning' && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        재고 부족
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate max-w-[150px]">{r.storageCabinetName}</span>
                    <span className="font-semibold text-slate-800">
                      {r.currentStock.toLocaleString()} {r.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측: 시약 상세 및 MSDS 안전 카드 */}
        <div className="lg:col-span-2">
          {selectedReagent ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedReagent.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>CAS 번호: <strong className="font-mono text-slate-700">{selectedReagent.casNumber}</strong></span>
                    {selectedReagent.formula && (
                      <span>화학식: <strong className="font-mono text-slate-700">{selectedReagent.formula}</strong></span>
                    )}
                    {selectedReagent.isRegulatedPrecursor && (
                      <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        ⚠️ 규제 원료물질 (전구체)
                      </span>
                    )}
                  </div>
                </div>
                {selectedReagent.msdsPdfUrl && (
                  <a
                    href={selectedReagent.msdsPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-800" /> MSDS 열람
                  </a>
                )}
              </div>

              {/* 보관 및 위험성 분류 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-slate-500" /> 보관 장소 및 캐비닛
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {selectedReagent.storageCabinetName}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> 위험물 성상 분류
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedReagent.hazardClasses.map((h) => (
                      <span
                        key={h}
                        className="rounded bg-amber-100/70 text-amber-900 px-2 py-0.5 text-xs font-medium"
                      >
                        {HAZARD_CLASS_LABELS[h] || h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 재고 현황 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>현재 재고 수준</span>
                  <span>
                    안전 기준: {selectedReagent.minSafeStock.toLocaleString()} {selectedReagent.unit}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {selectedReagent.currentStock.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">{selectedReagent.unit}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              시약을 선택해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 혼합보관 호환성 검사기 모달 */}
      {checkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              혼합보관 호환성 매트릭스 검사기
            </div>
            <p className="text-xs text-slate-500">
              두 시약을 동일 캐비닛에 보관할 수 있는지 화학적 반응성(산·염기, 산화제·가연물)을 판정합니다.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">시약 1</label>
                <select
                  value={compAId}
                  onChange={(e) => setCompAId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  {reagents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">시약 2</label>
                <select
                  value={compBId}
                  onChange={(e) => setCompBId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  {reagents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compResult && (
              <div
                className={`rounded-xl p-4 border text-xs leading-relaxed ${
                  compResult.isCompatible
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  {compResult.isCompatible ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 혼합 보관 가능
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-600" /> 혼합 보관 금지
                    </>
                  )}
                </div>
                {compResult.hazardReason || '상호 반응 위험이 없어 동일 시약장 보관이 허용됩니다.'}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCheckOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 시약 등록 모달 */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-slate-900">신규 화학 시약 등록</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="시약 명칭 (예: 질산 68%, 에탄올)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <input
                type="text"
                placeholder="CAS 등록번호 (예: 67-64-1)"
                value={newCas}
                onChange={(e) => setNewCas(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <select
                value={newHazard}
                onChange={(e) => setNewHazard(e.target.value as HazardClass)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              >
                {Object.entries(HAZARD_CLASS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="보관 시약장 명칭 (예: 내화시약장 A-02)"
                value={newCabinet}
                onChange={(e) => setNewCabinet(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="초기 재고량"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 p-2 text-xs"
                />
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <option value="mL">mL</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateReagent}
                className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
