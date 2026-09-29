import React from 'react';
import { legalPageHref } from './legalPaths';

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
}

/** 개인정보처리방침 · 이용약관 링크 (스토어 심사·로그인 화면용) */
export const LegalLinks: React.FC<LegalLinksProps> = ({
  className = 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500',
  linkClassName = 'underline hover:text-indigo-600 min-h-[44px] inline-flex items-center px-1',
}) => (
  <nav className={className} aria-label="법적 고지">
    <a href={legalPageHref('privacy')} className={linkClassName}>
      개인정보처리방침
    </a>
    <span aria-hidden="true">·</span>
    <a href={legalPageHref('terms')} className={linkClassName}>
      이용약관
    </a>
    <span aria-hidden="true">·</span>
    <a href={legalPageHref('support')} className={linkClassName}>
      고객 지원
    </a>
  </nav>
);
