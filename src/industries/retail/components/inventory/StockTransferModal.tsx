import { useEffect, useMemo, useState, type FormEvent, type FC } from 'react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryStockRow } from '../../types/inventory';
import type { StockLocation } from '@/capabilities/commerce/stock';
import { INVENTORY_LIST_COPY as COPY } from './inventoryListCopy';

interface Props {
  isOpen: boolean;
  organizationId: string;
  stockRows: InventoryStockRow[];
  locations: StockLocation[];
  fromLocationId: string;
  initialRow?: InventoryStockRow | null;
  onClose: () => void;
  onCompleted: () => void;
  onError: (message: string) => void;
}

export const StockTransferModal: FC<Props> = ({
  isOpen,
  organizationId,
  stockRows,
  locations,
  fromLocationId,
  initialRow,
  onClose,
  onCompleted,
  onError,
}) => {
  const [rowKey, setRowKey] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const toOptions = useMemo(
    () => locations.filter((loc) => loc.id !== fromLocationId),
    [locations, fromLocationId]
  );

  const selectedRow = useMemo(
    () => stockRows.find((r) => r.key === rowKey) ?? null,
    [stockRows, rowKey]
  );

  useEffect(() => {
    if (!isOpen) return;
    setRowKey(initialRow?.key || stockRows[0]?.key || '');
    setToLocationId(toOptions[0]?.id || '');
    setQuantity('');
    setMemo('');
  }, [isOpen, initialRow, stockRows, toOptions]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!selectedRow) {
      onError(COPY.transferNeedProduct);
      return;
    }
    if (!toLocationId) {
      onError(COPY.transferNeedTo);
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      onError(COPY.transferNeedQty);
      return;
    }

    setSaving(true);
    try {
      await inventoryService.transferBetweenLocations({
        organizationId,
        productId: selectedRow.productId,
        variantId: selectedRow.variantId,
        fromLocationId,
        toLocationId,
        quantity: qty,
        reason: memo.trim() || null,
      });
      onCompleted();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.transferError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.transferTitle} maxWidth="md">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <p className="text-xs text-slate-500">{COPY.transferHint}</p>

        <FormField label={COPY.transferProduct} required>
          <select
            required
            value={rowKey}
            onChange={(e) => setRowKey(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            {stockRows.map((row) => (
              <option key={row.key} value={row.key}>
                {row.variantName
                  ? `${row.productName} (${row.variantName})`
                  : row.productName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={COPY.transferTo} required>
          <select
            required
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
          >
            {toOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.code === 'central' ? ' (중앙)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={COPY.transferQty} required>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder={
              selectedRow != null
                ? `${COPY.inboundCurrentQty}: ${selectedRow.quantity}`
                : undefined
            }
          />
        </FormField>

        <FormField label={COPY.inboundMemo}>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            placeholder={COPY.transferMemoPlaceholder}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || toOptions.length === 0}
            className="min-h-[44px] px-4 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.inboundSaving : COPY.transferSubmit}
          </button>
        </div>
      </form>
    </Modal>
  );
};
