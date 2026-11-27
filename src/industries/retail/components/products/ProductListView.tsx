import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  Package,
  Plus,
  FolderOpen,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Check,
  X,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState, PageHeader, Modal } from '@/shared/components';
import { FilterBar, FilterTabs, SearchField } from '@/shared/components/ui';
import { BarcodeLabelPrintModal, type InventoryItem } from '@/capabilities/inventory';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import type {
  ProductCategory,
  ProductListItem,
  ProductStatusFilter,
} from '../../types/product';
import { ProductFormModal } from './ProductFormModal';
import { ProductCategoryManageModal } from './ProductCategoryManageModal';
import { ProductBulkImportModal } from './ProductBulkImportModal';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

type CategoryFilter = 'ALL' | 'NONE' | string;

export const ProductListView: FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const organizationName = currentOrganization?.name || '매장';
  const requireSizeColorVariants = Boolean(
    getIndustryPreset(currentOrganization?.industry_type)?.businessRules?.sizeColorSkuSupport
  );

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [printItem, setPrintItem] = useState<InventoryItem | null>(null);

  // [개선안 7] 인라인 가격 수정 상태 (productId -> editingPrice)
  const [inlinePriceEditingId, setInlinePriceEditingId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');
  const [inlinePriceSaving, setInlinePriceSaving] = useState(false);

  // [개선안 7] 간편 빠른 입고 모달 상태
  const [quickInboundItem, setQuickInboundItem] = useState<ProductListItem | null>(null);
  const [quickInboundQty, setQuickInboundQty] = useState<string>('');
  const [quickInboundSaving, setQuickInboundSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setItems([]);
      setCategories([]);
      setStockByProductId({});
      return;
    }
    setLoading(true);
    try {
      const [list, cats, stockRows] = await Promise.all([
        productService.listProducts(orgId),
        productService.listCategories(orgId),
        inventoryService.listStockRows(orgId).catch(() => []),
      ]);

      const stockMap: Record<string, number> = {};
      for (const row of stockRows) {
        stockMap[row.productId] = (stockMap[row.productId] ?? 0) + row.quantity;
      }

      setItems(list);
      setCategories(cats);
      setStockByProductId(stockMap);
    } catch (err) {
      showToast.error(err, COPY.loadError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !(item.productCode?.toLowerCase().includes(q) ?? false)) {
        return false;
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
      return true;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ProductListItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  // [개선안 7] 인라인 빠른 가격 저장
  const handleSaveInlinePrice = async (item: ProductListItem) => {
    if (!orgId) return;
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

  // [개선안 7] 간편 빠른 입고 실행
  const handleQuickInboundSubmit = async () => {
    if (!orgId || !quickInboundItem) return;
    const qty = Number(quickInboundQty.replace(/[^\d]/g, ''));
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('입고 수량을 1개 이상 입력해 주세요.', 'error');
      return;
    }

    setQuickInboundSaving(true);
    try {
      await inventoryService.applyInbound({
        organizationId: orgId,
        productId: quickInboundItem.id,
        quantity: qty,
        reason: '목록에서 간편 빠른 입고',
      });

      setStockByProductId((prev) => ({
        ...prev,
        [quickInboundItem.id]: (prev[quickInboundItem.id] ?? 0) + qty,
      }));

      showToast(`'${quickInboundItem.name}' 재고 ${qty}개가 즉시 입고되었습니다.`, 'success');
      setQuickInboundItem(null);
      setQuickInboundQty('');
    } catch (err) {
      showToast.error(err, '입고 처리에 실패했습니다.');
    } finally {
      setQuickInboundSaving(false);
    }
  };

  // [개선안 6] 재고 상태 뱃지 렌더러
  const renderStockBadge = (productId: string) => {
    const stock = stockByProductId[productId] ?? 0;
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" /> 품절
        </span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" /> 품절임박 ({stock}개)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> {stock}개
      </span>
    );
  };

  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={COPY.noOrg}
          description="조직 선택 후 상품을 관리할 수 있습니다"
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
        description={COPY.description}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-white border border-teal-200 text-teal-800 text-sm font-bold rounded-xl w-full sm:w-auto cursor-pointer hover:bg-teal-50"
            >
              <FolderOpen className="w-4 h-4" />
              {COPY.categoryManage}
            </button>
            <button
              type="button"
              onClick={() => setBulkImportOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-xl w-full sm:w-auto shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              엑셀 일괄 등록
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-teal-600 text-white text-sm font-bold rounded-xl w-full sm:w-auto cursor-pointer hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" />
              {COPY.add}
            </button>
          </div>
        }
      />

      <FilterBar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="상품명 또는 규격 검색 (예: 둥근머리 볼트, 테이프, 엘보)"
            className="w-full sm:flex-1 sm:min-w-[200px]"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="w-full sm:w-auto min-h-[44px] px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <FilterTabs
            tabs={[
              { id: 'ALL', label: COPY.statusAll },
              { id: 'ACTIVE', label: COPY.statusActive },
              { id: 'INACTIVE', label: COPY.statusInactive },
            ]}
            active={statusFilter}
            onChange={(id) => setStatusFilter(id as ProductStatusFilter)}
            activeClassName="bg-teal-600 text-white"
          />
        </div>
      </FilterBar>

      {loading ? (
        <PageListSkeleton rows={4} message="상품을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={items.length === 0 ? COPY.emptyTitle : '검색 결과가 없습니다'}
          description={items.length === 0 ? COPY.emptyDescription : '검색어나 필터 조건을 변경해 보세요.'}
        />
      ) : (
        <>
          {/* 모바일 카드 뷰 (슬림 2단 정돈) */}
          <ul className="space-y-2.5 sm:hidden">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xs"
              >
                {/* 1행: 상품명 및 카테고리/옵션/상태 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
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

                {/* 2행: 단가 & 재고 현황 & 액션 버튼 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-black tabular-nums text-teal-700 text-base">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-slate-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tabular-nums text-slate-900">
                        재고 {(stockByProductId[item.id] ?? 0).toLocaleString()}개
                      </span>
                      {renderStockBadge(item.id)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickInboundItem(item);
                        setQuickInboundQty('10');
                      }}
                      className="text-xs font-bold text-teal-700 hover:bg-teal-50 min-h-[32px] px-2.5 rounded-lg border border-teal-200 bg-teal-50/50 flex items-center gap-1 cursor-pointer"
                      title="10개 즉시 입고"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+10</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[32px] px-2.5 rounded-lg border border-slate-200 bg-white flex items-center cursor-pointer"
                    >
                      {COPY.edit}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">{COPY.nameLabel}</th>
                  <th className="p-4">{COPY.categoryLabel}</th>
                  <th className="p-4">{COPY.optionModeLabel}</th>
                  <th className="p-4 text-center">현재고 수량</th>
                  <th className="p-4 text-right">{COPY.priceLabel}</th>
                  <th className="p-4 text-right">매입원가</th>
                  <th className="p-4 text-center">{COPY.activeLabel}</th>
                  <th className="p-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isEditingPrice = inlinePriceEditingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="p-4 font-bold text-slate-900">{item.name}</td>
                      <td className="p-4 text-slate-600">{item.categoryName || '-'}</td>
                      <td className="p-4 text-slate-600">
                        {COPY.optionBadge(item.variantCount)}
                      </td>
                      {/* 현재고 수량 및 빠른 입고 버튼 */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-black tabular-nums',
                              (stockByProductId[item.id] ?? 0) <= 0
                                ? 'text-rose-600'
                                : (stockByProductId[item.id] ?? 0) <= 5
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            )}
                          >
                            {(stockByProductId[item.id] ?? 0).toLocaleString()}개
                          </span>
                          {renderStockBadge(item.id)}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickInboundItem(item);
                              setQuickInboundQty('10');
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 cursor-pointer transition-colors"
                            title="즉시 10개 간편 입고"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+10</span>
                          </button>
                        </div>
                      </td>
                      {/* 인라인 빠른 가격 수정 */}
                      <td className="p-4 text-right">
                        {isEditingPrice ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={inlinePriceInput}
                              onChange={(e) => setInlinePriceInput(e.target.value.replace(/[^\d]/g, ''))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSaveInlinePrice(item);
                                if (e.key === 'Escape') setInlinePriceEditingId(null);
                              }}
                              disabled={inlinePriceSaving}
                              className="w-24 px-2 py-1 bg-white border border-teal-500 rounded-lg text-right font-bold tabular-nums text-slate-900 text-sm focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={inlinePriceSaving}
                              onClick={() => void handleSaveInlinePrice(item)}
                              className="p-1 rounded-md bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                              title="저장"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlinePriceEditingId(null)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
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
                        )}
                      </td>
                      {/* 매입원가 */}
                      <td className="p-4 text-right text-slate-500 font-medium tabular-nums">
                        {item.cost != null ? formatCurrency(item.cost) : '-'}
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
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickInboundItem(item);
                              setQuickInboundQty('');
                            }}
                            className="text-xs font-bold text-teal-700 hover:bg-teal-50 min-h-[32px] px-2.5 rounded-lg border border-teal-200 bg-teal-50/50 flex items-center gap-1 cursor-pointer"
                            title="간편 입고 수량 입력"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>입고</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[32px] px-2.5 rounded-lg border border-slate-200 bg-white flex items-center cursor-pointer"
                          >
                            {COPY.edit}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* [개선안 7] 간편 빠른 입고 모달 */}
      <Modal
        isOpen={Boolean(quickInboundItem)}
        onClose={() => setQuickInboundItem(null)}
        title="간편 재고 입고"
        maxWidth="sm"
      >
        {quickInboundItem && (
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <p className="font-bold text-slate-900 text-base">{quickInboundItem.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                현재고: <span className="font-bold text-teal-700">{stockByProductId[quickInboundItem.id] ?? 0}개</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                입고할 수량
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={quickInboundQty}
                  onChange={(e) => setQuickInboundQty(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="수량 입력"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-bold tabular-nums text-slate-900 focus:outline-teal-600"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  개
                </span>
              </div>
            </div>

            {/* 빠른 수량 추가 버튼 */}
            <div className="flex gap-1.5">
              {[5, 10, 20, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuickInboundQty(String(q))}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  +{q}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickInboundItem(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={quickInboundSaving}
                onClick={handleQuickInboundSubmit}
                className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1"
              >
                {quickInboundSaving ? '입고 중...' : '즉시 입고하기'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 바코드 & QR 라벨 스티커 인쇄 모달 */}
      <BarcodeLabelPrintModal
        isOpen={Boolean(printItem)}
        onClose={() => setPrintItem(null)}
        item={printItem}
        organizationName={organizationName}
      />

      <ProductFormModal
        isOpen={formOpen}
        organizationId={orgId!}
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

      <ProductCategoryManageModal
        isOpen={categoryOpen}
        organizationId={orgId}
        onClose={() => setCategoryOpen(false)}
        onChanged={() => void load()}
        onError={(message) => showToast(message, 'error')}
        onToast={showToast}
      />

      <ProductBulkImportModal
        isOpen={bulkImportOpen}
        organizationId={orgId!}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => {
          showToast('상품 일괄 등록이 완료되었습니다.', 'success');
          void load();
        }}
      />
    </div>
  );
};
