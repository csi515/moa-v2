import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { saleReturnService } from '../../services/saleReturnService';
import {
  computeReturnLineAmount,
  type SaleItemReturnable,
} from '../../types/saleReturn';
import { SALE_HISTORY_COPY as COPY } from './saleHistoryCopy';

interface Props {
  isOpen: boolean;
  organizationId: string;
  saleId: string;
  lines: SaleItemReturnable[];
  onClose: () => void;
  onCompleted: (refundAmount: number) => void;
  onError: (message: string) => void;
}

export const SaleReturnModal: FC<Props> = ({
  isOpen,
  organizationId,
  saleId,
  lines,
  onClose,
  onCompleted,
  onError,
}) => {
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const returnableLines = useMemo(
    () => lines.filter((line) => line.remainingQuantity > 0),
    [lines]
  );

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    const next: Record<string, string> = {};
    for (const line of returnableLines) {
      next[line.saleItemId] = '';
    }
    setQtyByItem(next);
  }, [isOpen, returnableLines]);

  const selected = useMemo(() => {
    return returnableLines
      .map((line) => {
        const qty = Math.floor(Number(qtyByItem[line.saleItemId]) || 0);
        return { line, qty };
      })
      .filter(({ qty }) => qty > 0);
  }, [returnableLines, qtyByItem]);

  const refundTotal = useMemo(
    () =>
      selected.reduce(
        (sum, { line, qty }) =>
          sum +
          computeReturnLineAmount({
            returnQty: qty,
            soldQty: line.soldQuantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount,
            alreadyReturned: line.returnedQuantity,
          }),
        0
      ),
    [selected]
  );

  const setQty = (saleItemId: string, remaining: number, raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits === '') {
      setQtyByItem((prev) => ({ ...prev, [saleItemId]: '' }));
      return;
    }
    const n = Math.floor(Number(digits));
    if (!Number.isFinite(n) || n < 0) {
      setQtyByItem((prev) => ({ ...prev, [saleItemId]: '' }));
      return;
    }
    setQtyByItem((prev) => ({
      ...prev,
      [saleItemId]: String(Math.min(n, remaining)),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (selected.length === 0) {
      onError(COPY.returnNeedItem);
      return;
    }
    for (const { line, qty } of selected) {
      if (qty > line.remainingQuantity) {
        onError(COPY.returnExceed);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await saleReturnService.createReturn({
        organizationId,
        saleId,
        reason,
        items: selected.map(({ line, qty }) => ({
          saleItemId: line.saleItemId,
          quantity: qty,
        })),
      });
      onCompleted(result.totalAmount);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.returnError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.returnTitle} maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <p className="text-sm text-slate-600">{COPY.returnHint}</p>

          {returnableLines.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              {COPY.returnNoneLeft}
            </p>
          ) : (
            <ul className="space-y-3">
              {returnableLines.map((line) => (
                <li
                  key={line.saleItemId}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                >
                  <p className="font-bold text-sm text-slate-900">
                    {line.productNameSnapshot}
                  </p>
                  <p className="text-xs text-slate-500">
                    {COPY.returnSold} {line.soldQuantity}
                    {COPY.qtyUnit}
                    {line.returnedQuantity > 0
                      ? ` · ${COPY.returnDone} ${line.returnedQuantity}${COPY.qtyUnit}`
                      : ''}
                    {' · '}
                    {COPY.returnRemain} {line.remainingQuantity}
                    {COPY.qtyUnit}
                  </p>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-600">
                      {COPY.returnQty}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={qtyByItem[line.saleItemId] ?? ''}
                      onChange={(e) =>
                        setQty(line.saleItemId, line.remainingQuantity, e.target.value)
                      }
                      disabled={saving}
                      className="w-full min-h-[48px] rounded-xl border border-slate-200 px-3 text-sm font-bold tabular-nums disabled:opacity-60"
                      aria-label={`${line.productNameSnapshot} ${COPY.returnQty}`}
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{COPY.returnReason}</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={COPY.returnReasonPlaceholder}
              disabled={saving}
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-3 text-sm disabled:opacity-60"
            />
          </label>

          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-700">{COPY.returnTotal}</span>
            <span className="text-lg font-bold tabular-nums text-teal-700">
              {formatCurrency(refundTotal)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 p-4 sm:p-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
          >
            {COPY.returnCancel}
          </button>
          <button
            type="submit"
            disabled={saving || returnableLines.length === 0 || selected.length === 0}
            className="flex-[1.4] min-h-[48px] rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? COPY.returnConfirming : COPY.returnConfirm}
          </button>
        </div>
      </form>
    </Modal>
  );
};
