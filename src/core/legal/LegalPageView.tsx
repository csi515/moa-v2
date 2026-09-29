import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { LegalPageId } from './legalPaths';
import { PrivacyContent, SupportContent, TermsContent } from './legalContent';
import { useLegalNavigation } from './useLegalNavigation';

interface LegalPageViewProps {
  page: LegalPageId;
}

const PAGE_TITLES: Record<LegalPageId, string> = {
  privacy: '개인정보처리방침',
  terms: '서비스 이용약관',
  support: '고객 지원',
};

export const LegalPageView: React.FC<LegalPageViewProps> = ({ page }) => {
  const { goBack } = useLegalNavigation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{PAGE_TITLES[page]}</h1>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-8 space-y-4 text-sm text-slate-700 leading-relaxed">
        {page === 'privacy' && <PrivacyContent />}
        {page === 'terms' && <TermsContent />}
        {page === 'support' && <SupportContent />}
      </article>
    </div>
  );
};
