import { useEffect, useState, type FormEvent, type FC } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS, SegmentedControl } from '@/shared/components/ui';
import { productService } from '../../services/productService';
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
  isActive: boolean;
};

function emptyVariant(defaults?: { price?: number }): VariantDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    sku: '',
    price: defaults?.price != null ? String(defaults.price) : '',
    cost: '',
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
}

export const ProductFormModal: FC<Props> = ({
  isOpen,
  organizationId,
  categories,
  editing,
  onClose,
  onSaved,
  onError,
}) => {
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
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
        setProductCode('');
        setPrice('');
        setCost('');
        setCategoryId('');
        setNewCategoryName('');
        setIsActive(true);
        setOptionMode('none');
        setVariants([emptyVariant()]);
        setHydrating(false);
        return;
      }

      setName(editing.name);
      setProductCode(editing.productCode || '');
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
  }, [isOpen, editing]);

  const updateVariant = (key: string, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
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
      await productService.saveProduct(
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
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={COPY.priceLabel} required>
            <input
              type="number"
              min={0}
              step={1}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </FormField>
          <FormField label={COPY.costLabel}>
            <input
              type="number"
              min={0}
              step={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </FormField>
        </div>

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

        <FormField label={COPY.codeLabel}>
          <input
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            autoComplete="off"
          />
        </FormField>

        <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          {COPY.activeLabel} ({isActive ? COPY.statusActive : COPY.statusInactive})
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">{COPY.optionModeLabel}</p>
          <SegmentedControl
            value={optionMode}
            onChange={(mode) => {
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
