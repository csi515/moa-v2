/**
 * 토스 인증 클라이언트 연동 서비스 (Toss Auth Service)
 * 
 * Apps in Toss(토스 인앱 웹뷰) 환경에서 토스 원클릭 자동 로그인을 수행하고,
 * 획득한 인가 코드를 백엔드 Supabase Edge Function(auth-toss)과 교환하여
 * 세션을 수립합니다.
 */

import { getCoreClient } from '../../../lib/supabase';
import { isAppsInToss } from '../domain/platformDetector';

export interface TossAuthExchangeResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type?: string;
  };
  user?: {
    id: string;
    userKey?: string;
    phone?: string;
    name?: string;
    email?: string;
  };
  role?: 'owner' | 'staff' | 'customer' | 'both';
  customerId?: string;
  organizationId?: string;
  error?: string;
  message?: string;
}

export interface TossLoginResult {
  success: boolean;
  role?: 'owner' | 'staff' | 'customer' | 'both';
  customerId?: string;
  organizationId?: string;
  error?: string;
}

/**
 * 앱스인토스 환경에서 토스 인가 코드(Authorization Code) 획득
 */
export async function requestTossAuthorizationCode(): Promise<string> {
  if (!isAppsInToss()) {
    throw new Error('앱스인토스(Apps in Toss) 환경에서만 사용 가능한 기능입니다.');
  }

  // 1. URL 쿼리 파라미터에 이미 인가 코드가 전달된 경우 (OAuth redirect / 토스 웹뷰 런칭)
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code') || params.get('authorization_code');
    if (codeFromUrl) {
      return codeFromUrl;
    }
  }

  // 2. 전역 토스 브릿지 객체 호출
  if (typeof window !== 'undefined') {
    const w = window as any;
    
    // Toss 공식 SDK / 앱스인토스 브릿지 인터페이스 탐색
    if (w.Toss?.auth?.getAuthorizationCode) {
      try {
        const res = await w.Toss.auth.getAuthorizationCode();
        if (typeof res === 'string') return res;
        if (res?.code) return res.code;
      } catch (err: any) {
        throw new Error(err?.message || '토스 인가 코드 발급에 실패했습니다.');
      }
    }

    if (w.toss?.requestAuthCode) {
      try {
        const res = await w.toss.requestAuthCode();
        if (typeof res === 'string') return res;
        if (res?.code) return res.code;
      } catch (err: any) {
        throw new Error(err?.message || '토스 브릿지 인가 코드 획득 실패');
      }
    }

    if (w.appsInToss?.getAuthCode) {
      try {
        const res = await w.appsInToss.getAuthCode();
        if (typeof res === 'string') return res;
        if (res?.code) return res.code;
      } catch (err: any) {
        throw new Error(err?.message || '앱스인토스 인가 코드 획득 실패');
      }
    }
  }

  // 3. Mock/개발 환경 지원 (VITE_TOSS_MOCK_CODE)
  const mockCode = (import.meta.env.VITE_TOSS_MOCK_CODE as string | undefined)?.trim();
  if (mockCode) {
    return mockCode;
  }

  throw new Error('토스 앱 인증 브릿지를 호출할 수 없습니다. 토스 앱 최신 버전인지 확인해 주세요.');
}

/**
 * 토스 인가 코드를 백엔드 Supabase Edge Function(auth-toss)으로 전송하여 세션으로 교환
 */
export async function exchangeTossCodeForSession(code: string): Promise<TossAuthExchangeResponse> {
  const client = getCoreClient();

  try {
    const { data, error } = await client.functions.invoke('auth-toss', {
      body: {
        action: 'exchange_code',
        code,
      },
    });

    if (error) {
      console.error('[tossAuthService] Edge function invoke error:', error);
      return {
        success: false,
        error: error.message || '토스 인증 서버와의 통신 중 오류가 발생했습니다.',
        message: '토스 앱 인증에 실패했습니다. 네트워크 연결을 확인하거나 웹 브라우저에서 접속해 주세요.',
      };
    }

    const payload = data as TossAuthExchangeResponse;
    if (!payload?.success || !payload.session) {
      return {
        success: false,
        error: payload?.error || '토스 인증 세션 교환 실패',
        message: payload?.message || '토스 사용자 인증에 실패했습니다. 다시 시도해 주세요.',
      };
    }

    // Supabase 클라이언트에 세션 동기화 주입
    const { error: sessionError } = await client.auth.setSession({
      access_token: payload.session.access_token,
      refresh_token: payload.session.refresh_token,
    });

    if (sessionError) {
      console.error('[tossAuthService] setSession error:', sessionError);
      return {
        success: false,
        error: sessionError.message,
        message: '세션 수립에 실패했습니다.',
      };
    }

    return payload;
  } catch (err: any) {
    console.error('[tossAuthService] Unexpected error:', err);
    return {
      success: false,
      error: err?.message || '알 수 없는 오류',
      message: '토스 앱 인증에 실패했습니다. 네트워크 상태를 확인하시거나 웹 브라우저에서 접속해 주세요.',
    };
  }
}

/**
 * 앱스인토스 원클릭 자동 로그인 오케스트레이션 함수
 */
export async function loginWithToss(): Promise<TossLoginResult> {
  try {
    if (!isAppsInToss()) {
      return {
        success: false,
        error: '앱스인토스 환경이 아닙니다.',
      };
    }

    const code = await requestTossAuthorizationCode();
    const result = await exchangeTossCodeForSession(code);

    if (!result.success) {
      return {
        success: false,
        error: result.message || result.error || '토스 로그인 실패',
      };
    }

    return {
      success: true,
      role: result.role,
      customerId: result.customerId,
      organizationId: result.organizationId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || '토스 로그인 처리 중 오류가 발생했습니다.',
    };
  }
}
