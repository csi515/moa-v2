import {
  CUSTOMER_HOME_PATH,
  ORG_ONBOARDING_PATH,
  WORKPLACE_HOME_PATH,
} from '../journeyStates';

const CUSTOMER_HOME = CUSTOMER_HOME_PATH;
const WORKPLACE_HOME = WORKPLACE_HOME_PATH;
/** 사업장 미선택·신규 가입 후 기본 목적지 */
const ORG_HOME = ORG_ONBOARDING_PATH;

export type LoginTargetGroup = 'workplace' | 'customer';

/** 로그인 뒤 돌아갈 경로. Refine의 `to`와 앱의 `returnUrl`을 같이 본다. */
export function readLoginReturnPath(params: { get(name: string): string | null }): string | null {
  const raw = params.get('returnUrl') || params.get('to');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null;
  }
  return raw;
}

/**
 * 복귀 주소가 있으면 그쪽으로 간다.
 * 이메일 로그인의 기본 redirect `/`는 목적지가 아니므로, 고른 로그인 대상을 쓴다.
 * 사업장 그룹 기본값은 사업장 선택(/onboarding/org) — 게이트가 org 확정 시 /workspace 로 보낸다.
 */
export function resolvePostLoginPath(input: {
  returnPath: string | null;
  loginTargetGroup: LoginTargetGroup;
  redirectTo?: string | null;
}): string {
  if (input.returnPath) return input.returnPath;
  const redirect = input.redirectTo?.trim();
  if (redirect && redirect !== '/' && redirect !== '/login') return redirect;
  return input.loginTargetGroup === 'customer' ? CUSTOMER_HOME : ORG_HOME;
}

export function shouldEnterCustomerPortal(path: string, loginTargetGroup: LoginTargetGroup): boolean {
  return loginTargetGroup === 'customer' && path.startsWith('/customer');
}

export { CUSTOMER_HOME, WORKPLACE_HOME, ORG_HOME };
