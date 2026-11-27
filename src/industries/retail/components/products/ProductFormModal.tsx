import { useEffect, useState, useCallback, type FormEvent, type FC } from 'react';
import { Plus, Trash2, Barcode, Sparkles, RefreshCw } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS, SegmentedControl } from '@/shared/components/ui';
import { useBarcodeScanner, playScannerSound } from '@/capabilities/inventory';
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
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [showBarcodeOption, setShowBarcodeOption] = useState(false);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [optionMode, setOptionMode] = useState<OptionMode>('none');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState(false);

  // 기성품 바코드 핸드스캐너(HID) 자동 입력 리스너 (바코드 옵션 활성화 시에만 수신)
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      if (!isOpen || !showBarcodeOption) return;
      const clean = code.trim();
      if (clean) {
        setProductCode(clean);
        setLastScannedFeedback(true);
        setTimeout(() => setLastScannedFeedback(false), 1500);
      }
    },
    [isOpen, showBarcodeOption]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: isOpen && showBarcodeOption,
    feedbackOnScan: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const hydrate = async () => {
      setHydrating(true);
      if (!editing) {
        setName('');
        setProductCode('');
        setShowBarcodeOption(false);
        setPrice('');
        setCost('');
        setInitialStock('');
        setCategoryId('');
        setNewCategoryName('');
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
      const code = editing.productCode || '';
      setProductCode(code);
      setShowBarcodeOption(Boolean(code));
      setPrice(String(editing.price));
      setCost(editing.cost != null ? String(editing.cost) : '');
      setCategoryId(editing.categoryId || '');
      setNewCategoryName('');
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

  const handleGenerateInternalCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const generated = `NB-${dateStr}-${randomSuffix}`;
    setProductCode(generated);
    setShowBarcodeOption(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving || hydrating) return;

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      onError('판매가격을 입력해 주세요.');
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
          productCode: productCode.trim() || null,
          price: priceNum,
          cost: parseOptionalNumber(cost),
          categoryId: categoryId || null,
          newCategoryName: categoryId ? null : newCategoryName.trim() || null,
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
            placeholder="상품명 입력 (예: 둥근머리 볼트 M6, 방수 절연테이프, 배관 엘보 15A)"
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

        {/* 카테고리 및 초기 재고 수량 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={COPY.categoryLabel}>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (e.target.value) setNewCategoryName('');
              }}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            >
              <option value="">{COPY.categoryNone}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          {!editing && optionMode === 'none' ? (
            <FormField
              label="현재고 수량 (초기 입고)"
              hint="입력한 수량만큼 즉시 재고가 등록됩니다"
            >
              <input
                type="number"
                min={0}
                step={1}
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums text-teal-800 bg-teal-50/40 border-teal-200 focus:border-teal-500`}
                placeholder="0 (현재 매장 보유 수량)"
              />
            </FormField>
          ) : (
            <div className="flex items-center">
              <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                {COPY.activeLabel} ({isActive ? COPY.statusActive : COPY.statusInactive})
              </label>
            </div>
          )}
        </div>

        {!categoryId && (
          <FormField label={COPY.newCategoryLabel}>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={COPY.newCategoryPlaceholder}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </FormField>
        )}

        {!editing && optionMode === 'none' && (
          <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            {COPY.activeLabel} ({isActive ? COPY.statusActive : COPY.statusInactive})
          </label>
        )}

        {/* 규격 및 옵션 설정 */}
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
        </div>

        {/* 보조 옵션: 바코드/관리코드 (기본 접힘) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowBarcodeOption((prev) => !prev)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Barcode className="w-4 h-4 text-slate-400" />
            <span>{showBarcodeOption ? '바코드/식별코드 접기' : '바코드/식별코드 입력 (선택)'}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {showBarcodeOption ? '▲' : '▼ (무바코드 상품은 비워두셔도 됩니다)'}
            </span>
          </button>

          {showBarcodeOption && (
            <div className="mt-2 space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700">
                  기성품 바코드 / 고유 관리코드
                </label>
                <button
                  type="button"
                  onClick={handleGenerateInternalCode}
                  className="text-[11px] font-bold text-slate-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  title="바코드가 없는 제품용 임의 고유 코드 생성"
                >
                  <RefreshCw className="w-3 h-3" /> 관리코드 자동생성
                </button>
              </div>

              <div className="relative">
                <input
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className={`${FORM_CONTROL_CLASS} min-h-[44px] font-mono text-sm`}
                  placeholder="바코드 번호 입력 (스캐너 인식 시 자동 기입)"
                  autoComplete="off"
                />
              </div>
              {lastScannedFeedback && (
                <p className="text-[11px] font-bold text-teal-600 flex items-center gap-0.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" /> 스캐너로 입력되었습니다!
                </p>
              )}
            </div>
          )}
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
                    <button
                      type="button"
                      onClick={() =>
                        setVariants((prev) => prev.filter((v) => v.key !== row.key))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 min-h-[44px] px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {COPY.removeOption}
                    </button>
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
                  <FormField label="옵션 초기 입고 재고 (개)">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.initialStock || ''}
                      onChange={(e) => updateVariant(row.key, { initialStock: e.target.value })}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px] tabular-nums text-teal-700 bg-teal-50/30 border-teal-200`}
                      placeholder="0 (선택)"
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

            <button
              type="button"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  emptyVariant({ price: Number(price) || undefined }),
                ])
              }
              className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-dashed border-teal-300 text-teal-700 text-sm font-bold bg-teal-50/50"
            >
              <Plus className="w-4 h-4" />
              {COPY.addOption}
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
          >
            {COPY.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || hydrating}
            className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.saving : COPY.save}
          </button>
        </div>
      </form>
    </Modal>
  );
};
