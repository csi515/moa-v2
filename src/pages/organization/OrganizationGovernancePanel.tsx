import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

const SCOPE_OPTIONS: DepartmentScopeType[] = ['SELF_ONLY', 'DESCENDANTS', 'GLOBAL'];

export const SCOPE_LABELS: Record<DepartmentScopeType, { title: string; hint: string }> = {
  SELF_ONLY: {
    title: '해당 부서만 (기본 팀원/실무자)',
    hint: '소속된 해당 부서의 데이터만 열람 및 관리할 수 있습니다.',
  },
  DESCENDANTS: {
    title: '해당 부서 및 모든 하위 부서 (부서장/실장 권장)',
    hint: '본인 부서뿐 아니라 산하 하위 팀/파트의 데이터까지 포괄 관리합니다.',
  },
  GLOBAL: {
    title: '전사 전체 (대표이사/임원 전용)',
    hint: '조직도 트리 전체의 모든 부서 데이터를 포괄 관리합니다.',
  },
};

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

interface Props {
  isOwner: boolean;
  canManage: boolean;
  nodes: OrgNode[];
  members: DynamicMemberRow[];
  departmentMembers: DepartmentMemberRow[];
  roles: DynamicRoleRow[];
  selectedDepartmentId?: string | null;
  onAssignScope: (input: {
    departmentId: string;
    memberId: string;
    scopeType: DepartmentScopeType;
    customRoleId?: string | null;
  }) => Promise<void>;
  onRevokeRole: (memberId: string) => Promise<void>;
  onTransferOwnership: (nextOwnerMemberId: string, reason: string) => Promise<void>;
}

export const OrganizationGovernancePanel: React.FC<Props> = ({
  isOwner,
  canManage,
  nodes,
  members,
  departmentMembers,
  roles,
  selectedDepartmentId,
  onAssignScope,
  onRevokeRole,
  onTransferOwnership,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [customRoleId, setCustomRoleId] = useState('');
  const [scopeType, setScopeType] = useState<DepartmentScopeType>('SELF_ONLY');

  React.useEffect(() => {
    if (selectedDepartmentId) setDepartmentId(selectedDepartmentId);
  }, [selectedDepartmentId]);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const staffMembers = members.filter((member) => member.role !== 'owner');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('저장되었습니다. 권한 변경 시 재로그인이 필요할 수 있습니다.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const deptMemberRows = departmentId
    ? departmentMembers.filter((row) => row.department_id === departmentId)
    : departmentMembers;

  if (!canManage && !isOwner) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 lg:mt-0" aria-label="조직 권한 관리">
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {canManage ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">부서원 · 직급 · 스코프</h2>
          <label className="block text-sm">
            부서
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">선택</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            직원
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">선택</option>
              {staffMembers.map((member) => (
                <option key={member.id} value={member.id}>{memberLabel(member)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            직급 (organization_roles)
            <select
              className="mt-1 min-h-12 w-full rounded-lg border px-3"
              value={customRoleId}
              onChange={(event) => setCustomRoleId(event.target.value)}
            >
              <option value="">변경 없음</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">{ORG_CHART_COPY.scope}</span>
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
              value={scopeType}
              onChange={(event) => setScopeType(event.target.value as DepartmentScopeType)}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SCOPE_LABELS[option].title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-800">
              💡 {SCOPE_LABELS[scopeType].hint}
            </p>
          </label>
          <button
            type="button"
            disabled={busy || !departmentId || !memberId}
            className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm text-white disabled:opacity-40"
            onClick={() =>
              void run(() =>
                onAssignScope({
                  departmentId,
                  memberId,
                  scopeType,
                  customRoleId: customRoleId || null,
                }),
              )
            }
          >
            배정 (세션 갱신)
          </button>
          <ul className="space-y-2 text-xs text-slate-600">
            {deptMemberRows.map((row) => {
              const member = members.find((m) => m.id === row.member_id);
              const roleName = roles.find((r) => r.id === row.custom_role_id)?.name;
              return (
                <li key={row.id} className="min-h-10 rounded-lg bg-slate-50 px-2 py-2">
                  {member ? memberLabel(member) : row.member_id.slice(0, 8)} · {row.scope_type}
                  {roleName ? ` · ${roleName}` : ''}
                </li>
              );
            })}
            {deptMemberRows.length === 0 ? (
              <li className="text-slate-400">선택한 부서에 배정된 구성원이 없습니다.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">직급 회수</h2>
          <p className="text-xs text-amber-700">{ORG_CHART_COPY.revokeWarn}</p>
          <ul className="space-y-2">
            {staffMembers.map((member) => (
              <li key={member.id} className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-sm">{memberLabel(member)}</span>
                <button
                  type="button"
                  className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm text-rose-700"
                  disabled={busy}
                  onClick={() => setRevokeTarget(member.id)}
                >
                  권한 회수
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isOwner ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">{ORG_CHART_COPY.transferTitle}</h2>
          <label className="block text-sm">
            신임 사업자
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={transferTarget}
              onChange={(event) => setTransferTarget(event.target.value)}
            >
              <option value="">선택</option>
              {staffMembers.map((member) => (
                <option key={member.id} value={member.id}>{memberLabel(member)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {ORG_CHART_COPY.reason}
            <input
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            확인 문구 ({ORG_CHART_COPY.transferConfirm})
            <input
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              aria-label="소유권 이전 확인"
            />
          </label>
          <button
            type="button"
            disabled={
              busy ||
              !transferTarget ||
              !transferReason.trim() ||
              confirmText !== ORG_CHART_COPY.transferConfirm
            }
            className="min-h-11 rounded-lg bg-rose-700 px-4 text-sm text-white disabled:opacity-40"
            onClick={() => void run(() => onTransferOwnership(transferTarget, transferReason.trim()))}
          >
            {ORG_CHART_COPY.transferTitle}
          </button>
        </div>
      ) : null}

      <Modal
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="권한 회수 확인"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              className="min-h-11 px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              onClick={() => setRevokeTarget(null)}
            >
              취소
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50 cursor-pointer"
              disabled={busy}
              onClick={() => {
                const target = revokeTarget;
                setRevokeTarget(null);
                if (target) void run(() => onRevokeRole(target));
              }}
            >
              회수 실행
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-800">{ORG_CHART_COPY.revokeWarn}</p>
      </Modal>
    </section>
  );
};
