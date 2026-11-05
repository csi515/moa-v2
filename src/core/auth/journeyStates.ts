/**
 * 회원가입 → 로그인 → 사업장 → hydrate → 업무 준비까지의 Core 여정 상태 SSOT.
 * 게이트·로딩 화면은 이 메시지 맵만 참조한다.
 */

export type AppJourneyState =
  | 'unauthenticated'
  | 'emailPending'
  | 'checkingSession'
  | 'loadingOrganizations'
  | 'needsOrganization'
  | 'hydrating'
  | 'ready';

export const JOURNEY_LOADING_MESSAGES: Record<
  Extract<AppJourneyState, 'checkingSession' | 'loadingOrganizations' | 'hydrating'>,
  string
> = {
  checkingSession: '로그인 세션을 확인하는 중...',
  loadingOrganizations: '사업장 정보를 불러오는 중...',
  hydrating: '데이터를 불러오는 중...',
};

/** 사업장 미선택 시 로그인 후 기본 경로 (URL ↔ OrganizationSelector 일치) */
export const ORG_ONBOARDING_PATH = '/onboarding/org';

/** 사업장 선택 후 업무 홈 */
export const WORKPLACE_HOME_PATH = '/workspace';

/** 고객 포털 홈 */
export const CUSTOMER_HOME_PATH = '/customer/pass';

/** 비밀번호 재설정 랜딩 */
export const AUTH_RECOVERY_PATH = '/auth/recovery';

/** 직원 초대 토큰 입력 랜딩 */
export const INVITE_ACCEPT_PATH = '/invite/accept';

export function isOrgOnboardingPath(pathname: string): boolean {
  return pathname === ORG_ONBOARDING_PATH || pathname.startsWith(`${ORG_ONBOARDING_PATH}/`);
}
