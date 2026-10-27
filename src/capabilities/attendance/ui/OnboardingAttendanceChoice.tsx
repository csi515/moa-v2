import type { FC } from 'react';
import { PIN_ATTENDANCE_DIRECTOR_COPY } from '../domain/attendanceNotifyCopy';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/** 온보딩 전용. 설정 화면 토글 문구는 AttendanceFeatureToggle을 유지한다. */
export const OnboardingAttendanceChoice: FC<Props> = ({ enabled, onChange }) => (
  <div className="space-y-4">
    <div>
      <h3 id="onboarding-attendance-title" className="text-base font-bold text-slate-900 leading-snug">
        {PIN_ATTENDANCE_DIRECTOR_COPY.onboardingTitle}
      </h3>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        {PIN_ATTENDANCE_DIRECTOR_COPY.onboardingIntro}
      </p>
    </div>

    <div
      role="radiogroup"
      aria-labelledby="onboarding-attendance-title"
      className="grid grid-cols-1 gap-2"
    >
      <ChoiceButton
        selected={enabled}
        onSelect={() => onChange(true)}
        label={PIN_ATTENDANCE_DIRECTOR_COPY.onboardingYes}
      />
      <ChoiceButton
        selected={!enabled}
        onSelect={() => onChange(false)}
        label={PIN_ATTENDANCE_DIRECTOR_COPY.onboardingNo}
      />
    </div>

    <p className="text-sm text-slate-600 leading-relaxed rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      {enabled
        ? PIN_ATTENDANCE_DIRECTOR_COPY.onboardingEnabledHint
        : PIN_ATTENDANCE_DIRECTOR_COPY.onboardingDisabledHint}
    </p>
  </div>
);

function ChoiceButton({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full min-h-[44px] px-4 py-3 rounded-xl border-2 text-sm font-bold text-left ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
