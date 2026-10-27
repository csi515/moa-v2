import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Construction,
  Zap,
  Activity,
  Plus,
  Clock,
  Download,
  Printer,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { showToast } from '@/shared/feedback/uiFeedback';
import { generatePtwAuditCsv, downloadCsvFile } from '../domain/safetyWorkPermitExport';
import {
  assessGasSafety,
  canApprovePermit,
  validatePermitTimeWindow,
  type SafetyWorkPermit,
  type PermitWorkType,
  type PermitStatus,
  type GasTestRecord,
} from '../domain/safetyWorkPermitEngine';

const SAMPLE_PERMITS: SafetyWorkPermit[] = [
  {
    id: 'ptw-sample-1',
    permitNumber: 'PTW-2026-0038',
    workType: 'hot_work',
    workTitle: '제1원자로 냉각 배관 TIG 용접 및 밸브 교체',
    workLocation: '플랜트 A동 지하 1층 기계실',
    contractorName: '(주)한일플랜트기술',
    workerCount: 4,
    startTime: '2026-04-24T09:00',
    endTime: '2026-04-24T17:00',
    safetyMeasures: {
      fireExtinguisherChecked: true,
      ventilationChecked: true,
    },
    gasTest: {
      oxygenPercent: 20.9,
      combustibleGasPercent: 0,
      carbonMonoxidePpm: 2,
      hydrogenSulfidePpm: 0,
      testedAt: '2026-04-24T08:40',
      testerName: '박안전 대리',
    },
    status: 'approved',
    requesterId: 'u-kim',
    requesterName: '김설비 과장',
    safetyManagerId: 'u-safe',
    safetyManagerName: '이안전 팀장',
    createdAt: '2026-04-24T08:00:00Z',
  },
  {
    id: 'ptw-sample-2',
    permitNumber: 'PTW-2026-0039',
    workType: 'confined_space',
    workTitle: '폐수 혐기성 소화조 내부 슬러지 준설 및 점검',
    workLocation: '환경동 소화조 T-102 내부',
    contractorName: '대한환경이엔지',
    workerCount: 2,
    startTime: '2026-04-24T13:00',
    endTime: '2026-04-24T17:00',
    safetyMeasures: {
      ventilationChecked: true,
      harnessWorn: true,
    },
    gasTest: {
      oxygenPercent: 20.6,
      combustibleGasPercent: 2,
      carbonMonoxidePpm: 8,
      hydrogenSulfidePpm: 2,
      testedAt: '2026-04-24T12:45',
      testerName: '박안전 대리',
    },
    status: 'in_progress',
    requesterId: 'u-park',
    requesterName: '박수질 대리',
    safetyManagerId: 'u-safe',
    safetyManagerName: '이안전 팀장',
    createdAt: '2026-04-24T11:00:00Z',
  },
  {
    id: 'ptw-sample-3',
    permitNumber: 'PTW-2026-0040',
    workType: 'elevated',
    workTitle: '물류창고 캐노피 지붕 방수 코팅 및 우수관 정비',
    workLocation: '원자재 창고 B 외곽 지붕 (높이 12m)',
    workerCount: 3,
    startTime: '2026-04-25T08:30',
    endTime: '2026-04-25T16:30',
    safetyMeasures: {
      harnessWorn: true,
    },
    status: 'requested',
    requesterId: 'u-choi',
    requesterName: '최공무 주임',
    createdAt: '2026-04-24T15:30:00Z',
  },
];

