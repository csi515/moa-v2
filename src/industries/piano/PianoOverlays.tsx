import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { OnboardingWizard } from '@/shared/components';
import { OnboardingResumeCard } from '@/shared/components/onboarding/OnboardingResumeCard';
import { usePianoOnboardingUi } from './hooks/usePianoOnboardingUi';

export const PianoOverlays: FC = () => {
  const { activeTab } = useApp();
  const {
    showOnboarding,
    showResumeCard,
    resumeStepLabel,
    handleOnboardingComplete,
    handleResumeContinue,
    handleResumeSkip,
  } = usePianoOnboardingUi();

  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {showResumeCard && activeTab === 'dashboard' && (
        <div className="px-4 pt-3 max-w-3xl mx-auto w-full">
          <OnboardingResumeCard
            stepLabel={resumeStepLabel}
            onContinue={handleResumeContinue}
            onSkip={handleResumeSkip}
          />
        </div>
      )}
    </>
  );
};
