import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import {
  ArrowLeftRight,
  PackagePlus,
  SlidersHorizontal,
  Warehouse,
  Camera,
  Printer,
  QrCode,
  Plus,
  Barcode,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import { useList } from '@refinedev/core';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, Modal, PageHeader } from '@/shared/components';
import {
  FilterBar,
  FilterTabs,
  FormField,
  FORM_CONTROL_CLASS,
  SearchField,
} from '@/shared/components/ui';
import {
  BarcodeLabelPrintModal,
  StoreQrPopPrintModal,
  InventoryScannerModal,
  generateItemBarcode,
  type InventoryItem,
} from '@/capabilities/inventory';
import {
  stockLocationService,
  type StockLocation,
} from '@/capabilities/commerce/stock';
import { useWorkspaceMemberScope } from '@/pages/workspace/useWorkspaceMemberScope';
import { inventoryService } from '../../services/inventoryService';
import {
  INVENTORY_LOW_STOCK_THRESHOLD,
  type InventoryStockFilter,
  type InventoryStockRow,
} from '../../types/inventory';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockInboundModal } from './StockInboundModal';
import { StockTransferModal } from './StockTransferModal';
import { StocktakeAuditModal } from './StocktakeAuditModal';

function matchesStockFilter(row: InventoryStockRow, filter: InventoryStockFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'OUT') return row.quantity <= 0;
  return row.quantity > 0 && row.quantity <= INVENTORY_LOW_STOCK_THRESHOLD;
}

function qtyToneClass(quantity: number): string {
  if (quantity <= 0) return 'text-rose-600';
  if (quantity <= INVENTORY_LOW_STOCK_THRESHOLD) return 'text-amber-700';
  return 'text-slate-900';
}

