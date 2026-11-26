import React, { useEffect, useState, useMemo } from 'react';
import { CanAccess } from '@refinedev/core';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  KeyRound,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  listDynamicRoles,
  listRoleMembers,
  assignOrganizationRole,
  grantMemberFeaturePermission,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';
import { OwnershipTransferCard } from '@/pages/settings/OwnershipTransferCard';
import { listAuditLogs } from '@/core/audit';
import type { AuditLog } from '@/core/audit/types';
import { StorageService } from '@/services/storage';
import { canManageRoles } from '@/domain/permissions';
import { listEnabledPermissionLabels } from '@/domain/permissionCatalog';
import { resolveActiveCapabilityIds } from '@/domain/permissionVisibility';

function formatAuditAction(action: string): string {
  if (action === 'ROLE_ASSIGNED') return '직급 부여';
  if (action === 'ROLE_REVOKED') return '권한 회수';
  return action;
}

export function MemberList(): React.JSX.Element {
  const { currentOrganization, activeCapabilities, hiddenCapabilities } = useOrganization();
  const { role: callerRole } = useAuthorization();
  const orgId = currentOrganization?.id ?? '';
  const scopedCapIds = useMemo(
    () => resolveActiveCapabilityIds(activeCapabilities, hiddenCapabilities),
    [activeCapabilities, hiddenCapabilities]
  );

  const [members, setMembers] = useState<DynamicMemberRow[]>([]);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedPermMemberIds, setExpandedPermMemberIds] = useState<Set<string>>(new Set());
  const [roleAuditLogs, setRoleAuditLogs] = useState<AuditLog[]>([]);

  // 직급 부여/변경 모달 상태
  const [assignTarget, setAssignTarget] = useState<DynamicMemberRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 권한 회수(강등) 컨펌 모달 상태
  const [revokeTarget, setRevokeTarget] = useState<DynamicMemberRow | null>(null);

  // 직무 기능 권한 토글 모달 상태
  const [featureTarget, setFeatureTarget] = useState<DynamicMemberRow | null>(null);
  const [featureSavingKey, setFeatureSavingKey] = useState<string | null>(null);

  const FEATURE_ASSIGNMENT_OPTIONS = [
    { key: 'resources:manage', label: '공용자원/총무 담당', desc: '회의실·업무차량 자원 등록 및 승인' },
    { key: 'volunteer:manage', label: '봉사활동 담당', desc: '봉사 프로그램 개설 및 신청자 확정' },
    { key: 'grievances_manage', label: '노경 건의함 담당', desc: '고충 건의함 열람 및 답변 등록' },
    { key: 'shuttle:manage', label: '통근 셔틀 담당', desc: '셔틀 노선 및 배차 스케줄 관리' },
    { key: 'office_supply_request:manage', label: '사무 소모품 담당', desc: '소모품 신청 검토 및 재고 불출' },
    { key: 'meal_survey:manage', label: '식수인원 조사 담당', desc: '식사 슬롯·식수 현황 관리' },
    { key: 'safety:manage', label: '현장 안전/SOP 담당', desc: '위험성평가 및 작업표준 관리' },
  ] as const;

  const activeUser = StorageService.getActiveUser();
  const canViewRoleAudit =
    callerRole === 'owner' || canManageRoles(activeUser);

  async function loadData() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoles, fetchedMembers] = await Promise.all([
        listDynamicRoles(orgId),
        listRoleMembers(orgId),
      ]);
      setRoles(fetchedRoles);
      setMembers(fetchedMembers);

      if (canViewRoleAudit) {
        try {
          const logs = await listAuditLogs({
            organizationId: orgId,
            entityType: 'permissions',
            limit: 20,
          });
          setRoleAuditLogs(
            logs.filter(
              (log) =>
                log.action === 'ROLE_ASSIGNED' ||
                log.action === 'ROLE_REVOKED' ||
                log.action === 'role_changed' ||
                log.action === 'granted' ||
                log.action === 'revoked'
            )
          );
        } catch {
          setRoleAuditLogs([]);
        }
      } else {
        setRoleAuditLogs([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [orgId]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const idMatch = m.user_id.toLowerCase().includes(q);
      const emailMatch = m.email?.toLowerCase().includes(q);
      const nameMatch = m.name?.toLowerCase().includes(q);
      const roleName = roles.find((r) => r.id === m.organization_role_id)?.name.toLowerCase() ?? '';
      return idMatch || emailMatch || nameMatch || roleName.includes(q);
    });
  }, [members, roles, search]);

  async function handleAssignRole() {
    if (!assignTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignOrganizationRole(
        assignTarget.id,
        selectedRoleId || null,
        assignReason.trim() || '총무/운영 위임 관리자 직급 부여'
      );
      setSuccessMessage(`${assignTarget.name || assignTarget.user_id.slice(0, 8)} 님의 직급이 성공적으로 부여되었습니다.`);
      setAssignTarget(null);
      setSelectedRoleId('');
      setAssignReason('');
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '직급 부여 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeRole() {
    if (!revokeTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignOrganizationRole(
        revokeTarget.id,
        null,
        '권한 회수 (기본 사원으로 강등 및 세션 즉시 만료)'
      );
      setSuccessMessage(`${revokeTarget.name || revokeTarget.user_id.slice(0, 8)} 님의 권한이 회수되었으며 세션이 즉시 만료되었습니다.`);
      setRevokeTarget(null);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '권한 회수 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6" data-testid="member-list-page">
      {/* 상단 헤더 */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-800" />
            <h1 className="text-2xl font-black text-slate-900">사원 및 권한 관리</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              총 {members.length}명
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            사내 직원의 직급과 세부 업무 권한을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </header>

      {/* 상태 알림 배너 */}
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">오류 안내</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-bold">처리 완료</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 이메일, 사번 또는 직급명으로 검색..."
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {/* 사원 목록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">직원 정보</th>
                <th className="px-5 py-3.5">기본 역할</th>
                <th className="px-5 py-3.5">배정 직급</th>
                <th className="px-5 py-3.5">상태</th>
                <th className="px-5 py-3.5 text-right">권한 관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    {loading ? '직원 목록을 불러오는 중입니다...' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const assignedRole = roles.find((r) => r.id === member.organization_role_id);
                  const isOwner = member.role === 'owner';

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-slate-50/60">
                      {/* 직원 정보 */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                            {(member.name || member.email || member.user_id)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {member.name || member.email || `사원 (${member.user_id.slice(0, 8)})`}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              ID: {member.user_id.slice(0, 13)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 기본 역할 */}
                      <td className="px-5 py-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            <Shield className="h-3 w-3" />
                            대표 사업자
                          </span>
                        ) : member.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                            관리자
                          </span>
                        ) : member.role === 'instructor' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                            강사
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            일반 직원
                          </span>
                        )}
                      </td>

                      {/* 배정 직급 */}
                      <td className="px-5 py-4">
                        {assignedRole ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                              <ShieldCheck className="h-3 w-3 text-slate-800" />
                              {assignedRole.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {assignedRole.description || '지정 직급'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            미배정 (기본 사원)
                          </span>
                        )}
                        {/* 회원별 개별 기능 권한 칩 */}
                        {member.feature_permissions && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(member.feature_permissions)
                              .filter(([_, enabled]) => Boolean(enabled))
                              .map(([k]) => {
                                const opt = FEATURE_ASSIGNMENT_OPTIONS.find((f) => f.key === k);
                                if (!opt) return null;
                                return (
                                  <span
                                    key={k}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/60"
                                  >
                                    <span>⚙️</span>
                                    <span>{opt.label.replace(' 담당', '')}</span>
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </td>

                      {/* 상태 */}
                      <td className="px-5 py-4">
                        {member.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            활성
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            비활성
                          </span>
                        )}
                      </td>

                      {/* 권한 관리 액션 (Refine CanAccess 가드 적용) */}
                      <td className="px-5 py-4 text-right">
                        <CanAccess
                          resource="members"
                          action="assign_role"
                          fallback={
                            <span className="text-xs font-medium text-slate-400">
                              조회 전용 (수정 권한 없음)
                            </span>
                          }
                        >
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                              사업자 보호 (변경 불가)
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignTarget(member);
                                  setSelectedRoleId(member.organization_role_id ?? '');
                                  setAssignReason('');
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                {member.organization_role_id ? '직급 변경' : '직급 부여'}
                              </button>

                              {member.organization_role_id ? (
                                <button
                                  type="button"
                                  onClick={() => setRevokeTarget(member)}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                                >
                                  <UserX className="h-3.5 w-3.5 text-rose-600" />
                                  권한 회수
                                </button>
                              ) : null}
                            </div>
                          )}
                        </CanAccess>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* 직급 부여/변경 모달 */}
      {/* ------------------------------------------------------------------------ */}
      {assignTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-slate-800" />
                <h2 className="text-lg font-bold text-slate-900">직급 부여 및 업무 권한 위임</h2>
              </div>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>
                <strong className="text-slate-800">대상 직원:</strong>{' '}
                {assignTarget.name || assignTarget.email || assignTarget.user_id}
              </p>
              <p className="font-mono text-[11px] text-slate-400">
                User ID: {assignTarget.user_id}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                부여할 직급 선택
              </label>
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                <option value="">-- 직급 선택 (미배정 해제) --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.description ? `(${role.description})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedRole ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-2">
                <p className="font-bold text-slate-900">포함된 세부 권한:</p>
                <div className="flex flex-wrap gap-1">
                  {listEnabledPermissionLabels(selectedRole.permissions, scopedCapIds).map((item) => (
                    <span
                      key={item.key}
                      title={item.key}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-800"
                    >
                      ✓ {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-slate-700">
                위임 및 부여 사유 (감사 로그용)
              </label>
              <input
                type="text"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="예: 2026 하반기 기업 총무팀 위임 관리자 지정"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                disabled={submitting}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleAssignRole()}
                disabled={submitting}
                className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? '처리 중...' : '직급 부여 완료'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------------ */}
      {/* 권한 회수 (기본 사원으로 강등) 컨펌 모달 */}
      {/* ------------------------------------------------------------------------ */}
      {revokeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">권한 회수 (기본 사원으로 강등)</h2>
                <p className="text-xs text-slate-500 font-mono">
                  대상: {revokeTarget.name || revokeTarget.email || revokeTarget.user_id}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              권한을 회수하면 해당 직원의 세션이 즉시 만료되며 기본 사원 권한으로 전환됩니다.
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              DB 레벨에서 <code className="font-bold text-slate-700">token_version</code>이 즉시 증가하여,
              해당 직원이 보유 중이던 기존 JWT 토큰은 즉각 무효화(403 차단)됩니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                disabled={submitting}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleRevokeRole()}
                disabled={submitting}
                className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? '회수 처리 중...' : '권한 회수 및 세션 즉시 파기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canViewRoleAudit ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
          data-testid="role-delegation-audit"
        >
          <h2 className="text-base font-bold text-slate-900">최근 직급 부여·회수 이력</h2>
          <p className="mt-1 text-xs text-slate-500">
            누구에게 어떤 직급이 부여·회수되었는지 최근 기록을 확인합니다.
          </p>
          {roleAuditLogs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">최근 이력이 없습니다.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {roleAuditLogs.map((log) => {
                const after = log.afterData ?? {};
                const targetId =
                  typeof after.target_member_id === 'string'
                    ? after.target_member_id
                    : log.entityId;
                const targetMember = members.find((m) => m.id === targetId);
                const roleId =
                  typeof after.assigned_role_id === 'string' ? after.assigned_role_id : null;
                const roleName = roleId
                  ? roles.find((r) => r.id === roleId)?.name
                  : null;
                const reason =
                  typeof after.reason === 'string' && after.reason.trim()
                    ? after.reason
                    : null;
                return (
                  <li key={log.id} className="py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {formatAuditAction(log.action)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {targetMember?.name ||
                          targetMember?.email ||
                          (targetId ? `${String(targetId).slice(0, 8)}…` : '대상 미상')}
                      </span>
                      {roleName ? (
                        <span className="text-xs text-slate-700">→ {roleName}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                      {reason ? ` · ${reason}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* CEO 대표 사업자 소유권 이전 관리 카드 (대표 전용) */}
      <section className="pt-6">
        <OwnershipTransferCard />
      </section>
    
      {/* ------------------------------------------------------------------------ */}
      {/* 회원별 직무 기능 권한(총무/봉사/노경/셔틀 등) 개별 토글 모달 */}
      {/* ------------------------------------------------------------------------ */}
      {featureTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  직무 기능 권한 배정
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  대상: <span className="font-semibold text-slate-800">{featureTarget.name || featureTarget.email}</span> (직급과 무관하게 독립 부여)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeatureTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {FEATURE_ASSIGNMENT_OPTIONS.map((feat) => {
                const isEnabled = Boolean(featureTarget.feature_permissions?.[feat.key]);
                const isBusy = featureSavingKey === feat.key;

                return (
                  <label
                    key={feat.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isEnabled
                        ? 'border-indigo-500 bg-slate-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={isBusy}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        setFeatureSavingKey(feat.key);
                        try {
                          await grantMemberFeaturePermission(featureTarget.id, feat.key, checked);
                          // 로컬 상태 동기화
                          const updated = {
                            ...featureTarget,
                            feature_permissions: {
                              ...(featureTarget.feature_permissions || {}),
                              [feat.key]: checked,
                            },
                          };
                          setFeatureTarget(updated);
                          setMembers((prev) =>
                            prev.map((m) => (m.id === featureTarget.id ? updated : m))
                          );
                          setSuccessMessage(`'${feat.label}' 권한이 ${checked ? '부여' : '회수'}되었습니다.`);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : '권한 변경에 실패했습니다.');
                        } finally {
                          setFeatureSavingKey(null);
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{feat.label}</span>
                        {isBusy && <span className="text-[10px] text-slate-800 font-normal">저장 중...</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {feat.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setFeatureTarget(null)}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

