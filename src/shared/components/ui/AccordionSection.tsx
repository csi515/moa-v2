import React, { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** 공통 아코디언 섹션 */
export const AccordionSection: React.FC<Props> = ({
  title,
  description,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
};
