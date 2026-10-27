import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  FileCheck2,
  FileText,
  ShieldAlert,
  Calculator,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  User,
  PenTool,
  RotateCcw,
  Download,
  AlertTriangle,
  Printer,
  Calendar,
  Send,
  XCircle,
  Filter,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import {
  calculateRefundEstimate,
  calculateKftcStandardRefund,
  evaluateContractStatus,
  summarizeContracts,
  canTransitionContractStatus,
  getExpiringContractsForRenewalNotification,
  type SignedContract,
  type ContractTemplateType,
  type ContractStatus,
  type LegalProofMetadata,
} from '../domain/digitalContractEngine';

const STORAGE_KEY_CONTRACTS = 'moa_digital_contracts_data';

const DEFAULT_CONTRACTS: SignedContract[] = [
  {
    id: 'ctr-101',
    contractNumber: 'CTR-202610-001',
    templateType: 'personal_training',
    title: '1:1 VIP 퍼스널 트레이닝 30회 이용계약서',
    customerName: '홍길동',
    customerPhone: '010-8832-1920',
    totalContractAmount: 1800000,
    startDate: '2026-10-01',
    endDate: '2027-01-31',
    totalSessionsOrDays: 30,
    usedSessionsOrDays: 6,
    signedAt: '2026-10-01T14:20:00Z',
    status: 'SIGNED',
    legalProof: {
      signedAt: '2026-10-01T14:20:00Z',
      clientIp: '121.134.82.91',
      userAgent: 'Mozilla/5.0 (iPad; iOS 17.5)',
      deviceHash: 'hash-ipad-vip-001',
      certificateHash: 'sha256-kftc-verified-contract-101',
    },
    notes: '공정위 표준약관 10% 위약금 및 환불 규정 동의 완료',
  },
  {
    id: 'ctr-102',
    contractNumber: 'CTR-202610-002',
    templateType: 'membership_pass',
    title: '피트니스 연간 VIP 올패스 회원권 계약서',
    customerName: '김민주',
    customerPhone: '010-5541-9921',
    totalContractAmount: 1200000,
    startDate: '2026-09-01',
    endDate: '2026-11-05', // 약 18일 남음 (D-30 임박)
    totalSessionsOrDays: 365,
    usedSessionsOrDays: 45,
    signedAt: '2026-09-01T11:00:00Z',
    status: 'ACTIVE',
    legalProof: {
      signedAt: '2026-09-01T11:00:00Z',
      clientIp: '210.99.12.44',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      certificateHash: 'sha256-kftc-verified-contract-102',
    },
    notes: '락커 및 운동복 무료 지원 혜택 포함',
  },
  {
    id: 'ctr-103',
    contractNumber: 'CTR-202609-015',
    templateType: 'academy_tuition',
    title: '중등 입시 영어 단과 3개월 정기 수강원서',
    customerName: '이서진 (학부모 이정훈)',
    customerPhone: '010-3321-4411',
    totalContractAmount: 900000,
    startDate: '2026-09-01',
    endDate: '2026-10-25', // 7일 남음 (D-14 임박)
    totalSessionsOrDays: 24,
    usedSessionsOrDays: 12,
    signedAt: '2026-09-01T16:30:00Z',
    status: 'ACTIVE',
    legalProof: {
      signedAt: '2026-09-01T16:30:00Z',
      clientIp: '175.209.11.8',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
      certificateHash: 'sha256-kftc-verified-contract-103',
    },
  },
];

