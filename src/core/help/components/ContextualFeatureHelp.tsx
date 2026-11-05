import { useMemo, useState, type FC } from 'react';
import { BookOpen, X } from 'lucide-react';
import { findFeatureGuideForTab } from '../findFeatureGuideForTab';
import { EDUCATION_ROLE_BLURB } from '../educationCopy';

interface ContextualFeatureHelpProps {
  industryType?: string | null;
  activeTab?: string | null;
}

/**
 * 현재 탭에 맞는 featureGuides 항목을 “사용법” 칩/시트로 노출한다.
 * Composition(셸)에서 industry·tab을 props로 넘긴다 (Core→AppContext 금지).
 */
export const ContextualFeatureHelp: FC<ContextualFeatureHelpProps> = ({
  industryType,
  activeTab,
}) => {
  const [open, setOpen] = useState(false);

  const guide = useMemo(
    () => findFeatureGuideForTab(industryType, activeTab),
    [industryType, activeTab]
  );

  if (!guide) return null;

  return (
    <div className="mb-3" data-testid="contextual-feature-help">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors"
        aria-expanded={open}
        data-testid="contextual-feature-help-chip"
      >
        <BookOpen className="w-3.5 h-3.5" />
        이 화면 사용법
      </button>

      {open && (
        <div
          className="mt-2 rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs relative"
          data-testid="contextual-feature-help-sheet"
          role="region"
          aria-label="화면 사용법"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            {guide.sectionTitle}
          </p>
          <h3 className="text-sm font-black text-slate-900 mt-1 pr-10">{guide.item.title}</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{guide.item.summary}</p>
          {guide.item.howTo && (
            <p className="text-[11px] text-indigo-800 mt-2.5 bg-indigo-50 rounded-xl px-3 py-2 leading-relaxed">
              사용 팁: {guide.item.howTo}
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-2">{EDUCATION_ROLE_BLURB.featureHelp}</p>
        </div>
      )}
    </div>
  );
};
