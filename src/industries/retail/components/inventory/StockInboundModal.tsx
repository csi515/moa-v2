import { useEffect, useMemo, useState, type FormEvent, type FC } from 'react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryStockRow } from '../../types/inventory';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';

interface Props {
  isOpen: boolean;
  organizationId: string;
  /** 재고 목록(상품·옵션 선택용) */
  stockRows: InventoryStockRow[];
  /** 목록에서 입고 진입 시 사전 선택 */
  initialRow?: InventoryStockRow | null;
  onClose: () => void;
  onCompleted: (quantityAfter: number) => void;
  onError: (message: string) => void;
}

type ProductOption = {
  productId: string;
  productName: string;
  variants: { variantId: string; variantName: string }[];
  /** 옵션 없는 단일 상품 */
  isSingle: boolean;
};

export const StockInboundModal: FC<Props> = ({
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
  const [memo, setMemo] = useState('');
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
    setMemo('');
  }, [isOpen, initialRow, products]);

  // 상품 변경 시 옵션 초기화
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!productId) {
      onError(COPY.inboundNeedProduct);
      return;
    }
    if (needsVariant && !variantId) {
      onError(COPY.inboundNeedVariant);
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      onError(COPY.inboundNeedQty);
      return;
    }

    setSaving(true);
    try {
      const result = await inventoryService.applyInbound({
        organizationId,
        productId,
        variantId: needsVariant ? variantId : null,
        quantity: qty,
        reason: memo.trim() || null,
      });
      onCompleted(result.quantityAfter);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.inboundError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.inboundTitle} maxWidth="md">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <p className="text-xs text-slate-500">{COPY.inboundHint}</p>

        <FormField label={COPY.inboundProduct} required>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            <option value="" disabled>
              {COPY.inboundSelectProduct}
            </option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.productName}
              </option>
            ))}
          </select>
        </FormField>

        {needsVariant && (
          <FormField label={COPY.inboundVariant} required>
            <select
              required
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            >
              <option value="" disabled>
                {COPY.inboundSelectVariant}
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
          <p className="text-xs text-slate-600">
            {COPY.inboundCurrentQty}:{' '}
            <span className="font-bold tabular-nums">{currentQty}</span>
            {COPY.qtyUnit}
          </p>
        )}

        <FormField label={COPY.inboundQty} required>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder="1"
          />
        </FormField>

        <FormField label={COPY.inboundMemo}>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder={COPY.inboundMemoPlaceholder}
            className={`${FORM_CONTROL_CLASS} min-h-[88px]`}
          />
        </FormField>

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
            disabled={saving || products.length === 0}
            className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.inboundSaving : COPY.inboundSubmit}
          </button>
        </div>
      </form>
    </Modal>
  );
};
