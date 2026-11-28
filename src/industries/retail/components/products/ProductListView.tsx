import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  Package,
  Plus,
  FolderOpen,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  Pencil,
  Check,
  X,
  PackagePlus,
  SlidersHorizontal,
  ClipboardCheck,
  ArrowLeftRight,
  Settings,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader } from '@/shared/components';
import {
  Button,
  FORM_CONTROL_CLASS,
  FilterBar,
  FilterTabs,
  SearchField,
} from '@/shared/components/ui';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import {
  stockLocationService,
  type StockLocation,
} from '@/capabilities/commerce/stock';
import { useWorkspaceMemberScope } from '@/pages/workspace/useWorkspaceMemberScope';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import type {
  ProductCategory,
  ProductListItem,
  ProductStatusFilter,
} from '../../types/product';
import type { InventoryStockRow } from '../../types/inventory';
import { ProductFormModal } from './ProductFormModal';
import { openRetailSettingsPanel } from '../settings/retailSettingsIntent';
import { ProductBulkImportModal } from './ProductBulkImportModal';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { resolveAllocationPolicy } from '@/core/policies/allocationPolicyService';
import {
  matchesProductStockFilter,
  productQtyToneClass,
  type ProductStockFilter,
} from './productStockUtils';
import {
  clearProductStockFilter,
  peekProductStockFilter,
} from './productStockIntent';
import { StockInboundModal } from '../inventory/StockInboundModal';
import { StockAdjustmentModal } from '../inventory/StockAdjustmentModal';
import { StockTransferModal } from '../inventory/StockTransferModal';
import { StocktakeAuditModal } from '../inventory/StocktakeAuditModal';
import { INVENTORY_LIST_COPY as INV_COPY } from '../inventory/inventoryListCopy';

type CategoryFilter = 'ALL' | 'NONE' | string;
/** null = 미확정, 'ALL' = 전체 창고 합산 */
type LocationFilter = 'ALL' | string;

