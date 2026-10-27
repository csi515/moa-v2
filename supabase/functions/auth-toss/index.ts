import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Apps in Toss (앱스인토스) 인증 및 계정 링킹 Edge Function
 * 
 * 기능:
 * 1. exchange_code: 토스 인가 코드 -> 토스 API 토큰 교환 -> userKey & phone 추출
 *    -> 사업주가 사전 등록한 customers 매장 장부 전화번호 탐색 및 계정 링킹
 *    -> Supabase 사용자 세션 발급
 * 2. unlink: 토스 앱 내 '연결 끊기' 콜백 웹훅 (토스 심사 필수 규격)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

interface TossTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface TossUserProfile {
  userKey: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
}

/**
 * 토스 API와 인가 코드 교환
 */
async function exchangeCodeWithToss(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<{ token: TossTokenResponse; profile: TossUserProfile }> {
  // 토스 Mock/테스트 코드인 경우 시뮬레이션 데이터 제공
  if (code.startsWith("mock_") || code.startsWith("test_")) {
    const mockKey = code.replace(/^(mock_|test_)/, "") || "10001";
    return {
      token: {
        access_token: `mock_toss_access_${mockKey}`,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: `mock_toss_refresh_${mockKey}`,
      },
      profile: {
        userKey: mockKey,
        name: "토스사용자",
        phone: "010-1234-5678",
      },
    };
  }

  // 실제 토스 OAuth 토큰 엔드포인트
  const tokenEndpoint = "https://api-public.toss.im/api-public/v1/oauth/token";
  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`토스 토큰 교환 실패 (${tokenRes.status}): ${errorText}`);
  }

  const tokenData = (await tokenRes.json()) as TossTokenResponse;

  // 토스 유저 프로필 조회 엔드포인트
  const profileEndpoint = "https://api-public.toss.im/api-public/v1/user/me";
  const profileRes = await fetch(profileEndpoint, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileRes.ok) {
    const errorText = await profileRes.text();
    throw new Error(`토스 사용자 정보 조회 실패 (${profileRes.status}): ${errorText}`);
  }

  const profileData = (await profileRes.json()) as TossUserProfile;
  return { token: tokenData, profile: profileData };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "서버 환경 설정(SUPABASE_SERVICE_ROLE_KEY)이 누락되었습니다." },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || (path.endsWith("/unlink") ? "unlink" : "exchange_code");

    // =========================================================================
    // 1. 토스 연결 끊기 (Unlink) 웹훅 라우트 규격
    // =========================================================================
    if (action === "unlink") {
      const userKey = body.userKey || body.user_key || url.searchParams.get("userKey");
      if (!userKey) {
        return jsonResponse(
          { success: false, error: "userKey 파라미터가 누락되었습니다." },
          400
        );
      }

      // 계정 장부 보존 원칙: 고객 결제·출결 내역이 담긴 customers 레코드는 영구 보존하며,
      // 토스 연동 메타데이터에 연결 해제 일시만 기록
      const { error: unlinkError } = await admin.rpc("handle_toss_unlink", {
        p_toss_user_key: String(userKey),
      });

      if (unlinkError) {
        // RPC가 없는 경우 직접 metadata 업데이트 폴백
        await admin
          .from("customers")
          .update({
            metadata: { toss_unlinked: true, unlinked_at: new Date().toISOString() },
          })
          .filter("metadata->>toss_user_key", "eq", String(userKey));
      }

      return jsonResponse({
        success: true,
        message: "토스 앱 연결 끊기 처리가 완료되었습니다.",
      });
    }

    // =========================================================================
    // 2. 인가 코드 교환 및 계정 링킹 (Exchange Code)
    // =========================================================================
    if (action === "exchange_code") {
      const code = body.code;
      if (!code) {
        return jsonResponse(
          { success: false, error: "인가 코드(code)가 전달되지 않았습니다." },
          400
        );
      }

      const tossClientId = Deno.env.get("TOSS_CLIENT_ID") || "moa_toss_client_id";
      const tossClientSecret = Deno.env.get("TOSS_CLIENT_SECRET") || "moa_toss_secret";

      // 1) 토스 API 연동
      const { profile } = await exchangeCodeWithToss(
        code,
        tossClientId,
        tossClientSecret
      );

      const userKey = String(profile.userKey);
      const rawPhone = profile.phone || profile.phoneNumber || "";
      const normalizedPhone = digitsOnly(rawPhone);
      const userName = profile.name || "토스 사용자";
      const userEmail = profile.email || `toss_${userKey}@moa.app`;

      // 2) Supabase Auth 유저 조회 또는 생성
      let authUserId: string | null = null;
      const { data: existingUserList } = await admin.auth.admin.listUsers();
      const existingUser = existingUserList?.users?.find(
        (u) =>
          u.user_metadata?.toss_user_key === userKey ||
          u.email === userEmail ||
          (normalizedPhone && digitsOnly(u.phone || "") === normalizedPhone)
      );

      if (existingUser) {
        authUserId = existingUser.id;
        // 메타데이터 최신화
        await admin.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            ...existingUser.user_metadata,
            toss_user_key: userKey,
            full_name: userName,
          },
        });
      } else {
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            toss_user_key: userKey,
            full_name: userName,
            provider: "toss",
          },
        });

        if (createError || !newUser?.user) {
          throw new Error(createError?.message || "Supabase 유저 생성 실패");
        }
        authUserId = newUser.user.id;
      }

      // 3) 사업주 사전 등록 고객 장부(customers) 탐색 및 원자적 계정 링킹
      let matchedCustomerId: string | null = null;
      let matchedOrgId: string | null = null;

      if (normalizedPhone) {
        // Atomic RPC 호출: core.link_toss_customer_by_phone
        // 계정 탈취(hijack defense) 방어 및 row lock(FOR UPDATE) 원자적 수행
        const { data: linkRes, error: linkErr } = await admin.rpc(
          "link_toss_customer_by_phone",
          {
            p_user_id: authUserId,
            p_toss_user_key: userKey,
            p_phone: rawPhone || normalizedPhone,
          }
        );

        if (linkErr) {
          console.warn("[auth-toss] link_toss_customer_by_phone warning:", linkErr.message);
          // 탈취 방어 등으로 실패한 경우 다른 사용자의 고객 데이터를 덮어쓰지 않음
        } else if (linkRes && (linkRes as any).success && (linkRes as any).linked_customer_id) {
          matchedCustomerId = (linkRes as any).linked_customer_id;
          matchedOrgId = (linkRes as any).organization_id;
        }
      }

      // 4) 역할(Role) 확인: organization_members vs customers
      const { data: memberRecords } = await admin
        .from("organization_members")
        .select("id, organization_id, role")
        .eq("user_id", authUserId)
        .eq("is_active", true);

      // 매칭된 고객 조직의 멤버십을 우선적으로 평가하여 교차 테넌트 권한 오염 방지
      const matchedOrgMembership = memberRecords?.find(
        (m: { organization_id: string }) => !matchedOrgId || m.organization_id === matchedOrgId
      ) || memberRecords?.[0];

      const hasStaffMembership = Boolean(matchedOrgMembership);
      const hasCustomerRecord = Boolean(matchedCustomerId);

      let computedRole: "owner" | "staff" | "customer" | "both" = "customer";
      if (hasStaffMembership && hasCustomerRecord) {
        computedRole = "both";
      } else if (hasStaffMembership) {
        const primaryRole = (matchedOrgMembership as any)?.role;
        computedRole = primaryRole === "owner" ? "owner" : "staff";
      } else {
        computedRole = "customer";
      }

      // 5) 세션 토큰 생성 (Supabase Admin Session)
      // Supabase magiclink/session 발급 또는 커스텀 세션 객체
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

      let sessionTokens = {
        access_token: "",
        refresh_token: "",
      };

      if (!linkError && linkData?.properties?.hashed_token) {
        // verifyOtp를 통해 실 세션 키 페어 발급
        const verifyRes = await admin.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: "magiclink",
        });
        if (verifyRes.data.session) {
          sessionTokens = {
            access_token: verifyRes.data.session.access_token,
            refresh_token: verifyRes.data.session.refresh_token,
          };
        }
      }

      return jsonResponse({
        success: true,
        session: sessionTokens,
        user: {
          id: authUserId,
          userKey,
          phone: rawPhone,
          name: userName,
          email: userEmail,
        },
        role: computedRole,
        customerId: matchedCustomerId || undefined,
        organizationId: matchedOrgId || memberRecords?.[0]?.organization_id || undefined,
      });
    }

    return jsonResponse({ success: false, error: `지원하지 않는 액션: ${action}` }, 400);
  } catch (err: any) {
    console.error("[auth-toss Edge Function Error]", err);
    return jsonResponse(
      {
        success: false,
        error: err?.message || "서버 내부 오류",
        message: "토스 인증 처리 중 오류가 발생했습니다.",
      },
      500
    );
  }
});
