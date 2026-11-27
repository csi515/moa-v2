import React, { useEffect, useMemo, useState } from 'react';
import { useOpsTable } from '@/hooks/useOpsTable';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  WorkStandardSOP,
  HazardRiskItem,
  calculateRiskLevel,
  calculateSafetyAuditSummary,
} from '../domain/sopRiskAssessmentEngine';
import { SopRiskApprovalPanel } from './SopRiskApprovalPanel';

const INITIAL_SOPS: WorkStandardSOP[] = [
  {
    sopId: 'sop-1',
    processName: '차량 리프트 하부 정비 작업',
    department: '정비 공정팀',
    requiredPPE: ['안전모', '보안경', '절단방지 안전장갑', '절연 안전화'],
    standardSteps: [
      { stepNumber: 1, actionTitle: '차량 진입 및 리프트 암 체결', safetyControlPoint: '차량 중심점을 맞춰 4개 지지 포인트를 완벽히 고정', potentialHazard: '차량 편하중으로 인한 전복' },
      { stepNumber: 2, actionTitle: '1차 50cm 상승 후 흔들림 점검', safetyControlPoint: '손으로 차체를 흔들어 결착 상태 최종 확인', potentialHazard: '상승 중 이탈' },
      { stepNumber: 3, actionTitle: '목표 높이 상승 및 기계식 락 체결', safetyControlPoint: '유압 밸브 잠금 및 래칫 안전 걸쇠 걸림음 확인', potentialHazard: '유압 실린더 파손 시 급격한 낙하' },
      { stepNumber: 4, actionTitle: '하부 부품 탈거 및 정비 작업', safetyControlPoint: '반드시 보안경 착용 및 2인 1조 작업 수행', potentialHazard: '오일 비산 및 부품 낙하' },
    ],
    prohibitedActions: [
      '안전 걸쇠(락) 미체결 상태에서 차량 하부 진입 금지',
      '리프트 가동 중 타 작업자 출입 금지',
      '차량 정격 하중(3.5톤) 초과 차량 인양 금지',
    ],
    authorName: '김정비 책임안전관리자',
    revisedDate: '2026-03-01',
  },
  {
    sopId: 'sop-2',
    processName: '목공실 테이블쏘(원형톱) 부재 재단 작업',
    department: '목공/공방팀',
    requiredPPE: ['보안경', '방진마스크', '귀마개 (방음)'],
    standardSteps: [
      { stepNumber: 1, actionTitle: '작업 전 집진기 가동 및 날 점검', safetyControlPoint: '톱날 균열 여부 및 안전 덮개 정상 작동 확인', potentialHazard: '톱날 파손 파편 비산' },
      { stepNumber: 2, actionTitle: '조기대 간격 세팅 및 잠금', safetyControlPoint: '재단 치수 확인 후 레버 확실히 고정', potentialHazard: '조기대 밀림으로 인한 킥백' },
      { stepNumber: 3, actionTitle: '푸시 스틱(밀대)을 사용한 자재 밀기', safetyControlPoint: '톱날 10cm 이내에는 절대 손을 대지 않고 밀대 사용', potentialHazard: '원형톱날 손가락 접촉 절단' },
    ],
    prohibitedActions: [
      '장갑(목장갑, 면장갑) 착용 절대 금지 (말림 위험)',
      '안전 덮개 탈거 상태에서 작업 금지',
    ],
    authorName: '이공방 목공마스터',
    revisedDate: '2026-03-10',
  },
];

const INITIAL_HAZARDS: HazardRiskItem[] = [
  {
    hazardId: 'h-1',
    sopId: 'sop-1',
    processName: '차량 리프트 하부 정비 작업',
    hazardCategory: 'mechanical',
    hazardDescription: '리프트 유압 호스 노후화 파손으로 인한 급격한 차량 낙하',
    currentFrequency: 4,
    currentSeverity: 5,
    currentRiskScore: 20,
    currentRiskLevel: 'critical',
    controlMeasure: '기계식 이중 안전 멈춤 쇄 시공 및 일일 유압 밸브 점검표 작성',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 4,
    residualRiskScore: 4,
    residualRiskLevel: 'low',
    isImplemented: true,
    actionDeadline: '2026-10-31',
    inspectorName: '김정비 안전관리자',
  },
  {
    hazardId: 'h-2',
    sopId: 'sop-2',
    processName: '목공실 테이블쏘 부재 재단 작업',
    hazardCategory: 'mechanical',
    hazardDescription: '원형톱 고속 회전 중 킥백(자재 튕김)으로 인한 작업자 흉부 충격',
    currentFrequency: 3,
    currentSeverity: 4,
    currentRiskScore: 12,
    currentRiskLevel: 'high',
    controlMeasure: '분할날(Riving Knife) 설치 및 푸시 스틱 100% 사용 의무화',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 3,
    residualRiskScore: 3,
    residualRiskLevel: 'low',
    isImplemented: true,
    actionDeadline: '2026-10-25',
    inspectorName: '이공방 안전담당',
  },
  {
    hazardId: 'h-3',
    processName: '수영장 기계실 약품 배합',
    hazardCategory: 'chemical',
    hazardDescription: '차아염소산나트륨 용액 배합 중 원액 피부 접촉 및 가스 흡입',
    currentFrequency: 3,
    currentSeverity: 4,
    currentRiskScore: 12,
    currentRiskLevel: 'high',
    controlMeasure: '송기 마스크 및 내화학성 앞치마/고글 착용, 강제 배기 설비 가동',
    controlType: 'ppe',
    residualFrequency: 1,
    residualSeverity: 2,
    residualRiskScore: 2,
    residualRiskLevel: 'low',
    isImplemented: false,
    actionDeadline: '2026-10-30',
    inspectorName: '박수영 시설과장',
  },
];