export const ProductListView: FC = () => {
  const { showToast, setActiveTab } = useApp();
  const { isAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();
  const memberScope = useWorkspaceMemberScope();
  const orgId = currentOrganization?.id;
  const canMutate = isAdmin;
  const requireSizeColorVariants = Boolean(
    getIndustryPreset(currentOrganization?.industry_type)?.businessRules?.sizeColorSkuSupport
  );

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stockRows, setStockRows] = useState<InventoryStockRow[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('ALL');
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>(
    () => peekProductStockFilter() ?? 'ALL'
  );
  const [formOpen, setFormOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);

  const [inlinePriceEditingId, setInlinePriceEditingId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState('');
  const [inlinePriceSaving, setInlinePriceSaving] = useState(false);

  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundInitial, setInboundInitial] = useState<InventoryStockRow | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustInitial, setAdjustInitial] = useState<InventoryStockRow | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferInitial, setTransferInitial] = useState<InventoryStockRow | null>(null);
  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [safetyAlertsEnabled, setSafetyAlertsEnabled] = useState(true);

  useEffect(() => {
    clearProductStockFilter();
  }, []);

  const loadLocations = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setLocations([]);
      setLocationsLoaded(false);
      setLocationFilter(null);
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
      setLocationFilter((prev) => {
        if (prev === 'ALL') return 'ALL';
        if (prev && scoped.some((loc) => loc.id === prev)) return prev;
        const central = scoped.find((loc) => loc.code === 'central');
        return central?.id ?? scoped[0]?.id ?? 'ALL';
      });
    } catch (err) {
      showToast.error(err, COPY.loadError);
      setLocations([]);
      setLocationFilter('ALL');
    } finally {
      setLocationsLoaded(true);
    }
  }, [orgId, memberScope, showToast]);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setItems([]);
      setCategories([]);
      setStockRows([]);
      setSafetyAlertsEnabled(true);
      return;
    }
    if (locationFilter == null) {
      return;
    }
    setLoading(true);
    try {
      const [list, cats, rows, allocation] = await Promise.all([
        productService.listProducts(orgId),
        productService.listCategories(orgId),
        inventoryService
          .listStockRows(
            orgId,
            locationFilter === 'ALL'
              ? { allLocations: true }
              : { stockLocationId: locationFilter }
          )
          .catch(() => [] as InventoryStockRow[]),
        resolveAllocationPolicy(orgId),
      ]);
      setItems(list);
      setCategories(cats);
      setStockRows(rows);
      setSafetyAlertsEnabled(allocation.enableSafetyStockAlert !== false);
    } catch (err) {
      showToast.error(err, COPY.loadError);
      setItems([]);
      setStockRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationFilter, showToast]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    void load();
  }, [load]);

  const stockByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of stockRows) {
      map[row.productId] = (map[row.productId] ?? 0) + row.quantity;
    }
    return map;
  }, [stockRows]);

  const stockCounts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const item of items) {
      const qty = stockByProductId[item.id] ?? 0;
      if (qty <= 0) out += 1;
      else if (matchesProductStockFilter(qty, item.safetyStock, 'LOW', safetyAlertsEnabled))
        low += 1;
    }
    return { all: items.length, low, out };
  }, [items, stockByProductId, safetyAlertsEnabled]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const nameHit = item.name.toLowerCase().includes(q);
        const specHit = item.spec?.toLowerCase().includes(q) ?? false;
        const codeHit = item.productCode?.toLowerCase().includes(q) ?? false;
        if (!nameHit && !specHit && !codeHit) return false;
      }
      if (statusFilter === 'ACTIVE' && !item.isActive) return false;
      if (statusFilter === 'INACTIVE' && item.isActive) return false;
      if (categoryFilter === 'NONE' && item.categoryId) return false;
      if (
        categoryFilter !== 'ALL' &&
        categoryFilter !== 'NONE' &&
        item.categoryId !== categoryFilter
      ) {
        return false;
      }
      const qty = stockByProductId[item.id] ?? 0;
      if (!matchesProductStockFilter(qty, item.safetyStock, stockFilter, safetyAlertsEnabled))
        return false;
      return true;
    });
  }, [
    items,
    search,
    statusFilter,
    categoryFilter,
    stockFilter,
    stockByProductId,
    safetyAlertsEnabled,
  ]);

  const selectedLocationId =
    locationFilter == null || locationFilter === 'ALL' ? null : locationFilter;
  const locationOpsLocked = locationFilter == null || locationFilter === 'ALL';
  const transferFromLocationId =
    selectedLocationId ??
    locations.find((loc) => loc.code === 'central')?.id ??
    locations[0]?.id ??
    '';

  const resolveInboundLocationName = () => {
    if (locationFilter && locationFilter !== 'ALL') {
      return locations.find((loc) => loc.id === locationFilter)?.name ?? COPY.locationLabel;
    }
    return (
      locations.find((loc) => loc.code === 'central')?.name ??
      locations[0]?.name ??
      '기본 창고'
    );
  };

  const resetListFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setStockFilter('ALL');
  };

  const openCreate = () => {
    if (!canMutate) return;
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ProductListItem) => {
    if (!canMutate) return;
    setEditing(item);
    setFormOpen(true);
  };

  const openWarehouseSettings = () => {
    openRetailSettingsPanel('warehouses');
    setActiveTab('settings');
  };

  const openInboundForProduct = (item: ProductListItem) => {
    if (!canMutate || locationOpsLocked) return;
    const row = stockRows.find((r) => r.productId === item.id) ?? null;
    setInboundInitial(row);
    setInboundOpen(true);
  };

  const openAdjustForProduct = (item: ProductListItem) => {
    if (!canMutate || locationOpsLocked) return;
    const row = stockRows.find((r) => r.productId === item.id) ?? null;
    setAdjustInitial(row);
    setAdjustOpen(true);
  };

  const handleSaveInlinePrice = async (item: ProductListItem) => {
    if (!orgId || !canMutate) return;
    const newPrice = Number(inlinePriceInput.replace(/[^\d]/g, ''));
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      showToast('올바른 판매 가격을 입력해 주세요.', 'error');
      return;
    }

    setInlinePriceSaving(true);
    try {
      await productService.saveProduct(
        orgId,
        {
          name: item.name,
          spec: item.spec,
          categoryId: item.categoryId,
          productCode: item.productCode,
          price: newPrice,
          cost: item.cost,
          isActive: item.isActive,
        },
        item.id
      );

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, price: newPrice } : it))
      );
      setInlinePriceEditingId(null);
      showToast(`'${item.name}' 판매가가 ${formatCurrency(newPrice)}로 수정되었습니다.`, 'success');
    } catch (err) {
      showToast.error(err, '가격 수정에 실패했습니다.');
    } finally {
      setInlinePriceSaving(false);
    }
  };

  const renderStockStatus = (item: ProductListItem) => {
    const stock = stockByProductId[item.id] ?? 0;
    return (
      <div className="inline-flex flex-col items-center justify-center gap-0.5">
        <div className="inline-flex items-center justify-center gap-1.5">
          <span
            className={cn(
              'text-sm font-black tabular-nums',
              productQtyToneClass(stock, item.safetyStock, safetyAlertsEnabled)
            )}
          >
            {stock.toLocaleString()}개
          </span>
          {stock <= 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3 h-3" />
              {COPY.stockBadgeOut}
            </span>
          ) : matchesProductStockFilter(
              stock,
              item.safetyStock,
              'LOW',
              safetyAlertsEnabled
            ) ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              {COPY.stockBadgeLow}
            </span>
          ) : null}
        </div>
        {item.safetyStock > 0 ? (
          <span className="text-[10px] font-medium text-slate-400 tabular-nums">
            {COPY.safetyHint(item.safetyStock)}
          </span>
        ) : null}
      </div>
    );
  };

  const mobileRowActions = (item: ProductListItem) => {
    if (!canMutate) return null;
    return (
      <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={locationOpsLocked}
          title={locationOpsLocked ? COPY.locationPickHint : COPY.inbound}
          onClick={() => openInboundForProduct(item)}
          leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
        >
          {COPY.inbound}
        </Button>
        <Button type="button" variant="outline" size="default" onClick={() => openEdit(item)}>
          {COPY.edit}
        </Button>
      </div>
    );
  };

  const desktopRowActions = (item: ProductListItem) => {
    if (!canMutate) return null;
    return (
      <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={locationOpsLocked}
          title={locationOpsLocked ? COPY.locationPickHint : COPY.inbound}
          onClick={() => openInboundForProduct(item)}
          leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
        >
          {COPY.inbound}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={locationOpsLocked}
          title={locationOpsLocked ? COPY.locationPickHint : COPY.adjust}
          onClick={() => openAdjustForProduct(item)}
        >
          {COPY.adjust}
        </Button>
        <Button type="button" variant="outline" size="default" onClick={() => openEdit(item)}>
          {COPY.edit}
        </Button>
      </div>
    );
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={COPY.noOrg}
          description={COPY.noOrgDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn(DESKTOP_CONTAINERS.wide, 'space-y-4 pb-8')}>
      <PageHeader
        icon={<Package className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.title}
        description={canMutate ? COPY.description : COPY.readOnlyHint}
        actions={
          canMutate ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  openRetailSettingsPanel('categories');
                  setActiveTab('settings');
                }}
                leftIcon={<FolderOpen className="w-4 h-4" />}
              >
                {COPY.categoryManage}
              </Button>
              <div className="hidden lg:block">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setBulkImportOpen(true)}
                  leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                >
                  {COPY.bulkImport}
                </Button>
              </div>
              <Button
                type="button"
                variant="primary"
                size="default"
                onClick={openCreate}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {COPY.add}
              </Button>
            </div>
          ) : undefined
        }
      />

      <FilterBar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={COPY.searchPlaceholder}
          className="w-full"
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className={`${FORM_CONTROL_CLASS} sm:w-auto`}
            aria-label={COPY.categoryLabel}
          >
            <option value="ALL">{COPY.categoryAll}</option>
            <option value="NONE">{COPY.categoryNone}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">{COPY.locationLabel}</span>
            <select
              value={locationFilter ?? ''}
              onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}
              disabled={locationFilter == null}
              className={`${FORM_CONTROL_CLASS} sm:w-auto`}
              aria-label={COPY.locationLabel}
            >
              <option value="ALL">{COPY.locationAll}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <FilterTabs
            tabs={[
              { id: 'ALL', label: COPY.statusAll },
              { id: 'ACTIVE', label: COPY.statusActive },
              { id: 'INACTIVE', label: COPY.statusInactive },
            ]}
            active={statusFilter}
            onChange={(id) => setStatusFilter(id as ProductStatusFilter)}
            activeClassName="bg-teal-600 text-white"
            className="min-h-[44px]"
          />
          <FilterTabs
            tabs={[
              { id: 'ALL', label: COPY.stockFilterAll, count: stockCounts.all },
              { id: 'LOW', label: COPY.stockFilterLow, count: stockCounts.low },
              { id: 'OUT', label: COPY.stockFilterOut, count: stockCounts.out },
            ]}
            active={stockFilter}
            onChange={(id) => setStockFilter(id as ProductStockFilter)}
            activeClassName="bg-amber-600 text-white"
            className="min-h-[44px]"
          />
        </div>
      </FilterBar>

      {canMutate ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <span className="text-[11px] font-bold text-slate-500 mr-1">{COPY.stockOpsLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={locationOpsLocked}
            title={locationOpsLocked ? COPY.locationPickHint : COPY.inbound}
            onClick={() => {
              setInboundInitial(null);
              setInboundOpen(true);
            }}
            leftIcon={<PackagePlus className="w-4 h-4" />}
          >
            {COPY.inbound}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={locationOpsLocked}
            title={locationOpsLocked ? COPY.locationPickHint : COPY.adjust}
            onClick={() => {
              setAdjustInitial(null);
              setAdjustOpen(true);
            }}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            {COPY.adjust}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={locationOpsLocked}
            title={locationOpsLocked ? COPY.locationPickHint : COPY.stocktake}
            onClick={() => setStocktakeOpen(true)}
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
          >
            {COPY.stocktake}
          </Button>
          {locations.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={locationOpsLocked}
              title={locationOpsLocked ? COPY.locationPickHint : COPY.transfer}
              onClick={() => {
                setTransferInitial(null);
                setTransferOpen(true);
              }}
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
            >
              {COPY.transfer}
            </Button>
          ) : null}
        </div>
      ) : null}

      {locationsLoaded && !locations.some((loc) => loc.configured) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{COPY.locationUnsetTitle}</p>
            <p className="text-xs text-slate-600 mt-1">{COPY.locationUnsetDescription}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={openWarehouseSettings}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            {COPY.locationGoSettings}
          </Button>
        </div>
      ) : null}

      {loading || locationFilter == null ? (
        <PageListSkeleton rows={4} message="상품을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={items.length === 0 ? COPY.emptyTitle : COPY.emptyFilterTitle}
          description={items.length === 0 ? COPY.emptyDescription : COPY.emptyFilterDescription}
          action={
            items.length === 0 && canMutate
              ? {
                  label: COPY.emptyAddAction,
                  onClick: openCreate,
                  icon: <Plus className="w-4 h-4" />,
                }
              : items.length > 0
                ? {
                    label: COPY.emptyFilterReset,
                    onClick: resetListFilters,
                  }
                : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5 sm:hidden">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                    {item.spec ? (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{item.spec}</p>
                    ) : null}
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {item.categoryName ? `${item.categoryName} · ` : ''}
                      {COPY.optionBadge(item.variantCount)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.isActive ? COPY.statusActive : COPY.statusInactive}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-black tabular-nums text-teal-700 text-base">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-slate-200">|</span>
                    {renderStockStatus(item)}
                  </div>
                </div>

                {canMutate ? <div className="pt-1">{mobileRowActions(item)}</div> : null}
              </li>
            ))}
          </ul>

          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">{COPY.nameLabel}</th>
                  <th className="p-4">{COPY.specLabel}</th>
                  <th className="p-4">{COPY.categoryLabel}</th>
                  <th className="p-4 text-center">{COPY.colQty}</th>
                  <th className="p-4 text-right">{COPY.priceLabel}</th>
                  <th className="p-4 text-center">{COPY.activeLabel}</th>
                  {canMutate ? <th className="p-4 text-right">{COPY.colManage}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isEditingPrice = inlinePriceEditingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {COPY.optionBadge(item.variantCount)}
                        </p>
                      </td>
                      <td className="p-4 text-slate-600 text-xs max-w-[12rem]">
                        {item.spec || '-'}
                      </td>
                      <td className="p-4 text-slate-600">{item.categoryName || '-'}</td>
                      <td className="p-4 text-center">{renderStockStatus(item)}</td>
                      <td className="p-4 text-right">
                        {canMutate && isEditingPrice ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={inlinePriceInput}
                              onChange={(e) =>
                                setInlinePriceInput(e.target.value.replace(/[^\d]/g, ''))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSaveInlinePrice(item);
                                if (e.key === 'Escape') setInlinePriceEditingId(null);
                              }}
                              disabled={inlinePriceSaving}
                              className={`${FORM_CONTROL_CLASS} w-24 text-right font-bold tabular-nums`}
                              autoFocus
                            />
                            <Button
                              type="button"
                              variant="primary"
                              size="icon-md"
                              disabled={inlinePriceSaving}
                              onClick={() => void handleSaveInlinePrice(item)}
                              title="저장"
                              aria-label="가격 저장"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-md"
                              onClick={() => setInlinePriceEditingId(null)}
                              title="취소"
                              aria-label="가격 수정 취소"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : canMutate ? (
                          <div
                            onClick={() => {
                              setInlinePriceEditingId(item.id);
                              setInlinePriceInput(String(item.price));
                            }}
                            className="inline-flex items-center gap-1 font-bold tabular-nums text-teal-700 hover:text-teal-800 cursor-pointer group justify-end"
                            title="클릭하여 가격 즉시 수정"
                          >
                            <span>{formatCurrency(item.price)}</span>
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                          </div>
                        ) : (
                          <span className="font-bold tabular-nums text-teal-700">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.isActive
                              ? 'bg-teal-50 text-teal-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.isActive ? COPY.statusActive : COPY.statusInactive}
                        </span>
                      </td>
                      {canMutate ? (
                        <td className="p-4 text-right">{desktopRowActions(item)}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canMutate && (
        <>
          <ProductFormModal
            isOpen={formOpen}
            organizationId={orgId}
            categories={categories}
            editing={editing}
            requireSizeColorVariants={requireSizeColorVariants}
            onClose={() => setFormOpen(false)}
            onSaved={() => {
              showToast(
                editing ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.',
                'success'
              );
              void load();
            }}
            onError={(message) => showToast(message, 'error')}
          />

          <ProductBulkImportModal
            isOpen={bulkImportOpen}
            organizationId={orgId}
            onClose={() => setBulkImportOpen(false)}
            onSuccess={() => {
              showToast('상품 일괄 등록이 완료되었습니다.', 'success');
              void load();
            }}
          />

          <StockInboundModal
            isOpen={inboundOpen}
            organizationId={orgId}
            stockRows={stockRows}
            initialRow={inboundInitial}
            stockLocationId={selectedLocationId}
            onClose={() => setInboundOpen(false)}
            onCompleted={(quantityAfter) => {
              showToast(
                COPY.inboundDoneAt(resolveInboundLocationName(), quantityAfter),
                'success'
              );
              void load();
            }}
            onError={(msg) => showToast(msg, 'error')}
          />

          <StockAdjustmentModal
            isOpen={adjustOpen}
            organizationId={orgId}
            stockRows={stockRows}
            initialRow={adjustInitial}
            stockLocationId={selectedLocationId}
            onClose={() => setAdjustOpen(false)}
            onCompleted={(delta, quantityAfter) => {
              showToast(INV_COPY.adjustDone(delta, quantityAfter), 'success');
              void load();
            }}
            onError={(msg) => showToast(msg, 'error')}
          />

          {transferFromLocationId ? (
            <StockTransferModal
              isOpen={transferOpen}
              organizationId={orgId}
              stockRows={stockRows}
              locations={locations}
              initialRow={transferInitial}
              fromLocationId={transferFromLocationId}
              onClose={() => setTransferOpen(false)}
              onCompleted={() => {
                showToast(INV_COPY.transferDone, 'success');
                void load();
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          ) : null}

          <StocktakeAuditModal
            isOpen={stocktakeOpen}
            organizationId={orgId}
            stockRows={stockRows}
            stockLocationId={selectedLocationId}
            onClose={() => setStocktakeOpen(false)}
            onCompleted={(adjustedCount) => {
              showToast(
                `재고 실사가 완료되었습니다. (${adjustedCount}개 품목 오차 재고 조정 완료)`,
                'success'
              );
              void load();
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        </>
      )}
    </div>
  );
};
