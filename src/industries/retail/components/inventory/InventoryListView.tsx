import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { cn } from '@/shared/lib/utils';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import {
  ArrowLeftRight,
  ClipboardCheck,
  PackagePlus,
  Settings,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import {
  Button,
  FilterBar,
  FilterTabs,
  FORM_CONTROL_CLASS,
  SearchField,
} from '@/shared/components/ui';
import {
  stockLocationService,
  type StockLocation,
} from '@/capabilities/commerce/stock';
import { useWorkspaceMemberScope } from '@/pages/workspace/useWorkspaceMemberScope';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { openRetailSettingsPanel } from '../settings/retailSettingsIntent';
import { SafetyStockEditor } from './SafetyStockEditor';
import {
  type InventoryStockFilter,
  type InventoryStockRow,
} from '../../types/inventory';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockInboundModal } from './StockInboundModal';
import { StockTransferModal } from './StockTransferModal';
import { StocktakeAuditModal } from './StocktakeAuditModal';

function isLowStock(row: InventoryStockRow): boolean {
  return row.safetyStock > 0 && row.quantity > 0 && row.quantity <= row.safetyStock;
}

function matchesStockFilter(row: InventoryStockRow, filter: InventoryStockFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'OUT') return row.quantity <= 0;
  return isLowStock(row);
}

function qtyToneClass(quantity: number, safetyStock: number): string {
  if (quantity <= 0) return 'text-rose-600';
  if (safetyStock > 0 && quantity <= safetyStock) return 'text-amber-700';
  return 'text-slate-900';
}

