/**
 * Supabase/Refine 로그인 실패 메시지를 사용자용 한글 안내로 변환한다.
 */
export function mapLoginErrorMessage(raw?: string | null): string {
  const fallback =
    '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 회원가입을 진행해 주세요.';
  if (!raw?.trim()) return fallback;

  if (/email not confirmed|email_not_confirmed/i.test(raw)) {
    return '이메일 인증이 완료되지 않았습니다. 받은편지함의 확인 링크를 눌러 주세요.';
  }
  if (/invalid login credentials|invalid_credentials/i.test(raw)) {
    return fallback;
  }
  if (/user not found|no user found/i.test(raw)) {
    return '등록되지 않은 계정입니다. 회원가입 후 다시 로그인해 주세요.';
  }
  if (/too many requests|rate limit/i.test(raw)) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  return raw;
}

/** 미확인 이메일 오류인지 (재발송 CTA 표시용) */
export function isEmailNotConfirmedError(raw?: string | null): boolean {
  return /email not confirmed|email_not_confirmed|이메일 인증이 완료되지 않았습니다/i.test(
    raw ?? ''
  );
}
