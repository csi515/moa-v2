import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OrganizationTreePage } from '../organization/OrganizationTreePage';
import { StorageService } from '@/services/storage';
import {
  assignOrganizationRole,
  deleteDynamicRole,
  listDynamicRoles,
  listRoleMembers,
  saveDynamicRole,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  canManageRoles,
  EMPTY_ROLE_PERMISSIONS,
  normalizeRolePermissions,
  type RolePermissionMap,
} from '@/domain/permissions';
import {
  getPermissionDictionaryGroups,
  listEnabledPermissionLabels,
} from '@/domain/permissionCatalog';
import { resolveActiveCapabilityIds } from '@/domain/permissionVisibility';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { OwnershipTransferCard } from './OwnershipTransferCard';

type RoleRow = DynamicRoleRow;
type MemberRow = DynamicMemberRow;

function memberDisplayName(member: MemberRow): string {
  return member.name || member.email || `${member.user_id.slice(0, 8)}…`;
}

export function AccessDeniedBanner() {
  return (
    <div
      role="alert"
      data-testid="forbidden-banner"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      403 Forbidden. 이 직급에는 해당 화면 권한이 없습니다.
    </div>
  );
}

export function FinanceRouteGate({ children }: { children: ReactNode }) {
  const { role } = useAuthorization();
  let flags = null;
  try {
    const stored = StorageService.getActiveUser()?.customRole?.permissions;
    flags = normalizeRolePermissions(stored);
  } catch {
    flags = null;
  }
  if (role !== 'owner' && flags && flags.billing_invoices !== true) {
    return <AccessDeniedBanner />;
  }
  return <>{children}</>;
}