type SopRow = {
  id: string;
  title: string;
  hazard_level: string;
  controls: HazardRiskItem[];
  status: string;
  department_id?: string | null;
};

export const SopRiskAssessmentView: React.FC = () => {
  const [sops] = useState<WorkStandardSOP[]>(INITIAL_SOPS);
  const [selectedSop, setSelectedSop] = useState<WorkStandardSOP>(INITIAL_SOPS[0]);
  const { rows, create, update, reload } = useOpsTable<SopRow>('sop_risk_assessment');

  const hazards = useMemo(
    () => rows.flatMap((row) => (Array.isArray(row.controls) ? row.controls : [])),
    [rows],
  );

  const setHazards = (next: HazardRiskItem[] | ((prev: HazardRiskItem[]) => HazardRiskItem[])) => {
    const resolved = typeof next === 'function' ? next(hazards) : next;
    const primary = rows[0];
    if (primary) {
      void update(primary.id, { controls: resolved, title: primary.title || '위험성평가' });
    } else {
      void create({
        title: '위험성평가',
        hazard_level: 'medium',
        controls: resolved,
        status: 'open',
        department_id: null,
      }).then(() => reload());
    }
  };

  useEffect(() => {
    if (rows.length === 0 && INITIAL_HAZARDS.length > 0) {
      /* DB가 비어 있으면 엔진 시드를 자동 적재하지 않고 빈 목록으로 시작 */
    }
  }, [rows.length]);

  const [activeTab, setActiveTab] = useState<'sop' | 'matrix' | 'controls' | 'approval'>('sop');

  // 신규 위험요인 입력 폼 상태
  const [newProcess, setNewProcess] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFreq, setNewFreq] = useState<number>(3);
  const [newSev, setNewSev] = useState<number>(3);
  const [newControl, setNewControl] = useState('');

  const handleAddHazard = () => {
    if (!newProcess.trim() || !newDesc.trim()) return;

    const calc = calculateRiskLevel(newFreq, newSev);
    const residualFreq = 1;
    const residualSev = Math.max(1, newSev - 1);
    const residualCalc = calculateRiskLevel(residualFreq, residualSev);

    const newItem: HazardRiskItem = {
      hazardId: `h-${Date.now()}`,
      processName: newProcess.trim(),
      hazardCategory: 'mechanical',
      hazardDescription: newDesc.trim(),
      currentFrequency: newFreq,
      currentSeverity: newSev,
      currentRiskScore: calc.score,
      currentRiskLevel: calc.level,
      controlMeasure: newControl.trim() || '안전 작업 지침 수립 및 보호구 착용',
      controlType: 'administrative',
      residualFrequency: residualFreq,
      residualSeverity: residualSev,
      residualRiskScore: residualCalc.score,
      residualRiskLevel: residualCalc.level,
      isImplemented: false,
      actionDeadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      inspectorName: '현장 관리자',
    };

    setHazards([newItem, ...hazards]);
    setNewProcess('');
    setNewDesc('');
    setNewControl('');
  };

  const handleToggleImplement = (id: string) => {
    setHazards(prev =>
      prev.map(h =>
        h.hazardId === id ? { ...h, isImplemented: !h.isImplemented } : h
      )
    );
  };

  const auditSummary = calculateSafetyAuditSummary(hazards);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            🛡️ 작업표준(SOP) 및 위험성평가 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            산업안전보건법 제36조 기준 공정별 안전작업표준, 5×5 빈도·강도 위험성평가 및 개선대책 이행을 통합 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'sop' ? 'danger' : 'outline'}
            size="md"
            onClick={() => setActiveTab('sop')}
          >
            안전작업표준 (SOP) ({sops.length})
          </Button>
          <Button
            variant={activeTab === 'matrix' ? 'danger' : 'outline'}
            size="md"
            onClick={() => setActiveTab('matrix')}
          >
            5×5 위험성평가표 ({hazards.length})
          </Button>
          <Button
            variant={activeTab === 'controls' ? 'danger' : 'outline'}
            size="md"
            onClick={() => setActiveTab('controls')}
          >
            개선대책 이행률 ({auditSummary.complianceRatePercent}%)
          </Button>
          <Button
            variant={activeTab === 'approval' ? 'danger' : 'outline'}
            size="md"
            onClick={() => setActiveTab('approval')}
          >
            결재선·개정
          </Button>
        </div>
      </div>

      {/* 종합 안전 감사 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">법정 점검 적합성</div>
          <div className={`text-2xl font-bold tabular-nums font-mono ${auditSummary.isLegalAuditReady ? 'text-emerald-600' : 'text-red-600'}`}>
            {auditSummary.isLegalAuditReady ? '✅ 적합 (Audit Ready)' : '⚠️ 개선 미완료'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            중대위험 100% 해소 & 이행률 80% 이상
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">중대·고위험 요인</div>
          <div className={`text-2xl font-bold tabular-nums font-mono ${auditSummary.criticalHazards > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {auditSummary.criticalHazards} 건 (중대) / {auditSummary.highHazards} 건 (높음)
          </div>
          <div className="text-xs text-slate-400 mt-1">
            위험 점수 15점 이상 즉시 작업 중지
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">개선대책 조치 완료</div>
          <div className="text-2xl font-bold text-blue-600 tabular-nums font-mono">
            {auditSummary.implementedCount} / {auditSummary.totalHazards} 건
          </div>
          <div className="text-xs text-slate-400 mt-1">
            미이행 {auditSummary.pendingCount}건 진행 중
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 mb-1">공정 안전 표준 (SOP)</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {sops.length} 개 공정
          </div>
          <div className="text-xs text-slate-400 mt-1">
            전 작업자 안전수칙 숙지 및 서명 관리
          </div>
        </div>
      </div>

      {activeTab === 'approval' ? (
        <SopRiskApprovalPanel />
      ) : activeTab === 'sop' ? (
        /* 탭 1: 안전작업표준 (SOP) 상세 */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 공정 선택 목록 */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              📋 표준 공정 매뉴얼 목록
            </h3>
            <div className="flex flex-col gap-2.5">
              {sops.map(s => (
                <div
                  key={s.sopId}
                  onClick={() => setSelectedSop(s)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedSop.sopId === s.sopId
                      ? 'border-red-600 bg-red-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 mb-1">
                    {s.processName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {s.department} • 개정일: {s.revisedDate}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 선택된 SOP 상세 정보 */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="border-b border-slate-200 pb-4 mb-4">
              <span className="text-xs font-bold text-rose-600 tracking-wider uppercase">STANDARD OPERATING PROCEDURE</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                {selectedSop.processName}
              </h3>
              <div className="text-xs text-slate-600">
                작성/검토자: <strong>{selectedSop.authorName}</strong> | 부서: {selectedSop.department}
              </div>
            </div>

            {/* 필수 보호구 (PPE) */}
            <div className="mb-5">
              <div className="text-sm font-semibold text-slate-700 mb-2">
                🦺 필수 착용 개인보호구 (PPE)
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedSop.requiredPPE.map((ppe, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold"
                  >
                    ✓ {ppe}
                  </span>
                ))}
              </div>
            </div>

            {/* 단계별 표준 절차 */}
            <div className="mb-5">
              <div className="text-sm font-semibold text-slate-700 mb-2.5">
                ⚙️ 표준 작업 순서 및 안전 통제점
              </div>
              <div className="flex flex-col gap-2.5">
                {selectedSop.standardSteps.map(step => (
                  <div
                    key={step.stepNumber}
                    className="p-3 bg-slate-50 rounded-lg border-l-4 border-l-red-600"
                  >
                    <div className="font-bold text-xs sm:text-sm text-slate-900 mb-1">
                      STEP {step.stepNumber}. {step.actionTitle}
                    </div>
                    <div className="text-xs text-emerald-800 mb-0.5">
                      <strong>안전 핵심:</strong> {step.safetyControlPoint}
                    </div>
                    {step.potentialHazard && (
                      <div className="text-[11px] text-red-700">
                        ⚠️ 잠재 위험: {step.potentialHazard}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 절대 금지 사항 */}
            <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-xl space-y-2">
              <div className="text-xs sm:text-sm font-bold text-rose-700 mb-1.5">
                🚫 절대 금지 행위 (위반 시 작업 퇴장)
              </div>
              <ul className="list-disc pl-5 text-xs text-rose-800 space-y-0.5">
                {selectedSop.prohibitedActions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === 'matrix' ? (
        /* 탭 2: 5x5 위험성평가 매트릭스 등록 */
        <div>
          {/* 신규 위험요인 등록 박스 */}
          <div className="bg-rose-50/40 border border-rose-200 p-5 rounded-2xl mb-6 space-y-4">
            <h4 className="text-sm sm:text-base font-bold text-rose-900 mb-3">
              ➕ 유해·위험요인 발굴 및 5×5 평가 등록
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-2.5">
              <input
                type="text"
                placeholder="대상 공정/작업명"
                value={newProcess}
                onChange={e => setNewProcess(e.target.value)}
                className="col-span-1 md:col-span-4 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
              <input
                type="text"
                placeholder="유해·위험요인 (상황 및 재해 유형)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="col-span-1 md:col-span-4 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
              <div className="col-span-1 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-500 block mb-0.5">빈도 (1~5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newFreq}
                  onChange={e => setNewFreq(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-center font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-500 block mb-0.5">강도 (1~5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newSev}
                  onChange={e => setNewSev(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-center font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                placeholder="위험 감소 대책 (공학적 방호장치 / 작업절차 개선 / 보호구)"
                value={newControl}
                onChange={e => setNewControl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
              <Button
                variant="destructive"
                size="md"
                onClick={handleAddHazard}
                className="shrink-0"
              >
                + 위험요인 평가 등록
              </Button>
            </div>
          </div>

          {/* 등록된 위험요인 5x5 평가표 */}
          {hazards.length === 0 ? (
            <EmptyState
              title="등록된 유해·위험요인이 없습니다."
              description="상단의 발굴 폼을 통해 공정별 유해·위험요인을 등록하고 위험도를 평가하세요."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs sm:text-sm bg-white">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold select-none">
                    <th className="px-3 py-2.5">공정명</th>
                    <th className="px-3 py-2.5">유해·위험요인</th>
                    <th className="px-3 py-2.5">빈도×강도</th>
                    <th className="px-3 py-2.5">위험 점수</th>
                    <th className="px-3 py-2.5">위험 등급</th>
                    <th className="px-3 py-2.5">개선 대책</th>
                    <th className="px-3 py-2.5">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hazards.map(h => (
                    <tr key={h.hazardId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-slate-900">{h.processName}</td>
                      <td className="px-3 py-3 text-slate-700">{h.hazardDescription}</td>
                      <td className="px-3 py-3 text-slate-500 tabular-nums font-mono">{h.currentFrequency} × {h.currentSeverity}</td>
                      <td className={`px-3 py-3 font-bold tabular-nums font-mono ${h.currentRiskScore >= 15 ? 'text-red-600' : 'text-slate-900'}`}>
                        {h.currentRiskScore} 점
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                            h.currentRiskLevel === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : h.currentRiskLevel === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {h.currentRiskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{h.controlMeasure}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            h.isImplemented ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {h.isImplemented ? '조치 완료' : '미조치 (진행중)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* 탭 3: 개선대책 이행 점검 및 잔여 위험도 재평가 */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            🛠️ 위험 감소 개선대책 이행 및 잔여위험도 재평가
          </h3>

          {hazards.length === 0 ? (
            <EmptyState
              title="진행 중인 위험 감소 개선대책이 없습니다."
              description="5×5 위험성평가표 탭에서 고위험 요인을 발굴하고 개선대책을 수립하세요."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {hazards.map(h => (
                <div
                  key={h.hazardId}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
                    h.isImplemented ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {h.processName}
                      </span>
                      <span className="text-xs text-red-600 font-semibold tabular-nums font-mono">
                        [개선전: {h.currentRiskScore}점({h.currentRiskLevel})]
                      </span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-xs text-emerald-600 font-semibold tabular-nums font-mono">
                        [개선후: {h.residualRiskScore}점({h.residualRiskLevel})]
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 mb-1">
                      <strong className="font-semibold text-slate-900">수립 대책:</strong> {h.controlMeasure}
                    </div>

                    <div className="text-xs text-slate-500 tabular-nums">
                      이행 기한: {h.actionDeadline} | 담당 점검자: {h.inspectorName}
                    </div>
                  </div>

                  <div>
                    <Button
                      variant={h.isImplemented ? 'success' : 'destructive'}
                      size="sm"
                      onClick={() => handleToggleImplement(h.hazardId)}
                      className="shrink-0"
                    >
                      {h.isImplemented ? '✓ 조치 완료됨' : '조치 완료 처리'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
