import { useMemo } from 'react';
import {
  evaluateFeatureFlag,
  type FeatureFlagRule,
  type EvaluationContext,
} from './featureFlagEngine';

/**
 * 기본 시스템 피처 플래그 레지스트리 (원격 API 또는 로컬 설정 주입 가능)
 */
export const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlagRule> = {
  ai_smart_scheduling: {
    key: 'ai_smart_scheduling',
    description: 'AI 기반 강사 및 수업 자동 스마트 스케줄링 추천',
    enabled: true,
    betaTrackOnly: true, // 내부 테스트 트랙 선검증
    allowlistUsers: ['tester@moa.ac', 'director@moa.ac'],
    rolloutPercentage: 20,
  },
  biometric_kiosk_checkin: {
    key: 'biometric_kiosk_checkin',
    description: '키오스크 생체인식/얼굴인식 빠른 체크인',
    enabled: true,
    betaTrackOnly: true,
    allowlistTenants: ['org-pilot-001'],
  },
  instant_split_billing: {
    key: 'instant_split_billing',
    description: '다중 수강생 일괄 즉시 분할 결제 청구서 생성',
    enabled: true,
    allowedRoles: ['owner'], // 원장/사업주 전용 선공개
    rolloutPercentage: 50,
  },
};

export function useFeatureFlag(
  flagKey: string,
  userContext?: EvaluationContext
): { isEnabled: boolean; reason: string } {
  return useMemo(() => {
    const rule = DEFAULT_FEATURE_FLAGS[flagKey];
    if (!rule) {
      return { isEnabled: false, reason: 'FLAG_NOT_FOUND' };
    }
    const ctx: EvaluationContext = {
      track: 'production',
      ...userContext,
    };
    return evaluateFeatureFlag(rule, ctx);
  }, [flagKey, userContext]);
}
