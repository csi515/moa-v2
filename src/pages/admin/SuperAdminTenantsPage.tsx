import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Users,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  BadgeAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { startImpersonation } from '@/core/auth/impersonationCoordinator';
import {
  fetchAdminTenants,
  toggleTenantStatus,
  approveManualPayment,
  changeSubscriptionPlan,
  updateTenantAddons,
  type AdminTenantSummary,
  type SubscriptionPlan,
} from '@/services/admin/adminTenantService';
import { ManualPaymentModal } from './components/ManualPaymentModal';
import { TenantAddonManagerModal } from './components/TenantAddonManagerModal';

export const SuperAdminTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectOrganization } = useOrganization();

  const [tenants, setTenants] = useState<AdminTenantSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 수동 납부 확인 모달 상태
  const [selectedTenantForPayment, setSelectedTenantForPayment] =
    useState<AdminTenantSummary | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // 유료 애드온 관리 모달 상태
  const [selectedTenantForAddon, setSelectedTenantForAddon] =
    useState<AdminTenantSummary | null>(null);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState<boolean>(false);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminTenants();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load admin tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 업종 고유 목록 추출
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach((t) => set.add(t.industryType));
    return Array.from(set);
  }, [tenants]);

  // 검색 및 필터링
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.publicCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesIndustry =
        industryFilter === 'all' || t.industryType === industryFilter;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? t.isActive
          : !t.isActive;

      return matchesSearch && matchesIndustry && matchesStatus;
    });
  }, [tenants, searchTerm, industryFilter, statusFilter]);

  // 통계 요약
  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.isActive).length;
    const suspended = total - active;
    const overdue = tenants.filter((t) => t.subscriptionStatus === 'Overdue').length;
    const trial = tenants.filter((t) => t.subscriptionStatus === 'Trial').length;
    return { total, active, suspended, overdue, trial };
  }, [tenants]);

  // 1. 대리 접속 (Impersonation)
  const handleImpersonate = async (tenant: AdminTenantSummary) => {
    if (!user) return;
    try {
      startImpersonation(tenant.id, tenant.name, user.email || 'admin');
      try {
        await selectOrganization(tenant.id);
      } catch {
        // 소속 멤버십에 없을 경우에도 대리 접속 키는 이미 설정됨
      }
      showToast(`'${tenant.name}' 사업장으로 대리 접속합니다.`);
      navigate('/workspace');
    } catch (err) {
      console.error('Failed to impersonate:', err);
      showToast('대리 접속 중 오류가 발생했습니다.');
    }
  };

  // 2. 테넌트 상태 토글 (긴급 정지 / 정상 복구)
  const handleToggleStatus = async (tenant: AdminTenantSummary) => {
    const actionName = tenant.isActive ? '일시 정지' : '정상 활성화';
    // confirm 제거 후 상태 변경 진행

    try {
      const nextStatus = await toggleTenantStatus(
        tenant.id,
        tenant.isActive,
        user?.email || 'admin',
        tenant.name
      );
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, isActive: nextStatus } : t))
      );
      showToast(
        `'${tenant.name}' 사업장이 ${nextStatus ? '정상 활성화' : '일시 정지'}되었습니다.`
      );
    } catch (err) {
      console.error('Failed to toggle tenant status:', err);
      showToast('상태 변경에 실패했습니다.');
    }
  };

  // 3. 플랜 변경
  const handlePlanChange = async (tenant: AdminTenantSummary, newPlan: SubscriptionPlan) => {
    try {
      await changeSubscriptionPlan(
        tenant.id,
        newPlan,
        user?.email || 'admin',
        tenant.name
      );
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id ? { ...t, subscriptionPlan: newPlan } : t
        )
      );
      showToast(`'${tenant.name}'의 구독 플랜이 ${newPlan}(으)로 변경되었습니다.`);
    } catch (err) {
      console.error('Failed to change plan:', err);
      showToast('플랜 변경에 실패했습니다.');
    }
  };

  // 4. 수동 납부 승인 처리
  const handleApprovePayment = async (data: {
    amount: number;
    depositorName: string;
    extendedMonths: number;
    isTaxInvoiceIssued: boolean;
    memo?: string;
  }) => {
    if (!selectedTenantForPayment || !user) return;

    const res = await approveManualPayment({
      organizationId: selectedTenantForPayment.id,
      orgName: selectedTenantForPayment.name,
      adminId: user.email || 'admin',
      amount: data.amount,
      depositorName: data.depositorName,
      extendedMonths: data.extendedMonths,
      isTaxInvoiceIssued: data.isTaxInvoiceIssued,
      memo: data.memo,
      currentExpiresAt: selectedTenantForPayment.subscriptionExpiresAt,
    });

    setTenants((prev) =>
      prev.map((t) =>
        t.id === selectedTenantForPayment.id
          ? {
              ...t,
              subscriptionExpiresAt: res.newExpiresAt,
              subscriptionStatus: 'Active',
              isActive: true,
              paymentLogs: [res.paymentLog, ...(t.paymentLogs || [])],
            }
          : t
      )
    );

    showToast(
      `'${selectedTenantForPayment.name}' 납부 확인 완료 (+${data.extendedMonths}개월 연장: ~${res.newExpiresAt})`
    );
  };

  // 4. 유료 애드온 저장 핸들러
  const handleSaveAddons = async (organizationId: string, updatedAddons: string[]) => {
    if (!user) return;
    const target = tenants.find((t) => t.id === organizationId);
    const result = await updateTenantAddons(
      organizationId,
      updatedAddons,
      user.id,
      target?.name
    );
    setTenants((prev) =>
      prev.map((t) =>
        t.id === organizationId
          ? {
              ...t,
              customAddons: result.customAddons,
              addonBilling: result.addonBilling,
            }
          : t
      )
    );
    showToast(`'${target?.name || organizationId}' 애드온 설정이 저장 및 적용되었습니다.`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl border border-indigo-400 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  슈퍼 어드민 테넌트 종합 관제 콘솔
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  최고 관리자 전용
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                플랫폼 내 등록된 전수 테넌트의 운영 지표, 이용권한 및 계좌이체 수동 납부를 실시간으로 관제·제어합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void loadTenants()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              onClick={() => navigate('/workspace')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
            >
              내 워크스페이스
            </button>
          </div>
        </div>

        {/* 종합 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-xs">
            <span className="text-xs font-bold text-slate-400 block mb-1">전체 사업장</span>
            <div className="text-2xl font-black text-white">{stats.total}개소</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-emerald-500/20 backdrop-blur-xs">
            <span className="text-xs font-bold text-emerald-400 block mb-1">정상 운영 (Active)</span>
            <div className="text-2xl font-black text-emerald-300">{stats.active}개소</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-rose-500/20 backdrop-blur-xs">
            <span className="text-xs font-bold text-rose-400 block mb-1">일시 정지 (Suspended)</span>
            <div className="text-2xl font-black text-rose-300">{stats.suspended}개소</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-amber-500/20 backdrop-blur-xs">
            <span className="text-xs font-bold text-amber-400 block mb-1">구독 만료/연체</span>
            <div className="text-2xl font-black text-amber-300">{stats.overdue}개소</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-blue-500/20 backdrop-blur-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-blue-400 block mb-1">무료 체험 중</span>
            <div className="text-2xl font-black text-blue-300">{stats.trial}개소</div>
          </div>
        </div>

        {/* 검색 및 필터 바 */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="사업장 상호명, 대표자 이메일, 공개코드 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* 업종 필터 */}
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">전체 업종 ({availableIndustries.length})</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">운영 상태 전체</option>
              <option value="active">정상 운영 (Active)</option>
              <option value="suspended">일시 정지 (Suspended)</option>
            </select>
          </div>
        </div>

        {/* 테넌트 테이블 */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-700/80">
              <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">사업장 / 공개코드</th>
                  <th className="px-3 py-3.5">업종 프리셋</th>
                  <th className="px-3 py-3.5">대표자 / 연락처</th>
                  <th className="px-3 py-3.5 text-center">규모 (직원/고객)</th>
                  <th className="px-3 py-3.5">구독 플랜 & 만료일</th>
                  <th className="px-3 py-3.5 text-center">상태</th>
                  <th className="px-4 py-3.5 text-right">관리 제어 (대리접속/납부/정지)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      테넌트 데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      검색 조건에 일치하는 테넌트가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* 1. 사업장 / 공개코드 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                              {tenant.name}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              코드: {tenant.publicCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. 업종 프리셋 */}
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-600">
                          {tenant.industryLabel}
                        </span>
                      </td>

                      {/* 3. 대표자 / 연락처 */}
                      <td className="px-3 py-3.5">
                        <div className="text-slate-200">{tenant.ownerEmail}</div>
                        <div className="text-[11px] text-slate-400">{tenant.ownerPhone}</div>
                      </td>

                      {/* 4. 규모 (직원 / 고객 수) */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <span
                            title="등록 직원 수"
                            className="inline-flex items-center gap-1 text-slate-300"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {tenant.staffCount}명
                          </span>
                          <span className="text-slate-600">/</span>
                          <span
                            title="등록 고객/원생 수"
                            className="inline-flex items-center gap-1 text-indigo-400 font-semibold"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {tenant.customerCount}명
                          </span>
                        </div>
                      </td>

                      {/* 5. 구독 플랜 & 만료일 */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {/* 플랜 즉시 변경 셀렉트 */}
                          <select
                            value={tenant.subscriptionPlan}
                            onChange={(e) =>
                              handlePlanChange(tenant, e.target.value as SubscriptionPlan)
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-300 focus:outline-none"
                          >
                            <option value="Basic">Basic</option>
                            <option value="Pro">Pro</option>
                            <option value="Enterprise">Enterprise</option>
                            <option value="Free Trial">Free Trial</option>
                          </select>

                          {/* 구독 상태 뱃지 */}
                          {tenant.subscriptionStatus === 'Active' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              정상
                            </span>
                          )}
                          {tenant.subscriptionStatus === 'Overdue' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                              만료/연체
                            </span>
                          )}
                          {tenant.subscriptionStatus === 'Trial' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                              체험중
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>만료: {tenant.subscriptionExpiresAt || '기한 없음'}</span>
                        </div>
                      </td>

                      {/* 6. 운영 상태 */}
                      <td className="px-3 py-3.5 text-center">
                        {tenant.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            정상
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                            <XCircle className="w-3 h-3" />
                            정지됨
                          </span>
                        )}
                      </td>

                      {/* 7. 액션 컬럼 */}
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        {/* 1) 대리 접속 (Impersonation) */}
                        <button
                          onClick={() => handleImpersonate(tenant)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-all"
                          title="해당 사업장 관리자 화면으로 즉시 전환하여 문제를 점검합니다"
                        >
                          <ExternalLink className="w-3 h-3" />
                          화면 보기
                        </button>

                        {/* 2) 유료 애드온 관리 모달 오픈 */}
                        <button
                          onClick={() => {
                            setSelectedTenantForAddon(tenant);
                            setIsAddonModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition-all"
                          title="테넌트별 유료 Capability 애드온을 추가하거나 삭제합니다"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          애드온 관리
                          {tenant.customAddons && tenant.customAddons.length > 0 && (
                            <span className="ml-0.5 px-1 py-0.2 rounded-full bg-purple-500/40 text-purple-200 text-[10px]">
                              {tenant.customAddons.length}
                            </span>
                          )}
                        </button>

                        {/* 3) 계좌이체 수동 납부 확인 모달 오픈 */}
                        <button
                          onClick={() => {
                            setSelectedTenantForPayment(tenant);
                            setIsPaymentModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all"
                          title="계좌이체 입금을 확인하고 서비스 이용 기간을 연장합니다"
                        >
                          <CreditCard className="w-3 h-3" />
                          납부 확인
                        </button>

                        {/* 4) 긴급 정지 / 정상 활성화 토글 */}
                        <button
                          onClick={() => handleToggleStatus(tenant)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            tenant.isActive
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                          title={
                            tenant.isActive
                              ? '사업장을 즉시 일시 정지 처리합니다'
                              : '사업장 이용을 다시 정상 활성화합니다'
                          }
                        >
                          {tenant.isActive ? '정지' : '복구'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 수동 납부 확인 모달 */}
      <ManualPaymentModal
        tenant={selectedTenantForPayment}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedTenantForPayment(null);
        }}
        onApprove={handleApprovePayment}
      />

      {/* 유료 애드온 관리 모달 */}
      <TenantAddonManagerModal
        tenant={selectedTenantForAddon}
        isOpen={isAddonModalOpen}
        onClose={() => {
          setIsAddonModalOpen(false);
          setSelectedTenantForAddon(null);
        }}
        onSave={handleSaveAddons}
      />
    </div>
  );
};

export default SuperAdminTenantsPage;
