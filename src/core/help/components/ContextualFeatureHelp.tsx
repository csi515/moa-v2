import type { FC } from 'react';

interface ContextualFeatureHelpProps {
  industryType?: string | null;
  activeTab?: string | null;
}

/**
 * 화면 상단 '이 화면 사용법' 가이드 버튼 컴포넌트.
 * UX 단순화 및 시야 분산 방지를 위해 비활성화(null 반환) 처리됨.
 */
export const ContextualFeatureHelp: FC<ContextualFeatureHelpProps> = () => {
  return null;
};
