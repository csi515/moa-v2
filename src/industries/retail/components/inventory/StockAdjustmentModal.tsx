import { useEffect, useMemo, useState, type FormEvent, type FC } from 'react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { inventoryService } from '../../services/inventoryService';
import {
  STOCK_ADJUSTMENT_REASONS,
  type InventoryStockRow,
  type StockAdjustmentReasonPreset,
} from '../../types/inventory';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';

interface Props {
  isOpen: boolean;
  organizationId: string;
  stockRows: InventoryStockRow[];
  initialRow?: InventoryStockRow | null;
  onClose: () => void;
  onCompleted: (delta: number, quantityAfter: number) => void;
  onError: (message: string) => void;
}

type ProductOption = {
  productId: string;
  productName: string;
  variants: { variantId: string; variantName: string }[];
  isSingle: boolean;
};

export const StockAdjustmentModal: FC<Props> = ({
  isOpen,
  organizationId,
  stockRows,
  initialRow,
  onClose,
  onCompleted,
  onError,
}) => {
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reasonPreset, setReasonPreset] = useState<StockAdjustmentReasonPreset | ''>('');
  const [reasonOther, setReasonOther] = useState('');
  const [saving, setSaving] = useState(false);

  const products = useMemo((): ProductOption[] => {
    const map = new Map<string, ProductOption>();
    for (const row of stockRows) {
      let entry = map.get(row.productId);
      if (!entry) {
        entry = {
          productId: row.productId,
          productName: row.productName,
          variants: [],
          isSingle: row.variantId == null,
        };
        map.set(row.productId, entry);
      }
      if (row.variantId && row.variantName) {
        entry.isSingle = false;
        if (!entry.variants.some((v) => v.variantId === row.variantId)) {
          entry.variants.push({
            variantId: row.variantId,
            variantName: row.variantName,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      a.productName.localeCompare(b.productName, 'ko')
    );
  }, [stockRows]);

  const selectedProduct = products.find((p) => p.productId === productId) ?? null;
  const needsVariant = Boolean(selectedProduct && !selectedProduct.isSingle);

  const currentQty = useMemo(() => {
    if (!productId) return null;
    const row = stockRows.find(
      (r) =>
        r.productId === productId &&
        (needsVariant ? r.variantId === variantId : r.variantId == null)
    );
    return row?.quantity ?? 0;
  }, [stockRows, productId, variantId, needsVariant]);

  const delta = useMemo(() => {
    if (quantity.trim() === '' || quantity.trim() === '-') return null;
    const n = Number(quantity);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n === 0) return null;
    return n;
  }, [quantity]);

  const afterQty =
    currentQty != null && delta != null ? currentQty + delta : null;

  useEffect(() => {
    if (!isOpen) return;
    if (initialRow) {
      setProductId(initialRow.productId);
      setVariantId(initialRow.variantId || '');
    } else {
      setProductId(products[0]?.productId || '');
      const first = products[0];
      setVariantId(first && !first.isSingle ? first.variants[0]?.variantId || '' : '');
    }
    setQuantity('');
    setReasonPreset('');
    setReasonOther('');
  }, [isOpen, initialRow, products]);

  useEffect(() => {
    if (!isOpen || !selectedProduct) return;
    if (selectedProduct.isSingle) {
      setVariantId('');
      return;
    }
    if (!selectedProduct.variants.some((v) => v.variantId === variantId)) {
      setVariantId(selectedProduct.variants[0]?.variantId || '');
    }
  }, [isOpen, selectedProduct, variantId]);

  const resolveReason = (): string | null => {
    if (!reasonPreset) return null;
    if (reasonPreset === '기타') {
      const detail = reasonOther.trim();
      return detail ? `기타: ${detail}` : null;
    }
    return reasonPreset;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!productId) {
      onError(COPY.adjustNeedProduct);
      return;
    }
    if (needsVariant && !variantId) {
      onError(COPY.adjustNeedVariant);
      return;
    }
    if (delta == null) {
      onError(COPY.adjustNeedQty);
      return;
    }
    if (!reasonPreset) {
      onError(COPY.adjustNeedReason);
      return;
    }
    const reason = resolveReason();
    if (!reason) {
      onError(COPY.adjustNeedReasonDetail);
      return;
    }

    setSaving(true);
    try {
      const result = await inventoryService.applyAdjustment({
        organizationId,
        productId,
        variantId: needsVariant ? variantId : null,
        quantity: delta,
        reason,
      });
      onCompleted(delta, result.quantityAfter);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.adjustError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.adjustTitle} maxWidth="md">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <p className="text-xs text-slate-500">{COPY.adjustHint}</p>

        <FormField label={COPY.adjustProduct} required>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            <option value="" disabled>
              {COPY.adjustSelectProduct}
            </option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.productName}
              </option>
            ))}
          </select>
        </FormField>

        {needsVariant && (
          <FormField label={COPY.adjustVariant} required>
            <select
              required
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            >
              <option value="" disabled>
                {COPY.adjustSelectVariant}
              </option>
              {selectedProduct?.variants.map((v) => (
                <option key={v.variantId} value={v.variantId}>
                  {v.variantName}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {currentQty != null && productId && (!needsVariant || variantId) && (
          <p className="text-sm text-slate-700">
            {COPY.adjustCurrentQty}:{' '}
            <span className="font-bold tabular-nums">{currentQty}</span>
            {COPY.qtyUnit}
          </p>
        )}

        <FormField label={COPY.adjustQty} required>
          <input
            type="number"
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder={COPY.adjustQtyPlaceholder}
          />
          <p className="text-[11px] text-slate-400 mt-1">{COPY.adjustQtyHint}</p>
          {afterQty != null && (
            <p className="text-xs text-slate-600 mt-1">
              {COPY.adjustAfterQty}:{' '}
              <span
                className={`font-bold tabular-nums ${
                  afterQty < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {afterQty}
              </span>
              {COPY.qtyUnit}
            </p>
          )}
        </FormField>

        <FormField label={COPY.adjustReason} required>
          <select
            required
            value={reasonPreset}
            onChange={(e) =>
              setReasonPreset(e.target.value as StockAdjustmentReasonPreset | '')
            }
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            <option value="" disabled>
              {COPY.adjustReasonSelect}
            </option>
            {STOCK_ADJUSTMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </FormField>

        {reasonPreset === '기타' && (
          <FormField label={COPY.adjustReasonOther} required>
            <textarea
              required
              value={reasonOther}
              onChange={(e) => setReasonOther(e.target.value)}
              rows={3}
              placeholder={COPY.adjustReasonOtherPlaceholder}
              className={`${FORM_CONTROL_CLASS} min-h-[88px]`}
            />
          </FormField>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
          >
            {COPY.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || products.length === 0 || (afterQty != null && afterQty < 0)}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.adjustSaving : COPY.adjustSubmit}
          </button>
        </div>
      </form>
    </Modal>
  );
};
