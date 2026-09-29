import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  INDUSTRY_CATEGORY_OPTIONS,
  listIndustriesByCategory,
  listIndustryDefinitions,
  type IndustryCategory,
  type IndustryType,
  getIndustryCategoryForType,
  getIndustryCategoryLabel,
  getIndustryLabel,
} from './types';
import { CATEGORY_ICONS, DEFAULT_INDUSTRY_ICON, INDUSTRY_ICONS } from './industryIcons';

interface IndustryPickerProps {
  value: IndustryType;
  onChange: (value: IndustryType) => void;
  /** compact: 가입 폼용 / default: 마법사용 */
  variant?: 'default' | 'compact';
}

const selectedBtn =
  'border-indigo-500 bg-indigo-50 text-indigo-900';
const idleBtn = 'border-slate-200 hover:border-slate-300';

/**
 * Category → Industry 2단계 업종 선택.
 * selectable=true 업종만 노출. Mobile-first, 터치 영역 44px+.
 */
export function IndustryPicker({ value, onChange, variant = 'default' }: IndustryPickerProps) {
  const selectableIndustries = useMemo(
    () => listIndustryDefinitions({ selectableOnly: true }),
    []
  );

  const categoriesWithIndustries = useMemo(
    () =>
      INDUSTRY_CATEGORY_OPTIONS.filter(
        (opt) => listIndustriesByCategory(opt.id).length > 0
      ),
    []
  );

  const initialCategory = getIndustryCategoryForType(value);
  const [step, setStep] = useState<'category' | 'industry'>(
    selectableIndustries.length <= 1 || categoriesWithIndustries.length <= 1
      ? 'industry'
      : 'category'
  );
  const [category, setCategory] = useState<IndustryCategory>(
    categoriesWithIndustries[0]?.id ?? initialCategory
  );

  useEffect(() => {
    if (selectableIndustries.length === 1 && value !== selectableIndustries[0].id) {
      onChange(selectableIndustries[0].id);
    }
  }, [selectableIndustries, value, onChange]);

  const industries = useMemo(() => {
    if (selectableIndustries.length <= 1) return selectableIndustries;
    if (categoriesWithIndustries.length <= 1) {
      return listIndustriesByCategory(categoriesWithIndustries[0]?.id ?? category);
    }
    return listIndustriesByCategory(category);
  }, [selectableIndustries, categoriesWithIndustries, category]);

  const selectedLabel = getIndustryLabel(value);
  const categoryLabel = getIndustryCategoryLabel(category);
  const gap = variant === 'compact' ? 'gap-2' : 'gap-2.5';
  const pad = variant === 'compact' ? 'p-3' : 'p-3.5';
  const selectedCategory = getIndustryCategoryForType(value);
  const showCategoryStep =
    selectableIndustries.length > 1 && categoriesWithIndustries.length > 1;

  if (showCategoryStep && step === 'category') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-600">업종 분류</p>
          {value && (
            <p className="text-[11px] text-slate-500 truncate">
              선택: <span className="font-semibold text-indigo-700">{selectedLabel}</span>
            </p>
          )}
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${gap}`}>
          {categoriesWithIndustries.map((opt) => {
            const Icon = CATEGORY_ICONS[opt.id];
            const selected = selectedCategory === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCategory(opt.id);
                  setStep('industry');
                }}
                className={`flex items-center gap-3 ${pad} rounded-xl border text-left min-h-[44px] transition-colors ${
                  selected ? selectedBtn : idleBtn
                }`}
              >
                <Icon className="w-5 h-5 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <span className="text-sm font-bold block">{opt.label}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showCategoryStep && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('category')}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 min-h-[44px] min-w-[44px] px-2 -ml-2 rounded-lg hover:bg-slate-50"
            aria-label="분류로 돌아가기"
          >
            <ChevronLeft className="w-4 h-4" />
            {categoryLabel}
          </button>
        </div>
      )}
      {!showCategoryStep && (
        <p className="text-xs font-bold text-slate-600">업종</p>
      )}
      <div className={`grid grid-cols-1 ${gap}`}>
        {industries.map((opt) => {
          const Icon = INDUSTRY_ICONS[opt.id] ?? DEFAULT_INDUSTRY_ICON;
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-3 ${pad} rounded-xl border text-left min-h-[44px] transition-colors ${
                selected ? selectedBtn : idleBtn
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-bold block">{opt.label}</span>
                <span className="text-[11px] text-slate-500 line-clamp-1">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
