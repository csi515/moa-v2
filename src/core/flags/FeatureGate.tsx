import React from 'react';
import { useFeatureFlag } from './useFeatureFlag';
import type { EvaluationContext } from './featureFlagEngine';

export interface FeatureGateProps {
  flag: string;
  context?: EvaluationContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 선언적 피처 플래그 게이트 컴포넌트
 * 특정 기능이 활성화되었을 때만 자식 컴포넌트를 렌더링하고,
 * 비활성화 시 대체(fallback) 컴포넌트를 렌더링합니다.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  flag,
  context,
  children,
  fallback = null,
}) => {
  const { isEnabled } = useFeatureFlag(flag, context);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
