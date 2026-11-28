import { useEffect, useState, type FC } from 'react';
import { Button } from '@/shared/components/ui';

interface Props {
  value: number;
  disabled?: boolean;
  saving?: boolean;
  onSave: (next: number) => void;
}

/** 상품 안전재고. 재고 목록에서 수량만 저장한다. */
export const SafetyStockEditor: FC<Props> = ({ value, disabled = false, saving = false, onSave }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const parsed = Number(draft);
  const unchanged = Number.isFinite(parsed) && Math.floor(parsed) === value;

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={draft}
        disabled={disabled || saving}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="안전재고"
        className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-2 text-base font-bold tabular-nums text-slate-900"
      />
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={disabled || saving || unchanged || !Number.isFinite(parsed) || parsed < 0}
        isLoading={saving}
        onClick={() => onSave(parsed)}
      >
        저장
      </Button>
    </div>
  );
};
