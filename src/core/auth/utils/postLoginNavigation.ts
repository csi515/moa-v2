const CUSTOMER_HOME = '/customer/pass';
const WORKPLACE_HOME = '/workspace';

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
 */
export function resolvePostLoginPath(input: {
  returnPath: string | null;
  loginTargetGroup: LoginTargetGroup;
  redirectTo?: string | null;
}): string {
  if (input.returnPath) return input.returnPath;
  const redirect = input.redirectTo?.trim();
  if (redirect && redirect !== '/' && redirect !== '/login') return redirect;
  return input.loginTargetGroup === 'customer' ? CUSTOMER_HOME : WORKPLACE_HOME;
}

export function shouldEnterCustomerPortal(path: string, loginTargetGroup: LoginTargetGroup): boolean {
  return loginTargetGroup === 'customer' && path.startsWith('/customer');
}