export const InventoryListView: FC = () => {
  const { showToast } = useApp();
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
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocDeptId, setNewLocDeptId] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [selectedLabelItem, setSelectedLabelItem] = useState<InventoryItem | null>(null);
  const [storePopOpen, setStorePopOpen] = useState(false);
  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [toolsOpen]);

  const { query: deptQuery } = useList<{ id: string; name: string }>({
    resource: 'departments',
    meta: { schema: 'core' },
    sorters: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled: Boolean(orgId) && canMutate },
  });
  const departments = (deptQuery?.data?.data as { id: string; name: string }[]) ?? [];

  const loadLocations = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setLocations([]);
      setSelectedLocationId(null);
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
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setLocations([]);
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
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
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
      else if (row.quantity <= INVENTORY_LOW_STOCK_THRESHOLD) low += 1;
    }
    return { all: rows.length, low, out };
  }, [rows]);

  const openInbound = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setInboundInitial(row ?? null);
    setInboundOpen(true);
  };

  const openAdjust = (row?: InventoryStockRow) => {
    if (!canMutate) return;
    setAdjustInitial(row ?? null);
    setAdjustOpen(true);
  };

  const inventoryItems: InventoryItem[] = useMemo(() => {
    const orgCode = orgId ? orgId.replace(/-/g, '').slice(0, 4).toUpperCase() : '0001';
    return rows.map((r, idx) => ({
      id: r.key,
      name: r.variantName ? `${r.productName} (${r.variantName})` : r.productName,
      sku: r.key,
      barcode: generateItemBarcode(orgCode, idx + 1),
      qrCodeUrl: `https://moa.app/scan/item?id=${encodeURIComponent(r.key)}`,
      currentStock: r.quantity,
      safetyStock: INVENTORY_LOW_STOCK_THRESHOLD,
      unitPrice: 0,
    }));
  }, [rows, orgId]);

  const openLabelPrint = (row?: InventoryStockRow) => {
    if (row) {
      const found = inventoryItems.find((it) => it.id === row.key);
      setSelectedLabelItem(found ?? null);
    } else {
      setSelectedLabelItem(inventoryItems[0] ?? null);
    }
    setLabelPrintOpen(true);
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
    <div className="p-4 sm:p-6 space-y-4 pb-8">
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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {canMutate && (
              <button
                type="button"
                onClick={() => openInbound()}
                disabled={rows.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer flex-1 sm:flex-initial"
              >
                <PackagePlus className="w-4 h-4" />
                {COPY.inbound}
              </button>
            )}
            {canMutate && (
              <button
                type="button"
                onClick={() => setStocktakeOpen(true)}
                disabled={rows.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200 text-sm font-bold rounded-xl shadow-2xs disabled:opacity-60 cursor-pointer flex-1 sm:flex-initial"
                title="무선 스캐너로 매대를 돌며 실재고 전수조사 및 로스 자동 파악"
              >
                <Barcode className="w-4 h-4 text-teal-700" />
                재고 실사
              </button>
            )}

            {/* 재고 관리 보조 도구 드롭다운 (스캔, QR POP, 조정, 이동) */}
            <div className="relative w-full sm:w-auto" ref={toolsRef}>
              <button
                type="button"
                onClick={() => setToolsOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-200/90 shadow-2xs w-full sm:w-auto cursor-pointer"
                aria-expanded={toolsOpen}
              >
                <Wrench className="w-4 h-4 text-slate-500" />
                <span>재고 도구</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsOpen && (
                <div className="absolute right-0 mt-1.5 w-full sm:w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setScannerOpen(true);
                      setToolsOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>실시간 카메라 스캔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStorePopOpen(true);
                      setToolsOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-slate-600" />
                    <span>매장 안내용 QR POP 인쇄</span>
                  </button>
                  {canMutate && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          openAdjust();
                          setToolsOpen(false);
                        }}
                        disabled={rows.length === 0}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                        <span>{COPY.adjust} (수량 단품 조정)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferInitial(null);
                          setTransferOpen(true);
                          setToolsOpen(false);
                        }}
                        disabled={rows.length === 0 || locations.length < 2}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-slate-600" />
                        <span>{COPY.transfer} (창고간 이동)</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
                {loc.code === 'central' ? COPY.locationCentral : loc.name}
              </option>
            ))}
          </select>
        </label>
        {canMutate && (
          <button
            type="button"
            onClick={() => {
              setNewLocName('');
              setNewLocDeptId(departments[0]?.id ?? '');
              setAddLocOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-bold text-teal-700 bg-teal-50 rounded-xl border border-teal-100"
          >
            <Plus className="w-4 h-4" />
            {COPY.addDeptLocation}
          </button>
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

      {loading ? (
        <PageListSkeleton rows={3} message="목록을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="w-10 h-10" />}
          title={rows.length === 0 ? COPY.emptyTitle : COPY.emptyFilterTitle}
          description={
            rows.length === 0 ? COPY.emptyDescription : COPY.emptyFilterDescription
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
                  <p className={`text-lg font-bold tabular-nums ${qtyToneClass(row.quantity)}`}>
                    {row.quantity}
                    <span className="text-xs font-semibold text-slate-400 ml-1">
                      {COPY.qtyUnit}
                    </span>
                  </p>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.isActive ? COPY.statusActive : COPY.statusInactive}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openLabelPrint(row)}
                          className="text-xs font-bold text-indigo-600 min-h-[44px] px-1 flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          라벨
                        </button>
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
                        row.quantity
                      )}`}
                    >
                      {row.quantity}
                      <span className="text-xs font-semibold text-slate-400 ml-1">
                        {COPY.qtyUnit}
                      </span>
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
                      <button
                        type="button"
                        onClick={() => openLabelPrint(row)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 min-h-[44px] px-2 inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        라벨
                      </button>
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

          <Modal
            isOpen={addLocOpen}
            onClose={() => setAddLocOpen(false)}
            title={COPY.addDeptLocationTitle}
            maxWidth="md"
          >
            <form
              className="p-4 sm:p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (savingLoc || !orgId) return;
                const name = newLocName.trim();
                if (!name) {
                  showToast(COPY.addDeptLocationNeedName, 'error');
                  return;
                }
                if (!newLocDeptId) {
                  showToast(COPY.addDeptLocationNeedDept, 'error');
                  return;
                }
                setSavingLoc(true);
                void stockLocationService
                  .createDepartmentLocation({
                    organizationId: orgId,
                    name,
                    code: `dept_${newLocDeptId.slice(0, 8)}`,
                    departmentId: newLocDeptId,
                  })
                  .then(async (created) => {
                    showToast(`${created.name} 창고가 추가되었습니다.`, 'success');
                    setAddLocOpen(false);
                    await loadLocations();
                    setSelectedLocationId(created.id);
                  })
                  .catch((err) => {
                    showToast(
                      err instanceof Error ? err.message : COPY.addDeptLocationError,
                      'error'
                    );
                  })
                  .finally(() => setSavingLoc(false));
              }}
            >
              <FormField label={COPY.addDeptLocationName} required>
                <input
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                  placeholder="예: 생산1팀 자재고"
                />
              </FormField>
              <FormField label={COPY.addDeptLocationDept} required>
                <select
                  required
                  value={newLocDeptId}
                  onChange={(e) => setNewLocDeptId(e.target.value)}
                  className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                >
                  <option value="" disabled>
                    {COPY.addDeptLocationDept}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddLocOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-bold"
                >
                  {COPY.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingLoc || departments.length === 0}
                  className="min-h-[44px] px-4 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
                >
                  {COPY.addDeptLocationSubmit}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}

      <InventoryScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        items={inventoryItems}
        onStockUpdated={(_updatedItem, reason) => {
          showToast(`스캔 완료: ${reason}`, 'success');
          void load();
        }}
      />

      <BarcodeLabelPrintModal
        isOpen={labelPrintOpen}
        onClose={() => setLabelPrintOpen(false)}
        item={selectedLabelItem}
        organizationName={currentOrganization?.name || '사업장'}
      />

      <StoreQrPopPrintModal
        isOpen={storePopOpen}
        onClose={() => setStorePopOpen(false)}
        organizationName={currentOrganization?.name || '사업장'}
        organizationCode={currentOrganization?.id?.replace(/-/g, '').slice(0, 8).toUpperCase() || 'MOA-001'}
        industryLabel="스마트 사업장"
      />

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
