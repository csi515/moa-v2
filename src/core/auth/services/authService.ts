import { Session, User, type Provider } from '@supabase/supabase-js';
import { getCoreClient } from '../../../lib/supabase';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

/** 앱 origin / 배포 URL 기준 redirect */
function getAuthRedirectTo(): string {
  const baseUrl =
    (import.meta.env.VITE_APP_URL as string | undefined)?.trim() || window.location.origin;
  return baseUrl.replace(/\/$/, '') || window.location.origin;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getCoreClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUp({
  email,
  password,
  fullName,
}: SignUpParams): Promise<{
  user: User;
  session: Session | null;
}> {
  const { data, error } = await getCoreClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('회원가입에 실패했습니다.');
  return { user: data.user, session: data.session };
}

export async function signIn({ email, password }: SignInParams): Promise<Session> {
  const { data, error } = await getCoreClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.session) throw new Error('로그인에 실패했습니다.');
  return data.session;
}

/** 카카오 OAuth — 로그인·회원가입 공통 (Supabase Auth Providers) */
export async function signInWithKakao(): Promise<void> {
  const { error } = await getCoreClient().auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: getAuthRedirectTo(),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

/** SDK Provider 유니온에 없는 Custom OIDC (Dashboard `custom:naver`) */
type OAuthProviderArg = Provider | 'custom:naver';

/** 네이버 OAuth — Custom Auth Provider `custom:naver` (Supabase Dashboard) */
export async function signInWithNaver(): Promise<void> {
  const provider: OAuthProviderArg = 'custom:naver';
  const { error } = await getCoreClient().auth.signInWithOAuth({
    // supabase-js Provider 타입에 custom:* 미포함 → 한 곳에서만 단언
    provider: provider as Provider,
    options: {
      redirectTo: getAuthRedirectTo(),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getCoreClient().auth.signOut();
  if (error) throw error;
}

/** 비밀번호 재설정 이메일 발송 */
export async function resetPassword(email: string): Promise<void> {
  const redirectTo = `${getAuthRedirectTo()}/`;
  const { error } = await getCoreClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = getCoreClient().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}
