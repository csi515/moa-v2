import React, { useCallback, useEffect, useState } from 'react';
import { Car, Plus, Power } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { evaluateMemberAccess } from '@/domain/permissions';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { listResources, setResourceActive, upsertBookableResource } from '../resourceService';
import type { Resource } from '../types';
import { showToast } from '@/shared/feedback/uiFeedback';

export const VEHICLE_RESOURCE_KIND = 'vehicle';

function useCanManageResources(): boolean {
  const user = useActiveUser();
  try {

    const member = {
      role: user?.role === 'owner' ? 'owner' : 'staff',
      customRole: { permissions: user?.customRole?.permissions ?? null },
    };
    return evaluateMemberAccess(member, 'resources_manage', 'write');
  } catch {
    return false;
  }
}

/** 공용차량 목록·등록. 등록은 resources_manage(총무)만. */
export function SharedVehicleCatalogView() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const canWrite = useCanManageResources();

  const [rows, setRows] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const list = await listResources({ organizationId: orgId, kind: VEHICLE_RESOURCE_KIND });
      setRows(list);
    } catch (err) {
      showToast.error(err, '차량 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setSaving(true);
    try {
      await upsertBookableResource({
        organizationId: orgId,
        kind: VEHICLE_RESOURCE_KIND,
        name: name.trim(),
        capacity: 1,
        openTime: '00:00',
        closeTime: '23:59',
        memo: memo.trim() || undefined,
      });
      showToast('공용차량이 등록되었습니다.', 'success');
      setName('');
      setMemo('');
      setFormOpen(false);
      await load();
    } catch (err) {
      showToast.error(err, '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Resource) => {
    if (!orgId || !canWrite) return;
    try {
      await setResourceActive(orgId, row.id, !row.active);
      await load();
    } catch (err) {
      showToast.error(err, '상태 변경 실패');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4" data-testid="shared-vehicle-catalog">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Car className="h-6 w-6" aria-hidden />
            공용차량·자원
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {canWrite
              ? '차량을 등록하면 직원이 예약 화면에서 이용할 수 있습니다.'
              : '등록된 공용차량 목록입니다. 예약은 「예약·공간」에서 진행하세요.'}
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
            onClick={() => setFormOpen((v) => !v)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            차량 추가
          </button>
        ) : null}
      </div>

      {formOpen && canWrite ? (
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            차량명
            <input
              className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 1호 업무용 승용차"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            메모 (선택)
            <input
              className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 px-3"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="번호판·비고"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? '저장 중…' : '등록'}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          등록된 공용차량이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{row.name}</p>
                {row.memo ? <p className="text-xs text-slate-500">{row.memo}</p> : null}
                <p className="text-xs text-slate-400">{row.active ? '이용 가능' : '비활성'}</p>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                  onClick={() => void toggleActive(row)}
                  aria-label={row.active ? '비활성화' : '활성화'}
                >
                  <Power className={`h-4 w-4 ${row.active ? 'text-emerald-600' : 'text-slate-400'}`} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SharedVehicleCatalogView;
