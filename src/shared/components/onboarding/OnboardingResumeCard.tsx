import type { FC } from 'react';
import { Sparkles } from 'lucide-react';

interface OnboardingResumeCardProps {
  stepLabel?: string;
  onContinue: () => void;
  onSkip: () => void;
}

/** 홈 — 미완료 온보딩 이어하기 */
export const OnboardingResumeCard: FC<OnboardingResumeCardProps> = ({
  stepLabel,
  onContinue,
  onSkip,
}) => (
  <section className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 space-y-3">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900">학원 초기 설정을 이어서 할까요?</h3>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
          {stepLabel
            ? `마지막 위치: ${stepLabel}. 필수는 학원명뿐이며, 나머지는 나중에 설정해도 됩니다.`
            : '필수는 학원명뿐이며, 나머지는 나중에 설정해도 됩니다.'}
        </p>
      </div>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        onClick={onContinue}
        className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
      >
        이어서 설정
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
      >
        나중에 하기
      </button>
    </div>
  </section>
);
