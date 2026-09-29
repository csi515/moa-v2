import type { FC } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { cartLineAmount, type SaleCartLine } from '../../types/sale';
import { SALE_POS_COPY as COPY } from './salePosCopy';

interface Props {
  line: SaleCartLine;
  compact?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export const SaleCartLineRow: FC<Props> = ({
  line,
  compact,
  onDecrease,
  onIncrease,
  onRemove,
}) => (
  <div className={`flex items-start gap-2 ${compact ? 'pb-2' : 'py-3'}`}>
    <div className="min-w-0 flex-1">
      <p className={`font-bold text-slate-900 truncate ${compact ? 'text-sm' : ''}`}>
        {line.productName}
      </p>
      <p className="text-xs text-slate-500">{line.variantName ?? COPY.singleOption}</p>
      <p className="text-sm font-bold tabular-nums text-slate-800 mt-1">
        {formatCurrency(cartLineAmount(line))}
      </p>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        aria-label={COPY.decreaseQty}
        onClick={onDecrease}
        className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-700"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center font-bold tabular-nums text-slate-900">
        {line.quantity}
      </span>
      <button
        type="button"
        aria-label={COPY.increaseQty}
        onClick={onIncrease}
        className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-700"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label={COPY.remove}
        onClick={onRemove}
        className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-rose-500"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);