export const InventoryListView: FC = () => {
  const { showToast, setActiveTab } = useApp();
  const { isAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();
  const memberScope = useWorkspaceMemberScope();
  const orgId = currentOrganization?.id;
  const industryType = currentOrganization?.industry_type ?? '';
  const isPlantOpsContext =
    industryType === 'manufacturing_light';
  /** Owner/Admin/Manager만 입고·조정 — Staff는 조회만 */
  const canMutate = isAdmin;
  const productColumnLabel = isPlantOpsContext ? '표준코드·품명' : COPY.colProduct;

  const [rows, setRows] = useState<InventoryStockRow[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('ALL');
  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundInitial, setInboundInitial] = useState<InventoryStockRow | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustInitial, setAdjustInitial] = useState<InventoryStockRow | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferInitial, setTransferInitial] = useState<InventoryStockRow | null>(null);
  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [savingSafetyId, setSavingSafetyId] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setLocations([]);
      setSelectedLocationId(null);
      setLocationsLoaded(false);
      return;
    }
    try {
      const all = await stockLocationService.listLocations(orgId);
      const scoped = stockLocationService.filterByMemberScope(all, {
        scopeType: memberScope.scopeType,
        memberDepartmentId: memberScope.memberDepartmentId,
        memberPath: memberScope.memberPath,
        departmentPathById: memberScope.departmentPathById,
      });
      setLocations(scoped);
      setSelectedLocationId((prev) => {
        if (prev && scoped.some((loc) => loc.id === prev)) return prev;
        const central = scoped.find((loc) => loc.code === 'central');
        return central?.id ?? scoped[0]?.id ?? null;
      });
    } catch (err) {
      showToast.error(err, COPY.loadError);
      setLocations([]);
    } finally {
      setLocationsLoaded(true);
    }
  }, [orgId, memberScope, showToast]);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured() || !selectedLocationId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(
        await inventoryService.listStockRows(orgId, {
          stockLocationId: selectedLocationId,
        })
      );
    } catch (err) {
      showToast.error(err, COPY.loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedLocationId, showToast]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.productName.toLowerCase().includes(q)) return false;
      return matchesStockFilter(row, stockFilter);
    });
  }, [rows, search, stockFilter]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const row of rows) {
      if (row.quantity <= 0) out += 1;
      else if (isLowStock(row)) low += 1;
    }
    return { all: rows.length, low, out };
  }, [rows]);

  const openInbound = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setInboundInitial(row ?? null);
    setInboundOpen(true);
  };

  const openWarehouseSettings = () => {
    openRetailSettingsPanel('warehouses');
    setActiveTab('settings');
  };

  const saveSafetyStock = async (productId: string, next: number) => {
    if (!orgId || savingSafetyId) return;
    setSavingSafetyId(productId);
    try {
      const saved = await productService.updateSafetyStock(orgId, productId, next);
      setRows((prev) =>
        prev.map((row) => (row.productId === productId ? { ...row, safetyStock: saved } : row))
      );
      showToast(COPY.safetySaved, 'success');
    } catch (err) {
      showToast.error(err, COPY.safetyError);
    } finally {
      setSavingSafetyId(null);
    }
  };

  const openAdjust = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setAdjustInitial(row ?? null);
    setAdjustOpen(true);
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Warehouse className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 재고를 확인할 수 있습니다"
        />
      </div>
    );
  }

  return (
    <div className={cn(DESKTOP_CONTAINERS.wide, 'space-y-4 pb-8')}>
      <PageHeader
        icon={<Warehouse className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={isPlantOpsContext ? '현장 자재' : COPY.title}
        description={
          isPlantOpsContext
            ? canMutate
              ? '현장·생산용 자재 재고를 입고·조정합니다'
              : '현장·생산용 자재 재고를 조회합니다 (변경은 관리자만 가능)'
            : canMutate
              ? COPY.locationAllHint
              : COPY.descriptionReadOnly
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canMutate && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="default"
                  onClick={() => openInbound()}
                  disabled={rows.length === 0}
                  leftIcon={<PackagePlus className="w-4 h-4" />}
                >
                  {COPY.inbound}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => openAdjust()}
                  disabled={rows.length === 0}
                  leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                >
                  수량 직접 조정
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setStocktakeOpen(true)}
                  disabled={rows.length === 0}
                  leftIcon={<ClipboardCheck className="w-4 h-4" />}
                >
                  {COPY.stocktake}
                </Button>
                {locations.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => {
                      setTransferInitial(null);
                      setTransferOpen(true);
                    }}
                    disabled={rows.length === 0}
                    leftIcon={<ArrowLeftRight className="w-4 h-4" />}
                  >
                    창고간 이동
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <FilterBar>
        <label className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
          <span className="text-[11px] font-bold text-slate-500">{COPY.locationLabel}</span>
          <select
            value={selectedLocationId ?? ''}
            onChange={(e) => setSelectedLocationId(e.target.value || null)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        {canMutate && (
          <Button
            type="button"
            variant="secondary"
            size="default"
            onClick={openWarehouseSettings}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            {COPY.locationGoSettings}
          </Button>
        )}
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={COPY.searchPlaceholder}
          className="w-full sm:flex-1 sm:min-w-[200px]"
        />
        <FilterTabs
          tabs={[
            { id: 'ALL', label: COPY.filterAll, count: counts.all },
            { id: 'LOW', label: COPY.filterLow, count: counts.low },
            { id: 'OUT', label: COPY.filterOut, count: counts.out },
          ]}
          active={stockFilter}
          onChange={setStockFilter}
          activeClassName="bg-teal-600 text-white"
        />
      </FilterBar>

      {locationsLoaded && !locations.some((loc) => loc.configured) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{COPY.locationUnsetTitle}</p>
            <p className="text-xs text-slate-600 mt-1">{COPY.locationUnsetDescription}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={openWarehouseSettings}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            {COPY.locationGoSettings}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <PageListSkeleton rows={3} message="목록을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="w-10 h-10" />}
          title={rows.length === 0 ? COPY.emptyTitle : COPY.emptyFilterTitle}
          description={
            rows.length === 0 ? COPY.emptyDescription : COPY.emptyFilterDescription
          }
          guide={
            rows.length === 0
              ? {
                  badge: '30초 시작 가이드',
                  title: '재고를 시작하려면',
                  tip: '상품을 등록한 뒤 입고로 수량을 맞추면 안전재고 알림을 쓸 수 있습니다.',
                  steps: [
                    { stepNumber: 1, title: '상품 등록', detail: '이름·판매가·바코드를 등록합니다.' },
                    { stepNumber: 2, title: '초기 입고', detail: '매장에 있는 실수량을 입력합니다.' },
                    { stepNumber: 3, title: '안전재고 설정', detail: '부족 임박 시 알림을 받도록 둡니다.' },
                  ],
                }
              : undefined
          }
          action={
            rows.length === 0 && canMutate
              ? { label: COPY.inbound, onClick: () => setInboundOpen(true) }
              : undefined
          }
        />
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filtered.map((row) => (
              <div
                key={row.key}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4"
              >
                <p className="font-bold text-slate-900">{row.productName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {row.variantName ?? COPY.singleOption}
                </p>
                <div className="flex items-end justify-between gap-2 mt-3">
                  <p className={`text-lg font-bold tabular-nums ${qtyToneClass(row.quantity, row.safetyStock)}`}>
                    {row.quantity}
                    <span className="text-xs font-semibold text-slate-400 ml-1">
                      {COPY.qtyUnit}
                    </span>
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.isActive ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.isActive ? COPY.statusActive : COPY.statusInactive}
                    </span>
                    <div className="flex gap-2">
                      {canMutate && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAdjust(row)}
                            className="text-xs font-bold text-slate-700 min-h-[44px] px-1"
                          >
                            {COPY.adjust}
                          </button>
                          <button
                            type="button"
                            onClick={() => openInbound(row)}
                            className="text-xs font-bold text-teal-700 min-h-[44px] px-1"
                          >
                            {COPY.inbound}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  {canMutate ? (
                    <SafetyStockEditor
                      value={row.safetyStock}
                      saving={savingSafetyId === row.productId}
                      onSave={(next) => void saveSafetyStock(row.productId, next)}
                    />
                  ) : (
                    <p className="text-xs text-slate-500 tabular-nums">
                      {COPY.safetyLabel} {row.safetyStock}
                      {COPY.qtyUnit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-bold">{productColumnLabel}</th>
                  <th className="px-4 py-3 font-bold">{COPY.colOption}</th>
                  <th className="px-4 py-3 font-bold text-right">{COPY.colQty}</th>
                  <th className="px-4 py-3 font-bold">{COPY.safetyLabel}</th>
                  <th className="px-4 py-3 font-bold">{COPY.colStatus}</th>
                  <th className="px-4 py-3 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.variantName ?? COPY.singleOption}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${qtyToneClass(
                        row.quantity,
                        row.safetyStock
                      )}`}
                    >
                      {row.quantity}
                      <span className="text-xs font-semibold text-slate-400 ml-1">
                        {COPY.qtyUnit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canMutate ? (
                        <SafetyStockEditor
                          value={row.safetyStock}
                          saving={savingSafetyId === row.productId}
                          onSave={(next) => void saveSafetyStock(row.productId, next)}
                        />
                      ) : (
                        <span className="tabular-nums font-semibold">{row.safetyStock}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          row.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.isActive ? COPY.statusActive : COPY.statusInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {canMutate && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAdjust(row)}
                            className="text-xs font-bold text-slate-700 min-h-[44px] px-2"
                          >
                            {COPY.adjust}
                          </button>
                          <button
                            type="button"
                            onClick={() => openInbound(row)}
                            className="text-xs font-bold text-teal-600 min-h-[44px] px-2"
                          >
                            {COPY.inbound}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canMutate && selectedLocationId && (
        <>
          <StockInboundModal
            isOpen={inboundOpen}
            organizationId={orgId}
            stockRows={rows}
            initialRow={inboundInitial}
            stockLocationId={selectedLocationId}
            onClose={() => setInboundOpen(false)}
            onCompleted={(after) => {
              showToast(COPY.inboundDone(after), 'success');
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />

          <StockAdjustmentModal
            isOpen={adjustOpen}
            organizationId={orgId}
            stockRows={rows}
            initialRow={adjustInitial}
            stockLocationId={selectedLocationId}
            onClose={() => setAdjustOpen(false)}
            onCompleted={(delta, after) => {
              showToast(COPY.adjustDone(delta, after), 'success');
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />

          <StockTransferModal
            isOpen={transferOpen}
            organizationId={orgId}
            stockRows={rows}
            locations={locations}
            fromLocationId={selectedLocationId}
            initialRow={transferInitial}
            onClose={() => setTransferOpen(false)}
            onCompleted={() => {
              showToast(COPY.transferDone, 'success');
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />

        </>
      )}

      {/* 바코드 연속 스캔 재고 실사 모달 */}
      <StocktakeAuditModal
        isOpen={stocktakeOpen}
        organizationId={orgId}
        stockRows={rows}
        stockLocationId={selectedLocationId}
        onClose={() => setStocktakeOpen(false)}
        onCompleted={(adjustedCount) => {
          showToast(`재고 실사가 완료되었습니다. (${adjustedCount}개 품목 오차 재고 조정 완료)`, 'success');
          void load();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />
    </div>
  );
};
