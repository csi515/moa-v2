import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  FileSignature,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react';
import {
  type WorkplacePolicy,
  type PolicyAcknowledgement,
  type PolicyCategory,
  calculatePolicyComplianceRate,
  getNextPolicyVersion,
} from '../domain/policyEngine';

const STORAGE_KEY_POLICIES = 'moa_workplace_policies_cache';
const STORAGE_KEY_ACKS = 'moa_workplace_policy_acknowledgements_cache';

const DEFAULT_POLICIES: WorkplacePolicy[] = [
  {
    id: 'pol-default-1',
    organizationId: 'org-current',
    title: '매장 복무 규정 및 고객 서비스 수칙',
    category: 'service_code',
    content:
      '1. 근무 시간 중 단정한 복장과 미소를 유지합니다.\n2. 고객 문의 시 경청하며 친절하고 정확하게 안내합니다.\n3. 매장 내 개인 전자기기의 사적 사용을 자제합니다.',
    version: 1,
    isMandatory: true,
    effectiveDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pol-default-2',
    organizationId: 'org-current',
    title: '현장 화재 예방 및 비상 안전 대피 수칙',
    category: 'safety_rule',
    content:
      '1. 비상구 및 소화기 앞 통로에 물품을 적치하지 않습니다.\n2. 마감 시 전열기구 전원 차단 및 가스 밸브를 점검합니다.\n3. 화재 발생 시 119 신고 및 고객 대피 유도를 최우선으로 합니다.',
    version: 1,
    isMandatory: true,
    effectiveDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pol-default-3',
    organizationId: 'org-current',
    title: '직원 휴게실 및 공용 시설 이용 규정',
    category: 'dormitory_rule',
    content:
      '1. 휴게실 이용 후 개인 집기 및 쓰레기를 즉시 분리수거합니다.\n2. 타 직원의 휴식을 방해하는 소음 행위를 금지합니다.\n3. 공용 냉장고 보관 물품에는 이름을 표기합니다.',
    version: 1,
    isMandatory: false,
    effectiveDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const WorkplacePolicyManagementView: React.FC = () => {
  const [localPolicies, setLocalPolicies] = useState<WorkplacePolicy[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_POLICIES));
      return saved ? JSON.parse(saved) : DEFAULT_POLICIES;
    } catch {
      return DEFAULT_POLICIES;
    }
  });

  const [localAcknowledgements, setLocalAcknowledgements] = useState<PolicyAcknowledgement[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_ACKS));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Refine DB 데이터 바인딩
  const { query: policyQuery } = useList<any>({
    resource: 'workplace_policies',
    pagination: { mode: 'off' },
  });
  const { query: ackQuery } = useList<any>({
    resource: 'policy_acknowledgements',
    pagination: { mode: 'off' },
  });
  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  // 서버 데이터 우선 매핑 (DB 데이터가 존재하면 우선 사용, 없으면 로컬 데이터로 폴백)
  const serverPolicies = useMemo(() => {
    const data = policyQuery?.data?.data;
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
      id: String(row.id),
      organizationId: String(row.organization_id || 'org-current'),
      title: String(row.title),
      category: (row.category || 'service_code') as PolicyCategory,
      content: String(row.content),
      version: Number(row.version ?? 1),
      isMandatory: Boolean(row.is_mandatory ?? true),
      effectiveDate: String(row.effective_date || new Date().toISOString().slice(0, 10)),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    }));
  }, [policyQuery?.data?.data]);

  const policies: WorkplacePolicy[] = useMemo(() => {
    return serverPolicies && serverPolicies.length > 0 ? serverPolicies : localPolicies;
  }, [serverPolicies, localPolicies]);

  const serverAcks = useMemo(() => {
    const data = ackQuery?.data?.data;
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data.map((row: any) => ({
      id: String(row.id),
      organizationId: String(row.organization_id || 'org-current'),
      policyId: String(row.policy_id),
      policyVersion: Number(row.policy_version ?? 1),
      staffId: String(row.staff_id || 'staff-current'),
      acknowledgedAt: String(row.acknowledged_at || new Date().toISOString()),
      signatureDataUrl: String(row.signature_data_url || ''),
      ipAddress: row.ip_address ? String(row.ip_address) : undefined,
      userAgent: row.user_agent ? String(row.user_agent) : undefined,
    }));
  }, [ackQuery?.data?.data]);

  const acknowledgements: PolicyAcknowledgement[] = useMemo(() => {
    return serverAcks && serverAcks.length > 0 ? serverAcks : localAcknowledgements;
  }, [serverAcks, localAcknowledgements]);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'create' | 'sign' | 'history' | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<WorkplacePolicy | null>(null);

  // 신규 사규 폼 상태
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<PolicyCategory>('service_code');
  const [formContent, setFormContent] = useState('');
  const [formIsMandatory, setFormIsMandatory] = useState(true);

  // 모바일 서명 캔버스 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerStaffId] = useState('staff-current');

  // 로컬 캐시 영속화
  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_POLICIES), JSON.stringify(localPolicies));
    } catch (e) {
      console.warn('Failed to save policies:', e);
    }
  }, [localPolicies]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_ACKS), JSON.stringify(localAcknowledgements));
    } catch (e) {
      console.warn('Failed to save acknowledgements:', e);
    }
  }, [localAcknowledgements]);

  // 임의의 직원 풀 (통계 산출용)
  const mockStaffList = useMemo(() => ['staff-current', 'staff-2', 'staff-3'], []);

  const compliance = useMemo(() => {
    return calculatePolicyComplianceRate(mockStaffList, policies, acknowledgements);
  }, [mockStaffList, policies, acknowledgements]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [policies, selectedCategory, searchQuery]);

  // 캔버스 초기화 및 마우스/터치 이벤트
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e1b4b'; // indigo-950
    setIsDrawing(true);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const newPol: WorkplacePolicy = {
      id: `pol-${Date.now()}`,
      organizationId: 'org-current',
      title: formTitle.trim(),
      category: formCategory,
      content: formContent.trim(),
      version: 1,
      isMandatory: formIsMandatory,
      effectiveDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLocalPolicies((prev) => [newPol, ...prev]);

    mutateCreate(
      {
        resource: 'workplace_policies',
        values: {
          title: formTitle.trim(),
          category: formCategory,
          content: formContent.trim(),
          version: 1,
          is_mandatory: formIsMandatory,
          effective_date: new Date().toISOString().slice(0, 10),
        },
      },
      {
        onSuccess: () => {
          policyQuery?.refetch();
          showToast('새 사규가 서버에 등록되었습니다.', 'success');
        },
        onError: (err) => {
          console.warn('Fallback to local storage:', err);
        },
      }
    );

    setActiveModal(null);
    setFormTitle('');
    setFormContent('');
  };

  const handleSignSubmit = () => {
    if (!selectedPolicy || !canvasRef.current || !hasSignature) return;

    const signatureUrl = canvasRef.current.toDataURL('image/png');

    const newAck: PolicyAcknowledgement = {
      id: `ack-${Date.now()}`,
      organizationId: selectedPolicy.organizationId,
      policyId: selectedPolicy.id,
      policyVersion: selectedPolicy.version,
      staffId: signerStaffId,
      acknowledgedAt: new Date().toISOString(),
      signatureDataUrl: signatureUrl,
      userAgent: navigator.userAgent,
    };

    setLocalAcknowledgements((prev) => [newAck, ...prev]);

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (isValidUuid(selectedPolicy.id)) {
      mutateCreate(
        {
          resource: 'policy_acknowledgements',
          values: {
            policy_id: selectedPolicy.id,
            policy_version: selectedPolicy.version,
            staff_id: isValidUuid(signerStaffId) ? signerStaffId : '00000000-0000-0000-0000-000000000001',
            signature_data_url: signatureUrl,
            user_agent: navigator.userAgent,
          },
        },
        {
          onSuccess: () => {
            ackQuery?.refetch();
            showToast('사규 전자서약이 영구 감사 로그에 기록되었습니다.', 'success');
          },
          onError: (err) => {
            console.warn('Fallback to local storage:', err);
          },
        }
      );
    }

    setActiveModal(null);
    setSelectedPolicy(null);
    clearCanvas();
  };

  const handleRevisePolicy = (policy: WorkplacePolicy) => {
    const nextVer = getNextPolicyVersion(policy.version);
    const updated = localPolicies.map((p) =>
      p.id === policy.id
        ? {
            ...p,
            version: nextVer,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    setLocalPolicies(updated);

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (isValidUuid(policy.id)) {
      mutateUpdate(
        {
          resource: 'workplace_policies',
          id: policy.id,
          values: {
            version: nextVer,
            updated_at: new Date().toISOString(),
          },
        },
        {
          onSuccess: () => {
            policyQuery?.refetch();
            showToast(`사규가 v${nextVer} 버전으로 개정되었습니다.`, 'success');
          },
          onError: (err) => {
            console.warn('Fallback to local storage:', err);
          },
        }
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">매장 내규·사규 관리</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                직원 복무 규정, 안전 수칙을 관리하고 모바일 자필 서약 불변 감사 로그를 보관합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveModal('create')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>새 사규 등록</span>
          </button>
        </div>
      </div>

      {/* 요약 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">등록된 필수 사규</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {policies.filter((p) => p.isMandatory).length}
              <span className="text-xs font-normal text-slate-400 ml-1">/ {policies.length}건</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">전 직원 필수 서약 이행률</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {compliance.complianceRatePercent}%
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({compliance.completedCount}/{compliance.totalRequired})
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">미서약 직원</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {compliance.nonCompliantStaffIds.length}
              <span className="text-xs font-normal text-slate-400 ml-1">명</span>
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: '전체' },
            { id: 'service_code', label: '복무·서비스' },
            { id: 'safety_rule', label: '안전·소방' },
            { id: 'dormitory_rule', label: '휴게·숙소' },
            { id: 'compensation', label: '수당·보상' },
            { id: 'general', label: '공통' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="사규 명칭 또는 본문 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 사규 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPolicies.map((pol) => {
          const acksForThis = acknowledgements.filter(
            (a) => a.policyId === pol.id && a.policyVersion === pol.version
          );

          return (
            <div
              key={pol.id}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          pol.isMandatory
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pol.isMandatory ? '필수 서약' : '권장'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        v{pol.version}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{pol.title}</h3>
                  </div>

                  <button
                    type="button"
                    title="사규 개정 (새 버전 등록 시 기존 직원 재서약 요구)"
                    onClick={() => handleRevisePolicy(pol)}
                    className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 p-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>개정(v{pol.version + 1})</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                  {pol.content}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    서약 완료: <strong className="text-slate-900">{acksForThis.length}</strong>명
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPolicy(pol);
                      setActiveModal('sign');
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-all flex items-center gap-1"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>전자 서약하기</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 새 사규 등록 모달 */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">새 매장 사규·내규 등록</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">사규 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: 고객 서비스 복무 수칙"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">분류</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as PolicyCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="service_code">복무 및 서비스 수칙</option>
                  <option value="safety_rule">매장 안전 및 비상 대피</option>
                  <option value="dormitory_rule">휴게실 및 공용 시설 내규</option>
                  <option value="compensation">인센티브 및 수당 규정</option>
                  <option value="general">일반 매장 공통 규정</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">내규 본문</label>
                <textarea
                  required
                  rows={5}
                  placeholder="조항별 구체적인 수칙 내용을 입력하세요..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={formIsMandatory}
                  onChange={(e) => setFormIsMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                />
                <label htmlFor="mandatoryCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  직원 필수 서약 항목으로 지정 (미서약 시 알림 및 시스템 제한)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모바일 캔버스 터치 서명 모달 */}
      {activeModal === 'sign' && selectedPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  모바일 전자 서약
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedPolicy.title} (v{selectedPolicy.version})</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
              {selectedPolicy.content}
            </div>

            <p className="text-[11px] text-slate-500">
              위 사규 내용을 모두 확인하였으며, 이를 성실히 준수할 것에 자필 서명으로 서약합니다.
            </p>

            {/* 터치스크린 자필 서명 패드 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>자필 서명 (손가락 또는 터치펜)</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>지우기</span>
                </button>
              </div>

              <div className="border border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50 relative touch-none">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={140}
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleDraw}
                  onMouseUp={handleEndDraw}
                  onMouseLeave={handleEndDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleDraw}
                  onTouchEnd={handleEndDraw}
                  className="w-full h-[140px] cursor-crosshair"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-300 font-medium">
                    여기에 정자로 서명해 주세요
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!hasSignature}
                onClick={handleSignSubmit}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all"
              >
                서약 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
