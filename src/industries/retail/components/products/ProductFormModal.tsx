import { useEffect, useState, type FormEvent, type FC } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Modal } from '@/shared/components';
import { Button, FORM_ACTION_BUTTON_CLASS, FormField, FORM_CONTROL_CLASS, SegmentedControl } from '@/shared/components/ui';
import { useApp } from '@/context/AppContext';
import { openRetailSettingsPanel } from '../settings/retailSettingsIntent';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import type {
  ProductCategory,
  ProductListItem,
  ProductVariantSaveInput,
} from '../../types/product';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';

type OptionMode = 'none' | 'yes';

type VariantDraft = {
  /** 기존 DB id — 편집 시 유지 */
  id?: string;
  /** 폼 행 키 */
  key: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  initialStock?: string;
  isActive: boolean;
};

function emptyVariant(defaults?: { price?: number }): VariantDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    sku: '',
    price: defaults?.price != null ? String(defaults.price) : '',
    cost: '',
    initialStock: '',
    isActive: true,
  };
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  isOpen: boolean;
  organizationId: string;
  categories: ProductCategory[];
  editing: ProductListItem | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
  /** apparel_store businessRules.sizeColorSkuSupport */
  requireSizeColorVariants?: boolean;
}

export const ProductFormModal: FC<Props> = ({
  isOpen,
  organizationId,
  categories,
  editing,
  onClose,
  onSaved,
  onError,
  requireSizeColorVariants = false,
}) => {
  const { setActiveTab, openConfirmDialog } = useApp();
  const selectableCategories = categories.filter((category) => category.isActive);
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [productCode, setProductCode] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [safetyStock, setSafetyStock] = useState('0');
  const [initialStock, setInitialStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [optionMode, setOptionMode] = useState<OptionMode>('none');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const hydrate = async () => {
      setHydrating(true);
      if (!editing) {
        setName('');
        setSpec('');
        setProductCode('');
        setPrice('');
        setCost('');
        setSafetyStock('0');
        setInitialStock('');
        setCategoryId('');
        setIsActive(true);
        setOptionMode(requireSizeColorVariants ? 'yes' : 'none');
        setVariants([
          emptyVariant(),
          ...(requireSizeColorVariants ? [emptyVariant(), emptyVariant()] : []),
        ]);
        setHydrating(false);
        return;
      }

      setName(editing.name);
      setSpec(editing.spec || '');
      const code = editing.productCode || '';
      setProductCode(code);
      setPrice(String(editing.price));
      setCost(editing.cost != null ? String(editing.cost) : '');
      setSafetyStock(String(editing.safetyStock ?? 0));
      setCategoryId(editing.categoryId || '');
      setIsActive(editing.isActive);

      try {
        const rows = await productService.listVariants(editing.id);
        if (cancelled) return;
        if (rows.length === 0) {
          setOptionMode('none');
          setVariants([emptyVariant({ price: editing.price })]);
        } else {
          setOptionMode('yes');
          setVariants(
            rows.map((v) => ({
              id: v.id,
              key: v.id,
              name: v.name,
              sku: v.sku || '',
              price: v.price != null ? String(v.price) : '',
              cost: v.cost != null ? String(v.cost) : '',
              isActive: v.isActive,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setOptionMode(editing.variantCount > 0 ? 'yes' : 'none');
          setVariants([emptyVariant({ price: editing.price })]);
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [isOpen, editing, requireSizeColorVariants]);

  const updateVariant = (key: string, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  const goToCategorySettings = () => {
    const leave = () => {
      openRetailSettingsPanel('categories');
      onClose();
      setActiveTab('settings');
    };
    const dirty = Boolean(
      name.trim() || spec.trim() || price.trim() || cost.trim() || productCode.trim()
    );
    if (!dirty) {
      leave();
      return;
    }
    openConfirmDialog({
      title: COPY.categoryLeaveTitle,
      message: COPY.categoryLeaveMessage,
      confirmText: COPY.categoryLeaveConfirm,
      cancelText: COPY.cancel,
      onConfirm: leave,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving || hydrating) return;

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      onError('판매가격을 입력해 주세요.');
      return;
    }

    const safetyNum = Number(safetyStock);
    if (!Number.isFinite(safetyNum) || safetyNum < 0) {
      onError('안전재고는 0 이상의 수량이어야 합니다.');
      return;
    }

    let variantPayload: ProductVariantSaveInput[] = [];
    if (optionMode === 'yes') {
      const named = variants.filter((v) => v.name.trim());
      if (named.length === 0) {
        onError(COPY.optionRequired);
        return;
      }
      variantPayload = named.map((v) => ({
        id: v.id,
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        price: parseOptionalNumber(v.price),
        cost: parseOptionalNumber(v.cost),
        isActive: v.isActive,
      }));
    }

    setSaving(true);
    try {
      const savedProduct = await productService.saveProduct(
        organizationId,
        {
          name,
          spec: spec.trim() || null,
          productCode: productCode.trim() || null,
          price: priceNum,
          cost: parseOptionalNumber(cost),
          safetyStock: Math.floor(safetyNum),
          categoryId: categoryId || null,
          newCategoryName: null,
          isActive,
          variants: optionMode === 'none' ? [] : variantPayload,
        },
        editing?.id
      );

      // 신규 등록 시 기초 입고 재고 자동 반영 (0개 초과 시)
      if (!editing && savedProduct?.id) {
        if (optionMode === 'none') {
          const initQty = Number(initialStock);
          if (Number.isFinite(initQty) && initQty > 0) {
            try {
              await inventoryService.applyInbound({
                organizationId,
                productId: savedProduct.id,
                quantity: initQty,
                reason: '신규 상품 등록 기초 재고',
              });
            } catch (stockErr) {
              console.error('[ProductFormModal] initial stock inbound error', stockErr);
            }
          }
        } else {
          // 옵션별 초기 재고 등록
          const variantsWithStock = variants.filter(
            (v) => Number(v.initialStock) > 0 && v.name.trim()
          );
          if (variantsWithStock.length > 0) {
            try {
              const stockRows = await inventoryService.listStockRows(organizationId);
              for (const vDraft of variantsWithStock) {
                const qty = Number(vDraft.initialStock);
                const matched = stockRows.find(
                  (r) => r.productId === savedProduct.id && r.variantName === vDraft.name.trim()
                );
                if (matched?.variantId) {
                  await inventoryService.applyInbound({
                    organizationId,
                    productId: savedProduct.id,
                    variantId: matched.variantId,
                    quantity: qty,
                    reason: `신규 상품 옵션(${vDraft.name.trim()}) 기초 재고`,
                  });
                }
              }
            } catch (stockErr) {
              console.error('[ProductFormModal] variant stock inbound error', stockErr);
            }
          }
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? COPY.editTitle : COPY.createTitle}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
        <FormField label={COPY.nameLabel} required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            autoComplete="off"
            placeholder="상품명 입력 (예: 둥근머리 볼트, 방수 절연테이프)"
          />
        </FormField>

        <FormField label={COPY.specLabel} hint={COPY.specHint}>
          <input
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            autoComplete="off"
            placeholder={COPY.specPlaceholder}
          />
        </FormField>

        {/* 판매가 및 원가 (전면 2열 배치) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={COPY.priceLabel} required>
            <input
              type="number"
              min={0}
              step={1}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums text-teal-700`}
              placeholder="판매단가 (원)"
            />
          </FormField>
          <FormField label={COPY.costLabel}>
            <input
              type="number"
              min={0}
              step={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums`}
              placeholder="입고원가 (선택)"
            />
          </FormField>
        </div>

        {selectableCategories.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 space-y-2">
            <p className="text-sm text-slate-700">{COPY.categoryFormEmpty}</p>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={goToCategorySettings}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              {COPY.categoryGoSettings}
            </Button>
          </div>
        ) : (
          <FormField label={COPY.categoryLabel} hint={COPY.categoryFormHint}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            >
              <option value="">{COPY.categoryNone}</option>
              {selectableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          {COPY.activeLabel} ({isActive ? COPY.statusActive : COPY.statusInactive})
        </label>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700">{COPY.optionModeLabel}</p>
          {requireSizeColorVariants ? (
            <p className="text-xs text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              의류 매장 프리셋: 사이즈·색상 등 옵션(SKU)을 등록하세요. 옵션명 예: M / 블랙.
            </p>
          ) : null}
          <SegmentedControl
            value={optionMode}
            onChange={(mode) => {
              if (requireSizeColorVariants && mode === 'none') return;
              setOptionMode(mode);
              if (mode === 'yes' && variants.length === 0) {
                setVariants([emptyVariant({ price: Number(price) || undefined })]);
              }
            }}
            options={[
              { value: 'none', label: COPY.optionNone },
              { value: 'yes', label: COPY.optionYes },
            ]}
            activeClassName="bg-teal-600 text-white"
            fullWidth
            aria-label={COPY.optionModeLabel}
          />
          {!editing && optionMode === 'yes' ? (
            <p className="text-xs text-slate-500">{COPY.optionInitialStockHint}</p>
          ) : null}
        </div>

        {optionMode === 'yes' && (
          <div className="space-y-3">
            {variants.map((row, index) => (
              <div
                key={row.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-500">옵션 {index + 1}</p>
                  {variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="default"
                      onClick={() => setVariants((prev) => prev.filter((v) => v.key !== row.key))}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      {COPY.removeOption}
                    </Button>
                  )}
                </div>

                <FormField label={COPY.optionNameLabel} required>
                  <input
                    required={optionMode === 'yes'}
                    value={row.name}
                    onChange={(e) => updateVariant(row.key, { name: e.target.value })}
                    className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    placeholder="예: 빨강 / L"
                  />
                </FormField>

                <FormField label={COPY.optionSkuLabel}>
                  <input
                    value={row.sku}
                    onChange={(e) => updateVariant(row.key, { sku: e.target.value })}
                    className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label={COPY.optionPriceLabel}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.price}
                      onChange={(e) => updateVariant(row.key, { price: e.target.value })}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                      placeholder={price || '기본가'}
                    />
                  </FormField>
                  <FormField label={COPY.optionCostLabel}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.cost}
                      onChange={(e) => updateVariant(row.key, { cost: e.target.value })}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    />
                  </FormField>
                </div>

                {!editing && (
                  <FormField label={COPY.initialStockLabel} hint={COPY.initialStockHint}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.initialStock || ''}
                      onChange={(e) => updateVariant(row.key, { initialStock: e.target.value })}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px] tabular-nums text-teal-700 bg-teal-50/30 border-teal-200`}
                      placeholder="0"
                    />
                  </FormField>
                )}

                <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => updateVariant(row.key, { isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {COPY.optionActiveLabel}
                </label>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  emptyVariant({ price: Number(price) || undefined }),
                ])
              }
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {COPY.addOption}
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3.5 space-y-3">
          <p className="text-xs font-bold text-teal-900">
            {editing || optionMode === 'yes' ? COPY.safetyStockSection : COPY.openingStockSection}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={COPY.safetyStockLabel} hint={COPY.safetyStockHint}>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] text-base font-bold tabular-nums`}
                placeholder="0"
              />
            </FormField>
            {!editing && optionMode === 'none' ? (
              <FormField label={COPY.initialStockLabel} hint={COPY.initialStockHint}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums text-teal-800 bg-white border-teal-200 focus:border-teal-500`}
                  placeholder="0"
                />
              </FormField>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
          <Button
            type="button"
            variant="outline"
            size="default"
            className={FORM_ACTION_BUTTON_CLASS}
            onClick={onClose}
          >
            {COPY.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="default"
            className={FORM_ACTION_BUTTON_CLASS}
            disabled={saving || hydrating}
            isLoading={saving}
          >
            {COPY.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
