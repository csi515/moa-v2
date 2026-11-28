import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { ArrowLeft, Warehouse } from 'lucide-react';
import { useList } from '@refinedev/core';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { PageHeader, EmptyState } from '@/shared/components';
import { Button, FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import { cn } from '@/shared/lib/utils';
import { stockLocationService, type StockLocation } from '@/capabilities/commerce/stock';
import { INVENTORY_LIST_COPY as COPY } from '../inventory/inventoryListCopy';
import { RETAIL_POINTS_COPY as SETTINGS } from './retailPointsCopy';

interface Props {
  onBack: () => void;
}

export const RetailWarehouseSettingsView: FC<Props> = ({ onBack }) => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { query: deptQuery } = useList<{ id: string; name: string }>({
    resource: 'departments',
    meta: { schema: 'core' },
    sorters: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled: Boolean(orgId) },
  });
  const departments = (deptQuery?.data?.data as { id: string; name: string }[]) ?? [];

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const list = await stockLocationService.listLocations(orgId, { includeInactive: true });
      setLocations(list);
      setDrafts(Object.fromEntries(list.map((loc) => [loc.id, loc.name])));
    } catch (err) {
      showToast.error(err, COPY.warehouseLoadError);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const addWarehouse = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgId || busyId) return;
    const name = newName.trim();
    if (!name) {
      showToast(COPY.addDeptLocationNeedName, 'error');
      return;
    }
    setBusyId('new');
    try {
      await stockLocationService.createNamedLocation({
        organizationId: orgId,
        name,
        departmentId: departmentId || null,
      });
      setNewName('');
      setDepartmentId('');
      showToast(COPY.warehouseAdded, 'success');
      await load();
    } catch (err) {
      showToast.error(err, COPY.addDeptLocationError);
    } finally {
      setBusyId(null);
    }
  };

  const saveName = async (loc: StockLocation) => {
    if (!orgId || busyId) return;
    setBusyId(loc.id);
    try {
      await stockLocationService.renameLocation(orgId, loc.id, drafts[loc.id] ?? loc.name);
      showToast(COPY.warehouseRenamed, 'success');
      await load();
    } catch (err) {
      showToast.error(err, COPY.warehouseSaveError);
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (loc: StockLocation) => {
    if (!orgId || busyId) return;
    setBusyId(loc.id);
    try {
      await stockLocationService.setLocationActive(orgId, loc.id, !loc.isActive);
      showToast(loc.isActive ? COPY.warehouseDeactivated : COPY.warehouseActivated, 'success');
      await load();
    } catch (err) {
      showToast.error(err, COPY.warehouseSaveError);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={cn(DESKTOP_CONTAINERS.form, 'space-y-4 pb-8')}>
      <PageHeader
        density="compact"
        icon={<Warehouse className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={SETTINGS.menuWarehouses}
        description={COPY.warehouseSettingsHint}
        actions={
          <Button type="button" variant="ghost" size="default" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {SETTINGS.back}
          </Button>
        }
      />

      {!orgId ? (
        <p className="text-sm text-slate-500">{SETTINGS.noOrg}</p>
      ) : (
        <>
          <form onSubmit={(e) => void addWarehouse(e)} className="space-y-3">
            <FormField label={COPY.addDeptLocationName} required>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 매장 창고, 냉장 창고"
                className={`${FORM_CONTROL_CLASS} min-h-[44px] text-base`}
              />
            </FormField>
            {departments.length > 0 ? (
              <FormField label={COPY.addDeptLocationDept}>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={`${FORM_CONTROL_CLASS} min-h-[44px] text-base`}
                >
                  <option value="">부서 없이 매장 창고</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              size="default"
              disabled={!newName.trim()}
              isLoading={busyId === 'new'}
            >
              {COPY.addDeptLocationSubmit}
            </Button>
          </form>

          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">불러오는 중…</p>
          ) : locations.length === 0 ? (
            <EmptyState
              icon={<Warehouse className="w-10 h-10" />}
              title={COPY.warehouseEmptyTitle}
              description={COPY.warehouseEmptyDescription}
            />
          ) : (
            <ul className="space-y-2">
              {locations.map((loc) => (
                <li key={loc.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={drafts[loc.id] ?? loc.name}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [loc.id]: e.target.value }))}
                      aria-label={`${loc.name} 이름`}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px] text-base flex-1`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="default"
                        onClick={() => void saveName(loc)}
                        disabled={busyId === loc.id || !(drafts[loc.id] ?? '').trim()}
                        isLoading={busyId === loc.id}
                      >
                        {COPY.warehouseSaveName}
                      </Button>
                      {loc.code === 'central' ? null : (
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => void toggle(loc)}
                          disabled={busyId === loc.id}
                        >
                          {loc.isActive ? COPY.warehouseDeactivate : COPY.warehouseActivate}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {loc.code === 'central'
                      ? COPY.warehouseCentralNote
                      : loc.isActive
                        ? COPY.warehouseActive
                        : COPY.warehouseInactive}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
