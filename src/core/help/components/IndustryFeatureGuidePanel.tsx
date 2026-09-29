import type { FC } from 'react';
import { BookOpen } from 'lucide-react';
import type { IndustryType } from '@/core/industry/types';
import { AccordionSection } from '@/shared/components/ui/AccordionSection';
import { SettingsCard } from '@/shared/components/ui/SettingsCard';
import { getIndustryFeatureGuide } from '../featureGuides';

interface Props {
  industry: IndustryType;
}

/** 업종별 기능 설명서 (사업주용) */
export const IndustryFeatureGuidePanel: FC<Props> = ({ industry }) => {
  const { intro, sections } = getIndustryFeatureGuide(industry);

  return (
    <SettingsCard>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900">{intro.title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{intro.body}</p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <AccordionSection
            key={section.id}
            title={section.title}
            description={section.description}
          >
            <ul className="divide-y divide-slate-50 px-4 py-1">
              {section.items.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.summary}</p>
                  {item.howTo && (
                    <p className="text-[11px] text-indigo-700 mt-1.5 bg-indigo-50 rounded-lg px-2 py-1.5 leading-relaxed">
                      사용 팁: {item.howTo}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </AccordionSection>
        ))}
      </div>
    </SettingsCard>
  );
};
