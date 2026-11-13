import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCreate, useDelete, useList } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { canManageResourceCatalog } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { listBookableResources, upsertBookableResource } from '@/capabilities/resources';
import type { ResourceCategory } from '@/capabilities/resources';
import { UniversalResourceCalendarView } from '@/capabilities/resources';
import { showToast } from '@/shared/feedback/uiFeedback';
import { filterRowsByMemberDepartmentScope } from '@/core/organizations/departmentScope';
import { useWorkspaceMemberScope } from './useWorkspaceMemberScope';

type ResourceTypeRow = {
  id: string;
  organization_id: string;
  name: string;
  category: 'EQUIPMENT' | 'SPACE';
  kind_slug: string;
  requires_approval: boolean;
  spec_schema: unknown;
  department_id?: string | null;
};

type TabId = 'bookings' | 'catalog' | 'instances';

const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '20:00';

function slugifyKind(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base.length >= 2 ? base : `resource_${Date.now()}`;
}

/** resource_types.category → 캘린더 메타 category */
function mapTypeCategoryToMeta(category: 'EQUIPMENT' | 'SPACE'): ResourceCategory {
  return category === 'SPACE' ? 'meeting_room' : 'vehicle';
}

export const WorkspaceResourcesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const memberScope = useWorkspaceMemberScope();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const defaultRequiresApproval = settings?.resource_types_require_approval_default === true;
  const orgId = currentOrganization?.id ?? null;
  const active = StorageService.getActiveUser();
  const canManage = canManageResourceCatalog({
    role: active?.role === 'owner' ? 'owner' : 'staff',
    customRole: { permissions: active?.customRole?.permissions ?? null },
  });

  const [tab, setTab] = useState<TabId>('bookings');
  const [instances, setInstances] = useState<Awaited<ReturnType<typeof listBookableResources>>>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);

  const [typeName, setTypeName] = useState('');
  const [typeCategory, setTypeCategory] = useState<'EQUIPMENT' | 'SPACE'>('SPACE');
  const [requiresApproval, setRequiresApproval] = useState(defaultRequiresApproval);

  useEffect(() => {
    setRequiresApproval(defaultRequiresApproval);
  }, [defaultRequiresApproval]);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState('');

  const { query: typesQuery } = useList<ResourceTypeRow>({
    resource: 'resource_types',
    meta: { schema: 'core' },
    sorters: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const typesRaw = (typesQuery?.data?.data as ResourceTypeRow[]) ?? [];
  const types = useMemo(() => {
    if (memberScope.isGlobalScope) return typesRaw;
    return filterRowsByMemberDepartmentScope(typesRaw, {
      scopeType: memberScope.scopeType,
      memberDepartmentId: memberScope.memberDepartmentId,
      memberPath: memberScope.memberPath,
      departmentPathById: memberScope.departmentPathById,
    });
  }, [typesRaw, memberScope]);
  const { mutate: createType } = useCreate();
  const { mutate: deleteType } = useDelete();

  const reloadInstances = useCallback(async () => {
    if (!orgId) return;
    setLoadingInstances(true);
    try {
      const rows = await listBookableResources({
        organizationId: orgId,
        kind: selectedKind ?? undefined,
      });
      setInstances(rows);
    } catch (cause) {
      showToast.error(cause, '자원 목록 조회 실패');
    } finally {
      setLoadingInstances(false);
    }
  }, [orgId, selectedKind]);

  useEffect(() => {
    void reloadInstances();
  }, [reloadInstances]);

  const filteredTypes = useMemo(() => types, [types]);

  const selectedTypeRow = useMemo(
    () => filteredTypes.find((t) => t.kind_slug === selectedKind) ?? null,
    [filteredTypes, selectedKind],
  );

  const handleAddType = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId || !canManage) return;
    const name = typeName.trim();
    if (!name) return;
    const kind_slug = slugifyKind(name);
    createType(
      {
        resource: 'resource_types',
        values: {
          organization_id: orgId,
          name,
          category: typeCategory,
          kind_slug,
          requires_approval: requiresApproval,
          spec_schema: [],
        },
        meta: { schema: 'core' },
      },
      {
        onSuccess: () => {
          setTypeName('');
          showToast('자원 종류가 등록되었습니다. 인스턴스 탭에서 실물을 등록하세요.', 'success');
          void typesQuery?.refetch?.();
          setSelectedKind(kind_slug);
        },
        onError: () => showToast('자원 종류 등록에 실패했습니다.', 'error'),
      },
    );
  };

  const handleAddInstance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId || !selectedKind || !instanceName.trim()) return;
    const typeRow = selectedTypeRow;
    try {
      await upsertBookableResource({
        organizationId: orgId,
        kind: selectedKind,
        name: instanceName.trim(),
        capacity: 1,
        openTime: DEFAULT_OPEN,
        closeTime: DEFAULT_CLOSE,
        metadata: {
          category: typeRow ? mapTypeCategoryToMeta(typeRow.category) : 'other',
          // v1 예약은 즉시 확정. 플래그는 후속 승인제 연동용으로만 저장.
          require_approval: typeRow?.requires_approval === true,
        },
      });
      setInstanceName('');
      showToast('자원 인스턴스가 저장되었습니다.', 'success');
      await reloadInstances();
    } catch (cause) {
      showToast.error(cause, '저장 실패');
    }
  };

  const tabLabel: Record<TabId, string> = {
    bookings: '예약·현황',
    catalog: '자원 종류',
    instances: '인스턴스',
  };

  return (
    <main className="mx-auto max-w-6xl p-4 pb-12">
      <div className="mb-4">
        <Link
          to="/workspace/intranet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>사내 앱 런처로 돌아가기</span>
        </Link>
      </div>
      <h1 className="text-lg font-semibold text-slate-900">공용 자원 (건강관리실, 차량 예약)</h1>
      <p className="mt-1 text-sm text-slate-600">
        건강관리실 이용 및 업무용 법인 차량 배차를 예약하고, 총무는 자원 종류·인스턴스를 관리합니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['bookings', 'catalog', 'instances'] as TabId[]).map((id) => {
          if ((id === 'catalog' || id === 'instances') && !canManage && id === 'catalog') {
            // 종류 탭은 조회는 가능, 쓰기는 canManage
          }
          return (
            <button
              key={id}
              type="button"
              className={`min-h-12 flex-1 rounded-xl border px-3 text-sm font-medium sm:flex-none sm:px-5 ${
                tab === id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white'
              }`}
              onClick={() => setTab(id)}
            >
              {tabLabel[id]}
            </button>
          );
        })}
      </div>

      {tab === 'bookings' ? (
        <section className="mt-6">
          {orgId ? (
            <UniversalResourceCalendarView
              compact
              hideApprovalInbox
              hideMasterButton
              bookingMode="member"
            />
          ) : (
            <p className="text-sm text-slate-500">조직을 선택하세요.</p>
          )}
        </section>
      ) : null}

      {tab === 'catalog' ? (
        <section className="mt-6 mx-auto max-w-3xl space-y-4">
          {canManage ? (
            <form onSubmit={handleAddType} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium">자원 종류 추가</label>
              <input
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
                placeholder="예: 법인차량, 건강관리실 A"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
              />
              <select
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
                value={typeCategory}
                onChange={(e) => setTypeCategory(e.target.value as 'EQUIPMENT' | 'SPACE')}
              >
                <option value="SPACE">공간 (SPACE)</option>
                <option value="EQUIPMENT">장비 (EQUIPMENT)</option>
              </select>
              <label className="flex min-h-12 items-center gap-2 text-sm text-slate-500">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300"
                />
                예약 시 결재 필요 (v1에서는 저장만, 예약은 즉시 확정)
              </label>
              <button type="submit" className="min-h-12 w-full rounded-xl bg-indigo-600 text-white font-medium">
                등록
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              자원 종류 변경은 총무(resources_manage) 권한이 필요합니다.
            </p>
          )}

          <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
            {filteredTypes.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.category} · kind={row.kind_slug}
                    {row.requires_approval ? ' · 결재플래그' : ''}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-rose-200 px-4 text-sm text-rose-700"
                    onClick={() =>
                      deleteType(
                        { resource: 'resource_types', id: row.id, meta: { schema: 'core' } },
                        { onSuccess: () => void typesQuery?.refetch?.() },
                      )
                    }
                  >
                    삭제
                  </button>
                ) : null}
              </li>
            ))}
            {filteredTypes.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">등록된 자원 종류가 없습니다.</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {tab === 'instances' ? (
        <section className="mt-6 mx-auto max-w-3xl space-y-4">
          <select
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={selectedKind ?? ''}
            onChange={(e) => setSelectedKind(e.target.value || null)}
          >
            <option value="">자원 종류 선택</option>
            {filteredTypes.map((t) => (
              <option key={t.id} value={t.kind_slug}>
                {t.name}
              </option>
            ))}
          </select>

          {selectedKind && canManage ? (
            <form onSubmit={(e) => void handleAddInstance(e)} className="flex gap-2">
              <input
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3"
                placeholder="인스턴스 이름 (예: 1호 법인차)"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
              />
              <button type="submit" className="min-h-12 rounded-xl bg-slate-900 px-4 text-white text-sm">
                추가
              </button>
            </form>
          ) : null}
          {selectedKind ? (
            <p className="text-xs text-slate-500">
              운영 시간 기본값 {DEFAULT_OPEN}–{DEFAULT_CLOSE} (예약 슬롯과 맞춤)
            </p>
          ) : null}

          {loadingInstances ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}
          <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
            {instances.map((row) => (
              <li key={row.id} className="p-4">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.kind} · {row.open_time}–{row.close_time} ·{' '}
                  {row.is_active ? '사용 가능' : '비활성'}
                </p>
              </li>
            ))}
            {!loadingInstances && instances.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">표시할 자원이 없습니다.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </main>
  );
};