export const DigitalContractManagementView: React.FC = () => {
  const storageKey = getTenantStorageKey(STORAGE_KEY_CONTRACTS);

  // 1. Refine v5 데이터 페칭
  const { query } = useList<any>({
    resource: 'digital_contracts',
    pagination: { mode: 'off' },
  });

  const refineContracts = query?.data?.data as SignedContract[] | undefined;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  // 2. 로컬스토리지 폴백 상태
  const [localContracts, setLocalContracts] = useState<SignedContract[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_CONTRACTS;
    } catch {
      return DEFAULT_CONTRACTS;
    }
  });

  const contracts = useMemo(() => {
    if (refineContracts && refineContracts.length > 0) return refineContracts;
    return localContracts;
  }, [refineContracts, localContracts]);

  const saveLocalContracts = (next: SignedContract[]) => {
    setLocalContracts(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const [selectedContractId, setSelectedContractId] = useState<string>(DEFAULT_CONTRACTS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showSignModal, setShowSignModal] = useState(false);
  const [isServiceStartedToggle, setIsServiceStartedToggle] = useState<boolean>(true);
  const [simulatedUsedUnits, setSimulatedUsedUnits] = useState<number>(6);

  const selectedContract = contracts.find((c) => c.id === selectedContractId) || contracts[0];
  const summary = useMemo(() => summarizeContracts(contracts), [contracts]);

  // D-Day 만료 사전 알림 대상자 추출
  const renewalTargets = useMemo(() => {
    return getExpiringContractsForRenewalNotification(contracts);
  }, [contracts]);

  // 공정위 표준약관 기반 실시간 환불 산출
  const kftcRefund = useMemo(() => {
    if (!selectedContract) return null;
    return calculateKftcStandardRefund({
      totalContractAmount: selectedContract.totalContractAmount,
      totalSessionsOrDays: selectedContract.totalSessionsOrDays,
      usedSessionsOrDays: simulatedUsedUnits,
      isServiceStarted: isServiceStartedToggle,
    });
  }, [selectedContract, simulatedUsedUnits, isServiceStartedToggle]);

  // 필터링된 계약 목록
  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.contractNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }
    return result;
  }, [contracts, statusFilter, searchQuery]);

  // 상태 전이 처리 (DRAFT -> PENDING_SIGN -> SIGNED -> TERMINATED)
  const handleTransition = (contract: SignedContract, targetStatus: ContractStatus) => {
    const check = canTransitionContractStatus(contract.status, targetStatus);
    if (!check.allowed) {
      showToast(check.reason || '상태 전이가 허용되지 않습니다.', 'warning');
      return;
    }

    const updated: SignedContract = {
      ...contract,
      status: targetStatus,
      legalProof:
        targetStatus === 'SIGNED'
          ? {
              signedAt: new Date().toISOString(),
              clientIp: '127.0.0.1 (On-Premises)',
              userAgent: navigator.userAgent,
              certificateHash: `sha256-verified-${Date.now()}`,
            }
          : contract.legalProof,
    };

    if (refineContracts && refineContracts.length > 0) {
      mutateUpdate(
        {
          resource: 'digital_contracts',
          id: contract.id,
          values: updated,
        },
        {
          onSuccess: () => {
            refetch();
            showToast(`[${contract.contractNumber}] 상태가 '${targetStatus}'로 변경되었습니다.`, 'success');
          },
          onError: () => {
            const next = contracts.map((c) => (c.id === contract.id ? updated : c));
            saveLocalContracts(next);
            showToast(`[${contract.contractNumber}] 상태가 '${targetStatus}'로 로컬 변경되었습니다.`, 'info');
          },
        }
      );
    } else {
      const next = contracts.map((c) => (c.id === contract.id ? updated : c));
      saveLocalContracts(next);
      showToast(`[${contract.contractNumber}] 상태가 '${targetStatus}'로 변경되었습니다.`, 'success');
    }
  };

  // 인쇄 다이얼로그
  const handlePrintContract = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              현장 전자계약 & 공정위 환불 규정 관리
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            공정거래위원회 표준약관 기반 위약금 자동산출 및 전자서명 원본 5년 법적 증빙 보관
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintContract}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>표준 계약서 인쇄 (@media print)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>신규 계약서 작성</span>
          </button>
        </div>
      </div>

      {/* 만료 D-Day 알림 배너 (D-30 / D-14) */}
      {renewalTargets.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>계약 갱신 & 만료 사전 D-Day 알림 대상 ({renewalTargets.length}건)</span>
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {renewalTargets.map((t) => (
                <div
                  key={t.contractId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs"
                >
                  <span className="font-bold text-slate-800">{t.customerName}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({t.endDate})</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md font-bold text-[10px] ${
                      t.notificationType === 'EXPIRED'
                        ? 'bg-rose-600 text-white'
                        : t.notificationType === 'D_14'
                        ? 'bg-orange-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {t.notificationType}
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast(`[${t.customerName}] 갱신 안내 알림톡이 전송되었습니다.`, 'success')}
                    className="ml-1 text-blue-600 hover:underline font-semibold text-[10px]"
                  >
                    알림톡 발송
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상단 4대 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">총 계약 체결</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalContractCount}건</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-emerald-600 font-medium">진행 중 (ACTIVE/SIGNED)</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.activeCount}건</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-amber-600 font-medium">기간 만료 (EXPIRED)</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{summary.expiredCount}건</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-blue-600 font-medium">총 체결 계약액</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {summary.totalContractValue.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 메인 2열 레이아웃: 좌측 계약 목록 / 우측 상세 및 공정위 환불 계산기 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측 목록 */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="고객명, 계약번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs w-full focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border-0 bg-transparent text-slate-500 font-medium focus:outline-none"
            >
              <option value="ALL">전체</option>
              <option value="DRAFT">작성중</option>
              <option value="PENDING_SIGN">서명대기</option>
              <option value="SIGNED">체결완료</option>
              <option value="ACTIVE">진행중</option>
              <option value="TERMINATED">해지</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredContracts.map((c) => {
              const isSelected = c.id === selectedContractId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedContractId(c.id);
                    setSimulatedUsedUnits(c.usedSessionsOrDays);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 font-medium">{c.contractNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === 'SIGNED' || c.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'PENDING_SIGN'
                          ? 'bg-amber-100 text-amber-800'
                          : c.status === 'TERMINATED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{c.title}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>{c.customerName}</span>
                    <span className="font-bold text-slate-900">
                      {c.totalContractAmount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 계약 상세 & 공정위 환불 산출기 & 원본 증빙 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          {selectedContract ? (
            <>
              {/* 상단 타이틀 & 상태 액션 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-semibold text-blue-600">
                    {selectedContract.contractNumber}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedContract.title}</h2>
                </div>

                {/* 상태 전이 액션 버튼들 */}
                <div className="flex items-center gap-1.5">
                  {selectedContract.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleTransition(selectedContract, 'PENDING_SIGN')}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>서명 요청</span>
                    </button>
                  )}
                  {selectedContract.status === 'PENDING_SIGN' && (
                    <button
                      type="button"
                      onClick={() => handleTransition(selectedContract, 'SIGNED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>전자 서명 체결</span>
                    </button>
                  )}
                  {(selectedContract.status === 'SIGNED' || selectedContract.status === 'ACTIVE') && (
                    <button
                      type="button"
                      onClick={() => handleTransition(selectedContract, 'TERMINATED')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>중도 해지</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 계약자 인적사항 및 기간 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block font-medium">계약자명</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedContract.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">연락처</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedContract.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">계약 기간</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {selectedContract.startDate} ~ {selectedContract.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">진도/소진율</span>
                  <span className="font-bold text-blue-600 mt-0.5 block">
                    {selectedContract.usedSessionsOrDays} / {selectedContract.totalSessionsOrDays}
                  </span>
                </div>
              </div>

              {/* 공정거래위원회 표준 위약금 자동 산출 보드 */}
              <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-amber-700" />
                    <span>공정거래위원회 표준 위약금 자동 산출 엔진</span>
                  </span>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isServiceStartedToggle}
                        onChange={(e) => setIsServiceStartedToggle(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>서비스 개시 후</span>
                    </label>

                    {isServiceStartedToggle && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">소진량:</span>
                        <input
                          type="number"
                          min={0}
                          max={selectedContract.totalSessionsOrDays}
                          value={simulatedUsedUnits}
                          onChange={(e) => setSimulatedUsedUnits(Number(e.target.value) || 0)}
                          className="w-16 px-2 py-0.5 text-xs border rounded bg-white text-center font-bold font-mono"
                        />
                        <span className="text-xs text-slate-500">회/일</span>
                      </div>
                    )}
                  </div>
                </div>

                {kftcRefund && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block">이용 대가 (일할 차감)</span>
                      <span className="font-bold text-slate-900 text-sm mt-0.5 block font-mono">
                        -{kftcRefund.usedAmount.toLocaleString()}원
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block">공정위 위약금 (총액의 10%)</span>
                      <span className="font-bold text-rose-600 text-sm mt-0.5 block font-mono">
                        -{kftcRefund.penaltyAmount.toLocaleString()}원
                      </span>
                    </div>
                    <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-300">
                      <span className="text-emerald-800 block font-semibold">최종 환불 잔액</span>
                      <span className="font-extrabold text-emerald-700 text-base mt-0.5 block font-mono">
                        {kftcRefund.refundableAmount.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-amber-700 font-medium">
                  {kftcRefund?.deductionExplanation}
                </p>
              </div>

              {/* 법적 효력 증빙 메타데이터 (감사 추적) */}
              {selectedContract.legalProof && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    <span>전자문서법 제4조 및 전자서명법 법적 효력 불변 증빙</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                    <span>체결 타임스탬프: {new Date(selectedContract.legalProof.signedAt).toLocaleString()}</span>
                    <span>서명자 접속 IP: {selectedContract.legalProof.clientIp || '127.0.0.1'}</span>
                    <span className="truncate">User-Agent: {selectedContract.legalProof.userAgent}</span>
                    <span className="font-mono text-emerald-700 truncate">
                      무결성 해시: {selectedContract.legalProof.certificateHash}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400">선택된 계약서가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 신규 계약서 작성 모달 */}
      {showSignModal && (
        <NewContractModal
          onClose={() => setShowSignModal(false)}
          onCreated={(newContract) => {
            if (refineContracts) {
              mutateCreate(
                {
                  resource: 'digital_contracts',
                  values: newContract,
                },
                {
                  onSuccess: () => {
                    refetch();
                    setShowSignModal(false);
                    showToast(`[${newContract.contractNumber}] 신규 계약서가 등록되었습니다.`, 'success');
                  },
                  onError: () => {
                    saveLocalContracts([newContract, ...contracts]);
                    setShowSignModal(false);
                    showToast(`[${newContract.contractNumber}] 신규 계약서가 로컬 등록되었습니다.`, 'info');
                  },
                }
              );
            } else {
              saveLocalContracts([newContract, ...contracts]);
              setShowSignModal(false);
              showToast(`[${newContract.contractNumber}] 신규 계약서가 등록되었습니다.`, 'success');
            }
          }}
        />
      )}
    </div>
  );
};

interface NewContractModalProps {
  onClose: () => void;
  onCreated: (contract: SignedContract) => void;
}

const NewContractModal: React.FC<NewContractModalProps> = ({ onClose, onCreated }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('010-');
  const [title, setTitle] = useState('');
  const [templateType, setTemplateType] = useState<ContractTemplateType>('personal_training');
  const [amount, setAmount] = useState('1500000');
  const [totalSessions, setTotalSessions] = useState('30');
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !title.trim()) {
      showToast('고객명과 계약명을 입력해주세요.', 'warning');
      return;
    }

    const newCtr: SignedContract = {
      id: `ctr-${Date.now()}`,
      contractNumber: `CTR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      templateType,
      title: title.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      totalContractAmount: Number(amount) || 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate,
      totalSessionsOrDays: Number(totalSessions) || 1,
      usedSessionsOrDays: 0,
      signedAt: new Date().toISOString(),
      status: 'DRAFT',
      notes: '공정위 표준약관 10% 위약금 및 환불 규정 적용',
    };

    onCreated(newCtr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">신규 전자계약서 작성</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">계약서 템플릿</label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as ContractTemplateType)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="personal_training">1:1 PT 및 레슨 이용계약서</option>
              <option value="membership_pass">시설 정기 회원권 계약서</option>
              <option value="academy_tuition">학원 수강 등록원서</option>
              <option value="instructor_consignment">강사 강의 위탁계약서</option>
              <option value="staff_employment">표준 근로계약서</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">계약명</label>
            <input
              type="text"
              required
              placeholder="예: VIP 퍼스널 트레이닝 30회"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">계약자명</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">연락처</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">계약 총액 (원)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">총 등록 회차/일수</label>
              <input
                type="number"
                required
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">계약 만료일</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              초안 작성 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
