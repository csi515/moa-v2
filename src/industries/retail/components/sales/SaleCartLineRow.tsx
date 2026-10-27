import { useState, type FC } from 'react';
import { Minus, Plus, Trash2, Tag, Check, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { cartLineAmount, type SaleCartLine } from '../../types/sale';
import { SALE_POS_COPY as COPY } from './salePosCopy';

interface Props {
  line: SaleCartLine;
  compact?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  onApplyDiscount?: (discountAmount: number) => void;
}

export const SaleCartLineRow: FC<Props> = ({
  line,
  compact,
  onDecrease,
  onIncrease,
  onRemove,
  onApplyDiscount,
}) => {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'won' | 'percent'>('won');

  const baseLineTotal = Math.max(0, line.unitPrice) * Math.max(0, line.quantity);
  const finalLineAmount = cartLineAmount(line);
  const hasDiscount = Boolean(line.discountAmount && line.discountAmount > 0);

  const handleSaveDiscount = () => {
    if (!onApplyDiscount) return;
    const n = Number(discountInput.replace(/[^\d]/g, '')) || 0;
    let finalDiscount = 0;
    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, n));
      finalDiscount = Math.round((baseLineTotal * pct) / 100);
    } else {
      finalDiscount = Math.min(baseLineTotal, Math.max(0, n));
    }
    onApplyDiscount(finalDiscount);
    setEditingDiscount(false);
    setDiscountInput('');
  };

  const handleRemoveDiscount = () => {
    if (onApplyDiscount) {
      onApplyDiscount(0);
    }
    setEditingDiscount(false);
  };

  return (
    <div className={`space-y-1.5 ${compact ? 'pb-2' : 'py-3'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-slate-900 truncate ${compact ? 'text-sm' : ''}`}>
            {line.productName}
          </p>
          <p className="text-xs text-slate-500">{line.variantName ?? COPY.singleOption}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                {formatCurrency(baseLineTotal)}
              </span>
            )}
            <p className="text-sm font-bold tabular-nums text-slate-900">
              {formatCurrency(finalLineAmount)}
            </p>
            {hasDiscount && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                -{formatCurrency(line.discountAmount!)}
              </span>
            )}
            {onApplyDiscount && !editingDiscount && (
              <button
                type="button"
                onClick={() => {
                  setEditingDiscount(true);
                  setDiscountInput(line.discountAmount ? String(line.discountAmount) : '');
                }}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-teal-50 cursor-pointer"
                title="품목 할인 적용"
              >
                <Tag className="w-3 h-3" />
                <span>{hasDiscount ? '할인수정' : '할인'}</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={COPY.decreaseQty}
            onClick={onDecrease}
            className="w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-7 sm:w-8 text-center font-bold tabular-nums text-slate-900 text-sm">
            {line.quantity}
          </span>
          <button
            type="button"
            aria-label={COPY.increaseQty}
            onClick={onIncrease}
            className="w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={COPY.remove}
            onClick={onRemove}
            className="w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 품목 즉석 할인 인라인 설정기 */}
      {editingDiscount && onApplyDiscount && (
        <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setDiscountType('won')}
              className={`px-2 py-1 font-bold ${
                discountType === 'won' ? 'bg-teal-600 text-white' : 'text-slate-600'
              }`}
            >
              원
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className={`px-2 py-1 font-bold ${
                discountType === 'percent' ? 'bg-teal-600 text-white' : 'text-slate-600'
              }`}
            >
              %
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveDiscount();
              if (e.key === 'Escape') setEditingDiscount(false);
            }}
            placeholder={discountType === 'won' ? '할인 금액' : '할인율(%)'}
            className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold tabular-nums text-slate-900"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveDiscount}
            className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold flex items-center gap-0.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> 적용
          </button>
          {hasDiscount && (
            <button
              type="button"
              onClick={handleRemoveDiscount}
              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
            >
              해제
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingDiscount(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
