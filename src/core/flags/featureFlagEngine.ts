/**
 * Moa-v2 Feature Flag & Beta Track Canary Engine
 *
 * 1. 내부 테스터 트랙(TestFlight / Google Play Internal Test) 및 네이티브 기능 사전 검증
 * 2. 특정 사용자/매장 타겟팅 및 점진적 카나리(Canary % Rollout) 원격 플래그 엔진
 */

export type BetaTrackType = 'production' | 'testflight' | 'google_internal' | 'local_dev';

export interface EvaluationContext {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  role?: 'owner' | 'manager' | 'instructor' | 'staff' | 'customer' | 'parent';
  track?: BetaTrackType;
  appVersion?: string;
}

export interface FeatureFlagRule {
  key: string;
  description: string;
  enabled: boolean; // 글로벌 마스터 스위치
  betaTrackOnly?: boolean; // 내부 테스트 트랙(TestFlight / Google Internal) 전용 여부
  allowedRoles?: string[]; // 특정 직급/역할 전용 (예: owner 선공개)
  allowlistUsers?: string[]; // 특정 테스터 이메일/ID 허용 목록
  allowlistTenants?: string[]; // 특정 파일럿 매장 ID 허용 목록
  rolloutPercentage?: number; // 카나리 점진적 롤아웃 (0 ~ 100%)
}

/**
 * 32비트 FNV-1a 결정적 해시 함수 (사용자 ID 기반 카나리 버킷 산출용)
 * 동일한 userId와 flagKey 조합은 서버 재시작이나 클라이언트 세션 변경과 무관하게 항상 일관된 버킷(0~99)에 배정됨
 */
export function getCanaryBucket(key: string, identifier: string): number {
  const input = `${key}:${identifier}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

/**
 * 피처 플래그 평가 순수 함수
 */
export function evaluateFeatureFlag(
  rule: FeatureFlagRule,
  ctx: EvaluationContext
): { isEnabled: boolean; reason: string } {
  // 1. 글로벌 마스터 스위치 (Kill-switch)
  if (!rule.enabled) {
    return { isEnabled: false, reason: 'MASTER_SWITCH_OFF' };
  }

  // 2. 내부 테스터 트랙 (TestFlight / Google Play Internal Test) 가드
  if (rule.betaTrackOnly) {
    const isBeta = ctx.track === 'testflight' || ctx.track === 'google_internal' || ctx.track === 'local_dev';
    if (!isBeta) {
      return { isEnabled: false, reason: 'BETA_TRACK_ONLY' };
    }
  }

  // 3. 특정 직급/역할(Role) 필터링
  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    if (!ctx.role || !rule.allowedRoles.includes(ctx.role)) {
      return { isEnabled: false, reason: 'ROLE_NOT_PERMITTED' };
    }
  }

  // 4. 특정 사용자 명시적 Allowlist 검사 (이메일 또는 ID)
  if (rule.allowlistUsers && rule.allowlistUsers.length > 0) {
    const matchesUser =
      (ctx.userId && rule.allowlistUsers.includes(ctx.userId)) ||
      (ctx.userEmail && rule.allowlistUsers.includes(ctx.userEmail));
    if (matchesUser) {
      return { isEnabled: true, reason: 'USER_ALLOWLIST_MATCH' };
    }
  }

  // 5. 특정 매장/테넌트 명시적 Allowlist 검사
  if (rule.allowlistTenants && rule.allowlistTenants.length > 0) {
    if (ctx.organizationId && rule.allowlistTenants.includes(ctx.organizationId)) {
      return { isEnabled: true, reason: 'TENANT_ALLOWLIST_MATCH' };
    }
  }

  // 6. 점진적 카나리(Rollout %) 배포 검증
  if (typeof rule.rolloutPercentage === 'number') {
    if (rule.rolloutPercentage <= 0) {
      return { isEnabled: false, reason: 'ROLLOUT_ZERO' };
    }
    if (rule.rolloutPercentage >= 100) {
      return { isEnabled: true, reason: 'ROLLOUT_100_PERCENT' };
    }

    const identifier = ctx.userId || ctx.userEmail || ctx.organizationId;
    if (!identifier) {
      // 식별자가 없는 비로그인 사용자에게는 카나리 기능 미노출
      return { isEnabled: false, reason: 'NO_IDENTIFIER_FOR_CANARY' };
    }

    const bucket = getCanaryBucket(rule.key, identifier);
    const inBucket = bucket < rule.rolloutPercentage;
    return {
      isEnabled: inBucket,
      reason: inBucket ? `CANARY_BUCKET_IN (${bucket} < ${rule.rolloutPercentage})` : `CANARY_BUCKET_OUT (${bucket} >= ${rule.rolloutPercentage})`,
    };
  }

  // Allowlist나 Rollout% 규칙이 없으나 enabled인 기본 플래그는 활성화
  const hasSpecificAllowlists =
    (rule.allowlistUsers && rule.allowlistUsers.length > 0) ||
    (rule.allowlistTenants && rule.allowlistTenants.length > 0);

  if (hasSpecificAllowlists) {
    return { isEnabled: false, reason: 'NOT_IN_ANY_ALLOWLIST' };
  }

  return { isEnabled: true, reason: 'DEFAULT_ENABLED' };
}

/**
 * 네이티브 기능(푸시 알림, 카메라, 생체 인증) 하드웨어 가드
 */
export interface NativeCapabilitiesStatus {
  hasPushNotifications: boolean;
  hasCamera: boolean;
  hasBiometrics: boolean;
  track: BetaTrackType;
}

export function resolveNativeCapabilities(
  isNative: boolean,
  track: BetaTrackType
): NativeCapabilitiesStatus {
  // 웹 브라우저 환경에서는 안전한 웹 표준 또는 대체 UI로 폴백
  if (!isNative) {
    return {
      hasPushNotifications: 'Notification' in globalThis,
      hasCamera: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
      hasBiometrics: false,
      track: track || 'production',
    };
  }

  // 네이티브 앱(Android/iOS Capacitor) 환경
  return {
    hasPushNotifications: true,
    hasCamera: true,
    hasBiometrics: true,
    track,
  };
}