const WORK_TYPE_INFO: Record<
  PermitWorkType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  hot_work: {
    label: '화기작업 (용접/절단)',
    icon: <Flame className="w-4 h-4 text-rose-500" />,
    color: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  confined_space: {
    label: '밀폐공간 (탱크/맨홀)',
    icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
    color: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  elevated: {
    label: '고소작업 (2m 이상)',
    icon: <Construction className="w-4 h-4 text-blue-500" />,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  electrical: {
    label: '정전/고압전기',
    icon: <Zap className="w-4 h-4 text-purple-500" />,
    color: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  excavation: {
    label: '굴착/토공사',
    icon: <Construction className="w-4 h-4 text-slate-500" />,
    color: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

export const SafetyWorkPermitManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const activeUser = useActiveUser();

  const [localPermits, setLocalPermits] = useState<SafetyWorkPermit[]>(SAMPLE_PERMITS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);

  // 신규 등록 폼
  const [workType, setWorkType] = useState<PermitWorkType>('hot_work');
  const [workTitle, setWorkTitle] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [workerCount, setWorkerCount] = useState<number>(2);
  const [startTime, setStartTime] = useState('2026-04-25T09:00');
  const [endTime, setEndTime] = useState('2026-04-25T17:00');
  const [fireExtinguisher, setFireExtinguisher] = useState(true);
  const [ventilation, setVentilation] = useState(false);
  const [harness, setHarness] = useState(false);
  const [lockOutTagOut, setLockOutTagOut] = useState(false);

  // Refine 연동
  const { query: permitsQuery } = useList<any>({
    resource: 'safety_work_permits',
    meta: { schema: 'core' },
    sorters: [{ field: 'created_at', order: 'desc' }],
    queryOptions: { enabled: Boolean(orgId) },
  });
  const { mutate: createPermitMutation } = useCreate();
  const { mutate: updatePermitMutation } = useUpdate();

  const permits: SafetyWorkPermit[] = useMemo(() => {
    const raw = permitsQuery?.data?.data;
    if (raw && raw.length > 0) {
      return raw.map((r: any) => ({
        id: r.id,
        permitNumber: r.permit_number || 'PTW-2026',
        workType: (r.work_type || 'hot_work') as PermitWorkType,
        workTitle: r.work_title || '',
        workLocation: r.work_location || '',
        contractorName: r.contractor_name,
        workerCount: Number(r.worker_count || 1),
        startTime: r.start_time,
        endTime: r.end_time,
        safetyMeasures: r.safety_measures || {},
        gasTest: r.gas_test,
        status: (r.status || 'requested') as PermitStatus,
        requesterId: r.requester_id || '',
        requesterName: r.requester_name || '신청자',
        safetyManagerId: r.safety_manager_id,
        safetyManagerName: r.safety_manager_name,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at || new Date().toISOString(),
      }));
    }
    return localPermits;
  }, [permitsQuery?.data?.data, localPermits]);

  // 활성/승인 대기 건수
  const activeCount = useMemo(() => permits.filter((p) => p.status === 'in_progress').length, [permits]);
  const requestedCount = useMemo(() => permits.filter((p) => p.status === 'requested').length, [permits]);

  const handleApprove = (permit: SafetyWorkPermit) => {
    const check = canApprovePermit(permit);
    if (!check.allowed) {
      showToast(check.reason || '승인 요건이 충족되지 않았습니다.', 'error');
      return;
    }

    if (orgId) {
      updatePermitMutation({
        resource: 'safety_work_permits',
        id: permit.id,
        values: {
          status: 'approved',
          safety_manager_id: activeUser?.id,
          safety_manager_name: activeUser?.name,
        },
      });
    }

    setLocalPermits((prev) =>
      prev.map((p) =>
        p.id === permit.id
          ? {
              ...p,
              status: 'approved',
              safetyManagerName: activeUser?.name || '안전관리자',
            }
          : p
      )
    );
    showToast(`작업허가서 [${permit.permitNumber}]가 승인되었습니다.`, 'success');
  };

  const handleClosePermit = (permit: SafetyWorkPermit) => {
    if (orgId) {
      updatePermitMutation({
        resource: 'safety_work_permits',
        id: permit.id,
        values: { status: 'closed' },
      });
    }

    setLocalPermits((prev) =>
      prev.map((p) => (p.id === permit.id ? { ...p, status: 'closed' } : p))
    );
    showToast(`작업허가서 [${permit.permitNumber}]가 현장 정리 후 종료되었습니다.`, 'info');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeCheck = validatePermitTimeWindow(startTime, endTime, 8);
    if (!timeCheck.valid) {
      showToast(timeCheck.error || '작업 시간을 확인해주세요.', 'error');
      return;
    }

    const newPermit: SafetyWorkPermit = {
      id: `ptw-${Date.now()}`,
      permitNumber: `PTW-2026-00${permits.length + 41}`,
      workType,
      workTitle,
      workLocation,
      contractorName: contractorName || undefined,
      workerCount,
      startTime,
      endTime,
      safetyMeasures: {
        fireExtinguisherChecked: fireExtinguisher,
        ventilationChecked: ventilation,
        harnessWorn: harness,
        lockOutTagOut: lockOutTagOut,
      },
      status: 'requested',
      requesterId: activeUser?.id || 'me',
      requesterName: activeUser?.name || '신청자',
      createdAt: new Date().toISOString(),
    };

    if (orgId) {
      createPermitMutation({
        resource: 'safety_work_permits',
        values: {
          organization_id: orgId,
          permit_number: newPermit.permitNumber,
          work_type: workType,
          work_title: workTitle,
          work_location: workLocation,
          contractor_name: contractorName,
          worker_count: workerCount,
          start_time: startTime,
          end_time: endTime,
          safety_measures: newPermit.safetyMeasures,
          status: 'requested',
          requester_id: activeUser?.id,
          requester_name: activeUser?.name,
        },
      });
    }

    setLocalPermits((prev) => [newPermit, ...prev]);
    showToast('안전작업허가서가 신청되었습니다.', 'success');
    setShowCreateModal(false);
    setWorkTitle('');
    setWorkLocation('');
  };


  const handleExportPtwCsv = () => {
    const csv = generatePtwAuditCsv(permits, currentOrganization?.name || '사업장', new Date().getFullYear());
    downloadCsvFile(`안전작업허가서(PTW)감사대장_${currentOrganization?.name || '사업장'}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('산업안전보건법 3년 법적 보존용 감사 대장 CSV가 다운로드되었습니다.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 상단 브리핑 및 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
            <span>중대재해처벌법 및 산안법 위험작업 사전 인허가 체계</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            안전작업허가서 (PTW) 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            화기·밀폐·고소·정전 작업 시 착공 전 안전조치 확인 및 가스농도 측정, 안전관리자 승인을 집행합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPtwCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="산업안전보건법 3년 보존용 감사 대장 CSV 내보내기"
          >
            <Download className="h-4 w-4 text-rose-600" />
            <span>산안법 3년 감사대장</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="감사 증빙용 인쇄 / PDF 저장"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>법적 인쇄/PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-rose-700 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>작업허가서 신청</span>
          </button>
        </div>
      </div>

      {/* 상태 요약 대시보드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>승인 대기 허가서</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600">
            {requestedCount} <span className="text-sm font-semibold text-slate-500">건</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">안전관리자 현장 확인 필요</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>현재 작업 진행 중</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {activeCount} <span className="text-sm font-semibold text-slate-500">개소</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">현장 밀착 감시 및 비상벨 연동</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>누적 허가 발급 이력</span>
            <FileCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {permits.length} <span className="text-sm font-semibold text-slate-500">건</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">감사 대비 전자문서 보존</p>
        </div>
      </div>

      {/* 허가서 목록 카드 그리드 */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          작업허가 목록 ({permits.length})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {permits.map((permit) => {
            const typeInfo = WORK_TYPE_INFO[permit.workType];
            const gasAssessment = permit.gasTest ? assessGasSafety(permit.gasTest) : null;

            return (
              <div
                key={permit.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${typeInfo.color}`}
                    >
                      {typeInfo.icon}
                      <span>{typeInfo.label}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {permit.permitNumber}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      permit.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : permit.status === 'in_progress'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                        : permit.status === 'closed'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {permit.status === 'approved'
                      ? '승인완료'
                      : permit.status === 'in_progress'
                      ? '작업중'
                      : permit.status === 'closed'
                      ? '종료·정리완료'
                      : '승인대기'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{permit.workTitle}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {permit.workLocation}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      작업인원: {permit.workerCount}명
                      {permit.contractorName ? ` (${permit.contractorName})` : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    작업 예정: {permit.startTime.replace('T', ' ')} ~ {permit.endTime.split('T')[1]}
                  </div>
                </div>

                {/* 가스 측정치 표시 (밀폐공간 등) */}
                {permit.gasTest && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        가스 농도 실시간 측정치
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                          gasAssessment?.safe
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {gasAssessment?.safe ? '정상 적정공기' : '위험 기준 초과'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px] pt-1">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-150">
                        <div className="text-slate-400 text-[10px]">산소 (O2)</div>
                        <div className="font-bold text-slate-800">{permit.gasTest.oxygenPercent}%</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-150">
                        <div className="text-slate-400 text-[10px]">가연성 (LEL)</div>
                        <div className="font-bold text-slate-800">{permit.gasTest.combustibleGasPercent}%</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-150">
                        <div className="text-slate-400 text-[10px]">일산화탄소</div>
                        <div className="font-bold text-slate-800">{permit.gasTest.carbonMonoxidePpm}ppm</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-150">
                        <div className="text-slate-400 text-[10px]">황화수소</div>
                        <div className="font-bold text-slate-800">{permit.gasTest.hydrogenSulfidePpm}ppm</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 결재/액션 버튼 바 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-400">
                    신청자: <span className="text-slate-700 font-semibold">{permit.requesterName}</span>
                    {permit.safetyManagerName && (
                      <span className="ml-2">
                        · 안전승인자: <span className="text-indigo-700 font-semibold">{permit.safetyManagerName}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {permit.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(permit)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-2xs transition"
                      >
                        안전 승인
                      </button>
                    )}
                    {permit.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleClosePermit(permit)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 shadow-2xs transition"
                      >
                        작업 종료/현장 복구
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 신규 허가서 신청 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">안전작업허가서 신규 신청</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">위험작업 유형 선택</label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value as PermitWorkType)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 font-bold"
                >
                  <option value="hot_work">화기작업 (용접/절단/그라인딩)</option>
                  <option value="confined_space">밀폐공간 (탱크/맨홀/핏트)</option>
                  <option value="elevated">고소작업 (2m 이상 비계/사다리)</option>
                  <option value="electrical">정전/특고압 전기작업</option>
                  <option value="excavation">굴착작업</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">작업 제목</label>
                <input
                  type="text"
                  placeholder="예: 제1공장 냉각탑 밸브 용접"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">작업 장소</label>
                  <input
                    type="text"
                    placeholder="예: 보일러실 지하 1층"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">투입 인원 (명)</label>
                  <input
                    type="number"
                    min={1}
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">작업 시작 일시</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">작업 종료 일시 (최대 8시간)</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* 필수 안전조치 체크 */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="block font-bold text-slate-700">작업 전 안전조치 필수 확인</span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fireExtinguisher}
                      onChange={(e) => setFireExtinguisher(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium text-slate-700">소화기 비치 및 주변 가연물 제거 (화기 필수)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ventilation}
                      onChange={(e) => setVentilation(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium text-slate-700">송풍기 가동 및 강제 환기 확인 (밀폐 필수)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={harness}
                      onChange={(e) => setHarness(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium text-slate-700">안전대 체결 및 안전모 착용 (고소 필수)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockOutTagOut}
                      onChange={(e) => setLockOutTagOut(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium text-slate-700">LOTO 잠금 및 조작 금지 표지 부착 (전기/정전 필수)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
                >
                  허가 신청
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
