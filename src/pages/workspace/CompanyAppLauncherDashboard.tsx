import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Target,
  Car,
  Bus,
  ShieldAlert,
  HeartHandshake,
  UtensilsCrossed,
  Package,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
  X,
  FileCheck,
  Warehouse,
  MessageSquareWarning,
  AlertTriangle,
  ClipboardCheck,
  Kanban,
  Wrench,
  FlaskRound,
} from 'lucide-react';
import { useList, useGetIdentity } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { canAccessRndPortal, normalizeRolePermissions } from '@/domain/permissions';
import { listMyPendingApprovalLines } from '@/capabilities/sop_risk_assessment/services/riskAssessmentApprovalService';
import { useAuth } from '@/core/auth/AuthProvider';

export interface CompanyAppTile {
  id: string;
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string | number | null;
  badgeColor?: string;
  statusText?: string;
  requiredAnyCapability?: readonly string[];
  /** true면 호출측에서 멤버 권한까지 통과해야 타일 표시 */
  requiresPermissionCheck?: boolean;
}

interface PendingApprovalItem {
  id: string;
  title: string;
  requester: string;
  timeAgo: string;
  to: string;
  domainLabel: string;
}

function formatTimeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function resolveEnabledCaps(
  industryType: string | null | undefined,
  activeCapabilities: readonly string[],
  hiddenCapabilities: readonly string[],
  customAddons: readonly string[]
): string[] {
  const preset = getIndustryPreset(industryType ?? '');
  const baseCaps = (preset?.capabilities ?? []) as string[];
  const requiredCaps = new Set<string>((preset?.requiredCapabilities ?? []) as string[]);
  const hiddenFromSettings = ((preset?.defaultSettings as { hidden_capabilities?: string[] } | undefined)
    ?.hidden_capabilities ?? []) as string[];
  const hiddenSet = new Set([...hiddenCapabilities, ...hiddenFromSettings]);
  const combined = new Set([...baseCaps, ...activeCapabilities, ...customAddons]);
  return Array.from(combined).filter((cap) => requiredCaps.has(cap) || !hiddenSet.has(cap));
}

function tileAllowed(
  tile: CompanyAppTile,
  enabledCaps: readonly string[],
  permissionOk = true
): boolean {
  if (!permissionOk) return false;
  if (!tile.requiredAnyCapability || tile.requiredAnyCapability.length === 0) return true;
  return tile.requiredAnyCapability.some((c) => enabledCaps.includes(c));
}


/** 멤버 feature_permissions / 카탈로그에 실제 존재하는 키만 사용 */
const APP_FEATURE_PERM_MAP: Record<string, string> = {
  resources: 'resources:manage',
  grievances: 'grievances_manage',
  volunteer: 'volunteer:manage',
  shuttle: 'shuttle:manage',
  office_supply: 'office_supply_request:manage',
  meal_survey: 'meal_survey:manage',
  sop_risk: 'safety:manage',
};

const FEATURE_LABEL_MAP: Record<string, string> = {
  'resources:manage': '공용자원 담당',
  'volunteer:manage': '봉사활동 담당',
  'grievances_manage': '노경·고충 담당',
  'shuttle:manage': '통근셔틀 담당',
  'office_supply_request:manage': '사무용품 담당',
  'meal_survey:manage': '식수조사 담당',
  'safety:manage': '현장 안전/SOP 담당',
};

