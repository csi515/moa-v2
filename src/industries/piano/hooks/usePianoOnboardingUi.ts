import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { ONBOARDING_STEP_LABELS } from '@/shared/components/onboarding/onboardingHelpers';
import { StorageService } from '@/services/storage';

/** 원장 온보딩 자동 오픈·이어하기·건너뛰기 UI 상태 */
export function usePianoOnboardingUi() {
  const { showToast } = useApp();
  const { isAdmin } = usePermissions();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResumeCard, setShowResumeCard] = useState(false);
  const [resumeStepLabel, setResumeStepLabel] = useState<string | undefined>();

  const refreshOnboardingUi = () => {
    if (!isAdmin) {
      setShowOnboarding(false);
      setShowResumeCard(false);
      return;
    }
    const autoOpen = StorageService.shouldAutoOpenOnboarding();
    const resume = StorageService.shouldShowOnboardingResume();
    setShowOnboarding(autoOpen);
    setShowResumeCard(resume);
    if (resume) {
      const step = StorageService.getOnboardingProgress().step;
      setResumeStepLabel(ONBOARDING_STEP_LABELS[step] ?? undefined);
    }
  };

  useEffect(() => {
    refreshOnboardingUi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    refreshOnboardingUi();
  };

  const handleResumeContinue = () => {
    setShowResumeCard(false);
    setShowOnboarding(true);
  };

  const handleResumeSkip = () => {
    StorageService.markOnboardingSkipped();
    setShowResumeCard(false);
    setShowOnboarding(false);
    showToast('초기 설정을 건너뛰었습니다.', 'info');
  };

  return {
    showOnboarding,
    showResumeCard,
    resumeStepLabel,
    handleOnboardingComplete,
    handleResumeContinue,
    handleResumeSkip,
  };
}