export function DynamicRoleSettingsPage() {
  const navigate = useNavigate();
  const { currentOrganization, activeCapabilities, hiddenCapabilities } = useOrganization();
  const { role } = useAuthorization();
  const orgId = currentOrganization?.id ?? '';
  const placeLabel = getPlaceLabel(currentOrganization?.industry_type);
  const isCorporate =
    currentOrganization?.industry_type === 'corporate' ||
    currentOrganization?.industry_type === 'enterprise';

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<RolePermissionMap>(EMPTY_ROLE_PERMISSIONS);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingTab, setSettingTab] = useState<'org' | 'roles'>(() =>
    isCorporate ? 'org' : 'roles'
  );
  const [dictOpen, setDictOpen] = useState(true);

  const isOwner = role === 'owner';
  const activeUser = StorageService.getActiveUser();
  const canManage = isOwner || canManageRoles(activeUser);
  const scopedCapIds = useMemo(
    () => resolveActiveCapabilityIds(activeCapabilities, hiddenCapabilities),
    [activeCapabilities, hiddenCapabilities]
  );
  const dictionary = getPermissionDictionaryGroups(scopedCapIds);

  async function reload() {
    if (!orgId) return;
    try {
      setRoles(await listDynamicRoles(orgId));
      setMembers(await listRoleMembers(orgId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조회에 실패했습니다.');
    }
  }

  useEffect(() => {
    void reload();
  }, [orgId]);

  async function saveRole() {
    if (!orgId || !name.trim()) return;
    try {
      await saveDynamicRole({
        organizationId: orgId,
        id: editingId,
        name: name.trim(),
        permissions,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.');
      return;
    }
    setOpen(false);
    setEditingId(null);
    setName('');
    setPermissions(EMPTY_ROLE_PERMISSIONS);
    await reload();
  }

  async function removeRole(roleRow: RoleRow) {
    if (roleRow.is_system) return;
    try {
      await deleteDynamicRole(roleRow.id);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '삭제에 실패했습니다.');
    }
  }

  async function assign(memberId: string, roleId: string) {
    try {
      await assignOrganizationRole(memberId, roleId || null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '배정에 실패했습니다.');
    }
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/workspace');
    }
  };

  if (!canManage) return <AccessDeniedBanner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div>
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{placeLabel ? `${placeLabel} 설정으로 돌아가기` : '설정으로 돌아가기'}</span>
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSettingTab('roles')}
          className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-all cursor-pointer ${
            settingTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          직급 및 권한 매트릭스
        </button>
        <button
          type="button"
          onClick={() => setSettingTab('org')}
          className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-all cursor-pointer ${
            settingTab === 'org'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          조직도·부서 관리
        </button>
      </div>

      {settingTab === 'org' ? (
        <section>
          <OrganizationTreePage />
        </section>
      ) : (
        <>
          <header className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">직급 및 권한 관리</h1>
              <p className="text-sm text-slate-500">
                위임 가능 권한 종류와 직급별 배정자를 확인할 수 있습니다.
              </p>
            </div>
            {isOwner ? (
              <button
                type="button"
                className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white cursor-pointer"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setPermissions(EMPTY_ROLE_PERMISSIONS);
                  setOpen(true);
                }}
              >
                + 새 직급 만들기
              </button>
            ) : null}
          </header>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <section
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            data-testid="permission-dictionary"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between text-left cursor-pointer"
              onClick={() => setDictOpen((v) => !v)}
            >
              <div>
                <h2 className="text-base font-bold text-slate-900">위임 가능 권한 사전</h2>
                <p className="text-xs text-slate-500">
                  조직에서 직급에 부여할 수 있는 권한 종류와 설명입니다.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {dictOpen ? '접기' : '펼치기'}
              </span>
            </button>
            {dictOpen ? (
              <div className="mt-4 space-y-4">
                {dictionary.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {group.title}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {group.items.map((item) => (
                        <li
                          key={item.key}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                          <p className="mt-1 font-mono text-[10px] text-slate-400">{item.key}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <ul className="space-y-3">
            {roles.map((roleRow) => {
              const assignees = members.filter(
                (member) => member.organization_role_id === roleRow.id
              );
              const enabled = listEnabledPermissionLabels(roleRow.permissions, scopedCapIds);
              return (
                <li key={roleRow.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{roleRow.name}</p>
                      <p className="text-xs text-slate-500">배정 {assignees.length}명</p>
                    </div>
                    {isOwner ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="min-h-11 px-3 text-sm cursor-pointer"
                          onClick={() => {
                            setEditingId(roleRow.id);
                            setName(roleRow.name);
                            setPermissions(roleRow.permissions);
                            setOpen(true);
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="min-h-11 px-3 text-sm text-rose-600 cursor-pointer"
                          disabled={roleRow.is_system}
                          onClick={() => void removeRole(roleRow)}
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {enabled.length === 0 ? (
                      <span className="text-xs text-slate-400">활성 권한 없음</span>
                    ) : (
                      enabled.map((item) => (
                        <span
                          key={item.key}
                          title={item.key}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
                        >
                          {item.label}
                        </span>
                      ))
                    )}
                  </div>
                  {assignees.length > 0 ? (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold text-slate-600">배정된 직원</p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {assignees.map((member) => (
                          <li
                            key={member.id}
                            className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-800 border border-slate-200"
                          >
                            {memberDisplayName(member)}
                            {member.role === 'owner' ? ' (사업주)' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">이 직급에 배정된 직원이 없습니다.</p>
                  )}
                </li>
              );
            })}
          </ul>

          <section>
            <h2 className="mb-2 text-base font-bold">직원 직급 지정</h2>
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-100 px-3"
                >
                  <span className="text-sm">
                    {member.role === 'owner' ? '사업주' : memberDisplayName(member)}
                  </span>
                  <select
                    className="min-h-11 rounded-lg border px-2 text-sm"
                    aria-label="직급 지정"
                    value={member.organization_role_id ?? ''}
                    disabled={member.role === 'owner'}
                    onChange={(event) => void assign(member.id, event.target.value)}
                  >
                    <option value="">직급 없음</option>
                    {roles.map((roleOption) => (
                      <option key={roleOption.id} value={roleOption.id}>
                        {roleOption.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>

          <section className="pt-4">
            <OwnershipTransferCard />
          </section>
        </>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <h2 className="text-lg font-bold">{editingId ? '직급 수정' : '새 직급'}</h2>
            <label className="mt-3 block text-sm">
              직급명
              <input
                className="mt-1 min-h-11 w-full rounded-lg border px-3"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="mt-4">
              <RolePermissionMatrix
                value={permissions}
                onChange={setPermissions}
                activeCapabilityIds={scopedCapIds}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="min-h-11 px-4 cursor-pointer" onClick={() => setOpen(false)}>
                닫기
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-slate-900 px-4 text-white cursor-pointer"
                onClick={() => void saveRole()}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
