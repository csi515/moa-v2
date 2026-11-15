import { useEffect, useMemo, useState, useCallback, type FormEvent, type FC } from 'react';
import { Barcode, Sparkles } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { useBarcodeScanner, playScannerSound } from '@/capabilities/inventory';
import { formatCurrency } from '@/utils/formatters';
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
  /** 부서/자재 창고. 미지정 시 central */
  stockLocationId?: string | null;
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
  stockLocationId,
  onClose,
  onCompleted,
  onError,
}) => {
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  // 핸드스캐너(HID) 바코드 입고 자동 매칭
  const handleBarcodeScan = useCallback(
    (code: string) => {
      if (!isOpen) return;
      const clean = code.trim();
      if (!clean) return;

      const matched = stockRows.find(
        (r) => r.productCode === clean || r.productName.toLowerCase() === clean.toLowerCase()
      );
      if (matched) {
        setProductId(matched.productId);
        if (matched.variantId) {
          setVariantId(matched.variantId);
        } else {
          setVariantId('');
        }
        playScannerSound('success');
        setScannedFeedback(`${matched.productName}${matched.variantName ? ` (${matched.variantName})` : ''}`);
        setTimeout(() => setScannedFeedback(null), 2500);
      } else {
        playScannerSound('error');
      }
    },
    [isOpen, stockRows]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: isOpen,
    feedbackOnScan: false,
  });

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
    setUnitCost('');
    setVendorName('');
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
      let reasonText = memo.trim();
      const costNum = Number(unitCost);
      const vendorClean = vendorName.trim();
      const headerTags: string[] = [];
      if (vendorClean) {
        headerTags.push(`[공급처: ${vendorClean}]`);
      }
      if (Number.isFinite(costNum) && costNum > 0) {
        const totalCost = costNum * qty;
        headerTags.push(`[매입단가: ${formatCurrency(costNum)}, 총매입: ${formatCurrency(totalCost)}]`);
      }
      if (headerTags.length > 0) {
        const tagStr = headerTags.join(' ');
        reasonText = reasonText ? `${tagStr} ${reasonText}` : tagStr;
      }

      const result = await inventoryService.applyInbound({
        organizationId,
        productId,
        variantId: needsVariant ? variantId : null,
        quantity: qty,
        reason: reasonText || null,
        stockLocationId: stockLocationId ?? null,
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
        {/* 바코드 스캐너 안내 및 스캔 성공 피드백 */}
        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-teal-600" />
            <span>바코드 스캐너를 비추면 해당 품목이 자동 선택됩니다.</span>
          </div>
          {scannedFeedback && (
            <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full animate-pulse">
              <Sparkles className="w-3 h-3" />
              {scannedFeedback} 선택됨
            </span>
          )}
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={COPY.inboundQty} required>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] font-bold tabular-nums`}
              placeholder="1"
            />
          </FormField>
          <FormField label="개당 매입 단가 (원, 선택)">
            <input
              type="number"
              min={0}
              step={1}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px] tabular-nums`}
              placeholder="예: 5000"
            />
          </FormField>
        </div>

        {Number(quantity) > 0 && Number(unitCost) > 0 && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between text-xs text-teal-900">
            <span className="font-semibold">총 매입 예정 금액:</span>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(Number(quantity) * Number(unitCost))}
            </span>
          </div>
        )}

        <FormField label="매입 거래처 (공급업체, 선택)">
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder="예: (주)대한물류, 서울총판"
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
