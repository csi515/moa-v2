import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, HelpCircle, CreditCard } from 'lucide-react';
import type { LegalPageId } from './legalPaths';
import { PricingContent, PrivacyContent, SupportContent, TermsContent } from './legalContent';
import { useLegalNavigation } from './useLegalNavigation';

interface LegalPageViewProps {
  page: LegalPageId;
}

const PAGE_TITLES: Record<LegalPageId, string> = {
  terms: '서비스 이용약관',
  privacy: '개인정보처리방침',
  support: '고객 지원 센터',
  pricing: '요금제 안내',
};

export const LegalPageView: React.FC<LegalPageViewProps> = ({ page }) => {
  const { goBack } = useLegalNavigation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="p-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600"
                aria-label="뒤로 가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">{PAGE_TITLES[page]}</h1>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-50"
            >
              로그인 / 회원가입
            </Link>
          </div>

          {/* 3대 법적 고지 탭 네비게이션 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-2.5">
            <Link
              to="/terms"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                page === 'terms'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              서비스 이용약관
            </Link>
            <Link
              to="/privacy"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                page === 'privacy'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              개인정보처리방침
            </Link>
            <Link
              to="/support"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                page === 'support'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              고객 지원
            </Link>
            <Link
              to="/pricing"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                page === 'pricing'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              요금제
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          {page === 'privacy' && <PrivacyContent />}
          {page === 'terms' && <TermsContent />}
          {page === 'support' && <SupportContent />}
          {page === 'pricing' && <PricingContent />}
        </div>
      </main>
    </div>
  );
};
