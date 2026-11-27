interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: any) => void;
  /** Tailwind 활성 색 (예: bg-slate-900) */
  activeClassName?: string;
  className?: string;
  /** 모바일에서 전체 너비 */
  fullWidth?: boolean;
  'aria-label'?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  activeClassName = 'bg-slate-900 text-white shadow-2xs font-semibold',
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${
        fullWidth ? 'flex w-full overflow-x-auto no-scrollbar' : 'inline-flex'
      } rounded-lg border border-slate-200 p-1 bg-slate-100/80 ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            id={`segment-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={`px-3 sm:px-4 py-1.5 text-xs rounded-md min-h-[36px] whitespace-nowrap transition-all cursor-pointer ${
              fullWidth ? 'flex-1 text-center' : 'shrink-0'
            } ${active ? activeClassName : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
