import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  BarChart2,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  evaluateInspectionSamples,
  type InspectionStandard,
  type QualityJudgment,
  type InspectionProcessStage,
} from '../domain/qualityInspectionEngine';

export const QualityInspectionManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'records' | 'standards'>('records');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. 검사 규격 쿼리
  const { query: stdQuery } = useList<any>({
    resource: 'quality_inspection_standards',
    sorters: [{ field: 'created_at', order: 'desc' }],
  });
  const standards = stdQuery?.data?.data ?? [];

  // 2. 검사 기록 쿼리
  const { query: recQuery } = useList<any>({
    resource: 'quality_inspection_records',
    sorters: [{ field: 'inspected_at', order: 'desc' }],
  });
  const records = recQuery?.data?.data ?? [];

  const { mutate: createRecord } = useCreate();
  const { mutate: createStandard } = useCreate();

  // 모달 제어 상태
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isStdModalOpen, setIsStdModalOpen] = useState(false);

  // 신규 측정 기록 폼 상태
  const [selectedStdId, setSelectedStdId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [sampleValuesStr, setSampleValuesStr] = useState('8.01, 7.99, 8.02, 8.00, 7.98');
  const [inspectorName, setInspectorName] = useState('품질 검사원');
  const [recordNotes, setRecordNotes] = useState('');

  // 신규 규격 폼 상태
  const [itemName, setItemName] = useState('');
  const [inspectionItem, setInspectionItem] = useState('');
  const [processStage, setProcessStage] = useState<InspectionProcessStage>('final');
  const [unit, setUnit] = useState('mm');
  const [targetValue, setTargetValue] = useState('8.0');
  const [minThreshold, setMinThreshold] = useState('7.9');
  const [maxThreshold, setMaxThreshold] = useState('8.1');
  const [sampleSize, setSampleSize] = useState(5);

  // 실시간 샘플 판정 프리뷰
  const currentStd = standards.find((s: any) => s.id === selectedStdId);
  const parsedSamples = useMemo(() => {
    return sampleValuesStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));
  }, [sampleValuesStr]);

  const previewEval = useMemo(() => {
    if (!currentStd) return null;
    return evaluateInspectionSamples(parsedSamples, {
      minThreshold: currentStd.min_threshold !== null ? Number(currentStd.min_threshold) : undefined,
      maxThreshold: currentStd.max_threshold !== null ? Number(currentStd.max_threshold) : undefined,
      targetValue: currentStd.target_value !== null ? Number(currentStd.target_value) : undefined,
    });
  }, [parsedSamples, currentStd]);

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStdId || !lotNumber.trim() || parsedSamples.length === 0 || !previewEval) {
      showToast('검사 규격을 선택하고 샘플 측정치를 입력해주세요.', 'warning');
      return;
    }

    createRecord(
      {
        resource: 'quality_inspection_records',
        values: {
          standard_id: selectedStdId,
          lot_number: lotNumber.trim(),
          sample_values: parsedSamples,
          mean_value: previewEval.mean,
          judgment: previewEval.judgment,
          defect_count: previewEval.defectCount,
          inspector_name: inspectorName.trim(),
          notes: recordNotes.trim(),
        },
      },
      {
        onSuccess: () => {
          setIsRecordModalOpen(false);
          setLotNumber('');
          setRecordNotes('');
          recQuery?.refetch();
          showToast(`로트 '${lotNumber}' 품질 검사 결과가 등록되었습니다.`, 'success');
        },
      }
    );
  };

  const handleStdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !inspectionItem.trim()) return;

    createStandard(
      {
        resource: 'quality_inspection_standards',
        values: {
          item_name: itemName.trim(),
          inspection_item: inspectionItem.trim(),
          process_stage: processStage,
          unit: unit.trim(),
          target_value: targetValue ? Number(targetValue) : null,
          min_threshold: minThreshold ? Number(minThreshold) : null,
          max_threshold: maxThreshold ? Number(maxThreshold) : null,
          sample_size: Number(sampleSize) || 5,
        },
      },
      {
        onSuccess: () => {
          setIsStdModalOpen(false);
          setItemName('');
          setInspectionItem('');
          stdQuery?.refetch();
          showToast('신규 품질 검사 규격이 등록되었습니다.', 'success');
        },
      }
    );
  };

  const getStageBadge = (stage: InspectionProcessStage) => {
    switch (stage) {
      case 'inbound':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">수입 검사</span>;
      case 'in_process':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">공정 검사</span>;
      case 'final':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">최종 검사</span>;
      case 'outgoing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">출하 검사</span>;
    }
  };

  const getJudgmentBadge = (judgment: QualityJudgment) => {
    switch (judgment) {
      case 'pass':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">합격 (Pass)</span>;
      case 'fail':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">불합격 (Fail)</span>;
      case 'conditional_pass':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">조건부 합격</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>품질보증 및 공차 판정 (QA/QC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">품질 검사 및 규격 판정 대장</h1>
          <p className="text-xs text-slate-500 mt-1">
            정밀 치수·강도·Brix 등 규격 공차(Tolerance) 실측 판정, 불량률 및 통계적 공정능력(Cpk) 추적
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'records'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              검사 실적 대장
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('standards')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'standards'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              검사 규격 기준표
            </button>
          </div>

          {activeTab === 'records' ? (
            <button
              type="button"
              onClick={() => {
                if (standards.length > 0 && !selectedStdId) {
                  setSelectedStdId(standards[0].id);
                }
                setIsRecordModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>검사 결과 등록</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsStdModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 규격 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* 탭 1: 품질 검사 실적 대장 */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800">로트별 품질 검사 이력 ({records.length}건)</h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">로트 번호</th>
                  <th className="p-3">검사 일시</th>
                  <th className="p-3">샘플 수</th>
                  <th className="p-3">평균 실측치</th>
                  <th className="p-3">불량 수</th>
                  <th className="p-3">검사원</th>
                  <th className="p-3 text-right">최종 판정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      등록된 품질 검사 결과가 없습니다. '검사 결과 등록'을 눌러 첫 측정을 기록하세요.
                    </td>
                  </tr>
                ) : (
                  records.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">{rec.lot_number}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {rec.inspected_at ? new Date(rec.inspected_at).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="p-3 text-slate-700">
                        {Array.isArray(rec.sample_values) ? rec.sample_values.length : 0}개
                      </td>
                      <td className="p-3 font-extrabold text-slate-900">{rec.mean_value}</td>
                      <td className="p-3">
                        {rec.defect_count > 0 ? (
                          <span className="font-bold text-rose-600">{rec.defect_count}건 불량</span>
                        ) : (
                          <span className="text-slate-400">0건</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{rec.inspector_name}</td>
                      <td className="p-3 text-right">{getJudgmentBadge(rec.judgment)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 2: 검사 규격 기준표 */}
      {activeTab === 'standards' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800">품목별 품질 검사 규격표 ({standards.length}개)</h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">대상 품목</th>
                  <th className="p-3">공정 단계</th>
                  <th className="p-3">검사 항목</th>
                  <th className="p-3">목표치 (Target)</th>
                  <th className="p-3">허용 공차 (Min ~ Max)</th>
                  <th className="p-3">샘플 크기</th>
                  <th className="p-3 text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      등록된 품질 검사 규격이 없습니다.
                    </td>
                  </tr>
                ) : (
                  standards.map((std: any) => (
                    <tr key={std.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{std.item_name}</td>
                      <td className="p-3">{getStageBadge(std.process_stage)}</td>
                      <td className="p-3 font-semibold text-slate-800">{std.inspection_item}</td>
                      <td className="p-3 text-slate-700">
                        {std.target_value !== null ? `${std.target_value} ${std.unit}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {std.min_threshold ?? '-'} ~ {std.max_threshold ?? '-'} {std.unit}
                      </td>
                      <td className="p-3 text-slate-500">{std.sample_size}개</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          운영 중
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 신규 검사 실적 등록 모달 */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">품질 검사 실측치 등록</h3>
            <form onSubmit={handleRecordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">검사 규격 선택 *</label>
                <select
                  value={selectedStdId}
                  onChange={(e) => setSelectedStdId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  required
                >
                  {standards.map((std: any) => (
                    <option key={std.id} value={std.id}>
                      [{std.item_name}] {std.inspection_item} (공차: {std.min_threshold} ~ {std.max_threshold} {std.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">검사 로트 번호 (Lot Number) *</label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="예: LOT-20261017-01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  샘플 측정값 (쉼표로 구분하여 입력) *
                </label>
                <input
                  type="text"
                  value={sampleValuesStr}
                  onChange={(e) => setSampleValuesStr(e.target.value)}
                  placeholder="예: 8.01, 7.99, 8.02, 8.00, 7.98"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              {/* 실시간 판정 결과 미리보기 */}
              {previewEval && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">실시간 판정 결과:</span>
                    {getJudgmentBadge(previewEval.judgment)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>평균: <span className="font-bold">{previewEval.mean}</span></div>
                    <div>불량수: <span className="font-bold text-rose-600">{previewEval.defectCount}건</span></div>
                    <div>Cpk: <span className="font-bold">{previewEval.cpk ?? '-'}</span></div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">검사원 성명</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  판정 및 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 신규 규격 등록 모달 */}
      {isStdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">신규 품질 검사 규격표 등록</h3>
            <form onSubmit={handleStdSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">품목명 *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 정밀 기어축 / 에스프레소 원두"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">검사 항목 *</label>
                <input
                  type="text"
                  value={inspectionItem}
                  onChange={(e) => setInspectionItem(e.target.value)}
                  placeholder="예: 외경 치수 / 수분율 / 산도"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">공정 단계</label>
                  <select
                    value={processStage}
                    onChange={(e) => setProcessStage(e.target.value as InspectionProcessStage)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="inbound">수입 검사</option>
                    <option value="in_process">공정 검사</option>
                    <option value="final">최종 검사</option>
                    <option value="outgoing">출하 검사</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">측정 단위</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="mm, %, g 등"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">목표치</label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">하한치 (Min)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">상한치 (Max)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxThreshold}
                    onChange={(e) => setMaxThreshold(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStdModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  규격 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