export const CompanyAppLauncherDashboard: React.FC<{
  onSelectApp?: (appId: string) => void;
  /** 셸에서 넘기면 동일 소스 사용; 없으면 org·프리셋에서 계산 */
  enabledCapabilityIds?: readonly string[];
  /** compact: 인트라넷 허브용(브리핑·결재 배지 생략, 앱 그리드만) */
  variant?: 'home' | 'hub';
}> = ({ onSelectApp, enabledCapabilityIds, variant = 'home' }) => {
  const navigate = useNavigate();
  const { currentOrganization, activeCapabilities = [], hiddenCapabilities = [] } =
    useOrganization();
  const { data: user } = useGetIdentity<{ id?: string; name?: string; email?: string }>();
  const { user: authUser } = useAuth();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [sopPendingCount, setSopPendingCount] = useState(0);

  const activeUser = StorageService.getActiveUser();
  const userName = user?.name || activeUser?.name || '임직원';
  const orgName = currentOrganization?.name || '사내 업무 포털';

  const userFeaturePermissions = useMemo<Record<string, boolean>>(() => {
    const raw = (activeUser as unknown as { feature_permissions?: Record<string, boolean> })?.feature_permissions || {};
    return typeof raw === 'object' && raw !== null ? raw : {};
  }, [activeUser]);

  const assignedRoleBadges = useMemo(() => {
    return Object.entries(userFeaturePermissions)
      .filter(([key, val]) => Boolean(val) && FEATURE_LABEL_MAP[key])
      .map(([key]) => FEATURE_LABEL_MAP[key]);
  }, [userFeaturePermissions]);

  const enabledCaps = useMemo(() => {
    if (enabledCapabilityIds && enabledCapabilityIds.length > 0) {
      return [...enabledCapabilityIds];
    }
    const customAddons = ((currentOrganization?.settings as { custom_addons?: string[] } | undefined)
      ?.custom_addons ?? []) as string[];
    return resolveEnabledCaps(
      currentOrganization?.industry_type,
      activeCapabilities,
      hiddenCapabilities,
      customAddons
    );
  }, [
    enabledCapabilityIds,
    currentOrganization?.industry_type,
    currentOrganization?.settings,
    activeCapabilities,
    hiddenCapabilities,
  ]);

  const { query: approvalsQuery } = useList<{
    id: string;
    title: string;
    requester_name?: string | null;
    status?: string;
    created_at?: string | null;
    entity_type?: string | null;
  }>({
    resource: 'approval_requests',
    filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 20 },
    queryOptions: {
      enabled: enabledCaps.includes('approval_workflow'),
    },
  });

  useEffect(() => {
    const uid = authUser?.id || user?.id;
    if (!uid || !enabledCaps.includes('sop_risk_assessment')) {
      setSopPendingCount(0);
      return;
    }
    let cancelled = false;
    void listMyPendingApprovalLines(uid)
      .then((lines) => {
        if (!cancelled) setSopPendingCount(lines.length);
      })
      .catch(() => {
        if (!cancelled) setSopPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, user?.id, enabledCaps]);

  const pendingApprovals: PendingApprovalItem[] = useMemo(() => {
    const rows = approvalsQuery?.data?.data ?? [];
    const workflowItems = rows.map((r) => ({
      id: r.id,
      title: r.title,
      requester: r.requester_name || '기안자',
      timeAgo: formatTimeAgo(r.created_at),
      to: '/workspace/approvals',
      domainLabel: r.entity_type || '결재',
    }));
    if (sopPendingCount <= 0) return workflowItems;
    return [
      {
        id: 'sop-pending-aggregate',
        title: `안전·SOP 결재 대기 ${sopPendingCount}건`,
        requester: '위험성평가',
        timeAgo: '',
        to: '/workspace/sop-risk',
        domainLabel: 'sop_risk',
      },
      ...workflowItems,
    ];
  }, [approvalsQuery?.data?.data, sopPendingCount]);

  const pendingBadgeCount = (approvalsQuery?.data?.data?.length ?? 0) + sopPendingCount;

  const appTiles: CompanyAppTile[] = useMemo(() => {
    const all: CompanyAppTile[] = [
      {
        id: 'approvals',
        to: '/workspace/approvals',
        label: '전자 결재',
        description: '기안·승인·반려',
        icon: <FileCheck className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-indigo-500 to-blue-600',
        requiredAnyCapability: ['approval_workflow'],
        badge: pendingBadgeCount || null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'research',
        to: '/rnd',
        label: '연구소',
        description: '과제·장비·특허',
        icon: <FlaskConical className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-violet-500 to-purple-600',
        requiredAnyCapability: ['research_project'],
        requiresPermissionCheck: true,
      },
      {
        id: 'mbo',
        to: '/workspace/mbo',
        label: 'MBO',
        description: '목표·마일스톤',
        icon: <Target className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-emerald-500 to-teal-600',
        requiredAnyCapability: ['mbo'],
      },
      {
        id: 'shuttle',
        to: '/workspace/shuttle/my',
        label: '통근 셔틀',
        description: '탑승·노선·운행표',
        icon: <Bus className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-blue-500 to-indigo-600',
        requiredAnyCapability: ['shuttle_dispatch'],
      },
      {
        id: 'resources',
        to: '/workspace/resources',
        label: '공용 자원',
        description: '차량·회의실 예약',
        icon: <Car className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-amber-500 to-orange-600',
        requiredAnyCapability: ['booking', 'seat_room'],
      },
      {
        id: 'inventory',
        to: '/workspace/inventory',
        label: '현장 자재',
        description: '재고 수불',
        icon: <Warehouse className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-cyan-500 to-teal-600',
        requiredAnyCapability: ['inventory'],
      },
      {
        id: 'supply_restock',
        to: '/workspace/supply-restock',
        label: '소모품·발주',
        description: '안전재고·간이 발주',
        icon: <Package className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-teal-500 to-cyan-700',
        requiredAnyCapability: ['supply_restock'],
      },
      {
        id: 'sop_risk',
        to: '/workspace/sop-risk',
        label: '작업표준·위험성평가',
        description: 'SOP 및 위험성평가',
        icon: <ShieldAlert className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-rose-500 to-red-600',
        requiredAnyCapability: ['sop_risk_assessment'],
      },
      {
        id: 'facility_incident',
        to: '/workspace/facility-incident-report',
        label: '사고·위험 보고',
        description: '현장 사고·아차사고',
        icon: <AlertTriangle className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-orange-500 to-amber-600',
        requiredAnyCapability: ['facility_incident_report'],
      },
      {
        id: 'maintenance',
        to: '/workspace/maintenance',
        label: '설비 점검',
        description: '점검 체크리스트',
        icon: <ClipboardCheck className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-slate-500 to-zinc-700',
        requiredAnyCapability: ['maintenance_checklist'],
      },
      {
        id: 'pipelines',
        to: '/workspace/pipelines',
        label: '업무 파이프라인',
        description: '칸반·작업 지시',
        icon: <Kanban className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-fuchsia-500 to-purple-700',
        requiredAnyCapability: ['task_pipeline'],
      },
      {
        id: 'equipment_lifecycle',
        to: '/workspace/equipment-lifecycle',
        label: '장비 수명관리',
        description: '교정·수리·폐기',
        icon: <Wrench className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-stone-500 to-neutral-700',
        requiredAnyCapability: ['equipment_lifecycle'],
      },
      {
        id: 'hazardous_substance',
        to: '/workspace/hazardous-substances',
        label: '유해물질 MSDS',
        description: '취급·보관·MSDS',
        icon: <FlaskRound className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-yellow-500 to-orange-700',
        requiredAnyCapability: ['hazardous_substance_msds'],
      },
      {
        id: 'grievances',
        to: '/workspace/grievances',
        label: '노경 건의함',
        description: '건의·제보',
        icon: <MessageSquareWarning className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-indigo-500 to-violet-600',
        requiredAnyCapability: ['whistleblower_grievance'],
      },
      {
        id: 'volunteer',
        to: '/workspace/volunteer',
        label: '봉사활동',
        description: '모집·참여 신청',
        icon: <HeartHandshake className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-pink-500 to-rose-600',
        requiredAnyCapability: ['volunteer_activity'],
      },
      {
        id: 'meal_survey',
        to: '/workspace/meal-survey',
        label: '식수인원 조사',
        description: '조·중·석 사전 표시',
        icon: <UtensilsCrossed className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-lime-500 to-green-600',
        requiredAnyCapability: ['meal_survey'],
      },
      {
        id: 'office_supply',
        to: '/workspace/office-supply',
        label: '사무용품 취합',
        description: '월별 신청·부서 취합',
        icon: <Package className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-sky-500 to-blue-600',
        requiredAnyCapability: ['office_supply_request'],
      },
      {
        id: 'settings',
        to: '/workspace/settings/roles',
        label: '설정',
        description: '조직도·권한·숨긴 기능 다시 켜기',
        icon: <Settings className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-zinc-500 to-slate-600',
      },
    ];
    const rndOk = canAccessRndPortal({
      role: activeUser?.role ?? null,
      permissions: normalizeRolePermissions(activeUser?.customRole?.permissions ?? null) ?? undefined,
      customRole: activeUser?.customRole ?? null,
    });
    return all
      .filter((t) => {
        const permOk = t.requiresPermissionCheck && t.id === 'research' ? rndOk : true;
        return tileAllowed(t, enabledCaps, permOk);
      })
      .map((t) => {
        const permKey = APP_FEATURE_PERM_MAP[t.id];
      const isFeatureManager = permKey ? Boolean(userFeaturePermissions[permKey]) : false;
      const finalBadge = t.badge ?? (isFeatureManager ? '담당' : null);
      const finalBadgeColor = t.badge ? t.badgeColor : (isFeatureManager ? 'bg-indigo-600 text-white' : undefined);
      return {
        ...t,
        badge: finalBadge,
        badgeColor: finalBadgeColor,
      };
      });
  }, [
    enabledCaps,
    pendingBadgeCount,
    activeUser?.role,
    activeUser?.customRole,
    userFeaturePermissions,
  ]);

  const handleTileClick = (tile: CompanyAppTile, e: React.MouseEvent) => {
    if (onSelectApp) {
      e.preventDefault();
      onSelectApp(tile.id);
      navigate(tile.to);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  return (
    <div
      className="mx-auto max-w-4xl px-4 py-6 sm:py-10"
      data-testid="company-app-launcher"
      data-variant={variant}
    >
      {variant === 'home' ? (
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>{orgName}</span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                안녕하세요, {userName}님
              </h1>
              <p className="mt-1 text-sm text-slate-500">{todayStr} · 사내 업무 런처</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  🏢 {(activeUser as unknown as { department?: string })?.department || '본사'}
                </span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  👤 {(activeUser as unknown as { role?: string; customRole?: { name?: string } })?.role || (activeUser as unknown as { customRole?: { name?: string } })?.customRole?.name || '임직원'}
                </span>
                {assignedRoleBadges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 ml-1">
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-medium text-[11px]">지정 직무:</span>
                    {assignedRoleBadges.map((badge) => (
                      <span
                        key={badge}
                        className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[11px] border border-indigo-200 shadow-2xs"
                      >
                        ★ {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {pendingApprovals.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowApprovalModal(true)}
                className="group flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left transition-all hover:bg-amber-100/80 hover:shadow-sm"
                title="승인 대기 건 확인"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-xs">
                    {pendingApprovals.length}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    처리 대기 승인 {pendingApprovals.length}건
                  </p>
                  <p className="text-[11px] text-amber-700">전자 결재함에서 검토</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mb-4">
          <h1 className="text-lg font-bold text-slate-900">사내 업무 앱</h1>
          <p className="text-xs text-slate-500 mt-1">활성 기능만 표시됩니다. 숨긴 기능은 설정에서 켤 수 있습니다.</p>
        </section>
      )}

      <section>
        {variant === 'home' ? (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              사내 업무 앱 ({appTiles.length})
            </h2>
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {appTiles.map((app) => (
            <Link
              key={app.id}
              to={app.to}
              onClick={(e) => handleTileClick(app, e)}
              className="group relative flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg active:scale-95"
            >
              {app.badge ? (
                <span
                  className={`absolute top-3 right-3 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-xs ${
                    app.badgeColor || 'bg-rose-500 text-white'
                  }`}
                >
                  {app.badge}
                </span>
              ) : null}

              <div
                className={`relative mb-3.5 flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-[24px] bg-gradient-to-br ${app.gradient} shadow-md transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg`}
              >
                {app.icon}
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-t from-black/5 via-transparent to-white/20 pointer-events-none" />
              </div>

              <div className="w-full">
                <span className="block text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {app.label}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500 line-clamp-1">
                  {app.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {showApprovalModal && pendingApprovals.length > 0 ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">처리 대기 승인 목록</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="mt-4 space-y-2.5">
              {pendingApprovals.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      {item.domainLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.timeAgo}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">기안자: {item.requester}</p>
                  <div className="mt-3 flex justify-end">
                    <Link
                      to={item.to}
                      onClick={() => setShowApprovalModal(false)}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                    >
                      <span>결재함에서 검토</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** 단위 테스트용 타일 게이트 */
export function filterLauncherTilesForTest(
  tiles: CompanyAppTile[],
  enabledCaps: readonly string[]
): CompanyAppTile[] {
  return tiles.filter((t) => tileAllowed(t, enabledCaps));
}

export { resolveEnabledCaps, tileAllowed };
