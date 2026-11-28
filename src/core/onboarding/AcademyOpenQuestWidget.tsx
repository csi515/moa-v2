/**
 * @deprecated Phase 2: 온보딩 퀘스트는 `@/app/onboarding/GettingStartedQuestWidget` + `questEngine` 사용.
 * Core → App 의존을 피하기 위해 본 컴포넌트는 no-op 호환 stub이다.
 */
import type { FC } from 'react';

export interface AcademyOpenQuestWidgetProps {
  onNavigateTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onRefreshData?: () => void;
}

/** @deprecated GettingStartedQuestWidget로 교체됨 */
export const AcademyOpenQuestWidget: FC<AcademyOpenQuestWidgetProps> = () => null;

export default AcademyOpenQuestWidget;
