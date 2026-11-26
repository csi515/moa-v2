import type { FC } from 'react';
import { ArrowRight, Settings } from 'lucide-react';

interface OnboardingResumeCardProps {
  stepLabel?: string;
  onContinue: () => void;
  onSkip: () => void;
}

/** 홈 — 미완료 온보딩 이어하기 (단정하고 슬림한 B2B 인라인 Alert Bar) */
export const OnboardingResumeCard: FC<OnboardingResumeCardProps> = ({
  stepLabel,
  onContinue,
  onSkip,
}) => (
  <section
    aria-label="초기 운영 설정 이어하기"
    className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
          초기 운영 설정이 완료되지 않았습니다
        </p>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {stepLabel
            ? `마지막 진행: ${stepLabel} · 언제든 설정 메뉴에서 추가 입력할 수 있습니다.`
            : '필수 기본 정보를 입력하면 바로 운영을 시작할 수 있습니다.'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
      <button
        type="button"
        onClick={onSkip}
        className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-md transition-colors min-h-[32px]"
      >
        나중에 하기
      </button>
      <button
        type="button"
        onClick={onContinue}
        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-md transition-colors inline-flex items-center gap-1 shadow-2xs min-h-[32px]"
      >
        <span>이어서 설정</span>
        <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
      </button>
    </div>
  </section>
);
