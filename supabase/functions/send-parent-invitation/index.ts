import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * 학부모 포털 초대 메일 발송 (hardened, 2026-09-28 hotfix)
 *
 * 보안 원칙
 * - 로그인한 사용자만 호출 가능 (Authorization 헤더 → auth.getUser()).
 * - 수신자 이메일·학원명·학부모 이름·학생 이름은 요청 본문을 신뢰하지 않고
 *   DB RPC core.get_parent_invite_email_context(p_tokens) 로 조회한다.
 *   이 RPC 는 호출자 JWT 로 실행되며, 호출자가 해당 기관 관리자(is_org_admin)이고
 *   코드가 모두 유효·미사용·동일 학부모/기관의 대기 중 초대에 속할 때만 결과를 준다.
 * - 링크 기준 URL 은 서버 환경변수 APP_URL 만 사용 (요청의 appUrl 무시).
 * - 메일 본문에 들어가는 모든 값은 HTML escape.
 * - 내부 오류 메시지는 응답에 노출하지 않는다 (서버 로그에만 기록).
 *
 * 필요한 Secret
 * - APP_URL            : 예) https://moa.example.com  (필수, 없으면 503)
 * - RESEND_API_KEY     : 없으면 email_sent=false 로 응답 (코드/QR 수동 공유)
 * - INVITE_FROM_EMAIL  : 선택
 * - SUPABASE_URL / SUPABASE_ANON_KEY : Supabase 가 자동 주입
 *
 * 하위호환: 구버전 앱이 보내는 organizationName / parentName / email / appUrl /
 * linkCodes[{token, student_name, ...}] 본문도 받지만 token 외의 값은 모두 무시한다.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_RE = /^[A-Z0-9]{6,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKENS = 20;

interface EmailContext {
  organization_id: string;
  organization_name: string;
  parent_customer_id: string;
  parent_name: string;
  email: string;
  link_codes: { token: string; student_name: string; expires_at?: string }[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 메일 제목 등 헤더성 텍스트: 개행 제거 */
function oneLine(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function resolveAppUrl(): string | null {
  const raw = (Deno.env.get("APP_URL") ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function buildInviteUrl(appUrl: string, token: string): string {
  return `${appUrl}/?link=${encodeURIComponent(token)}`;
}

function extractTokens(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TOKENS) return null;
  const out: string[] = [];
  for (const item of raw) {
    const t = typeof item === "string"
      ? item
      : item && typeof item === "object"
      ? (item as Record<string, unknown>).token
      : null;
    if (typeof t !== "string") return null;
    const norm = t.trim().toUpperCase();
    if (!TOKEN_RE.test(norm)) return null;
    if (!out.includes(norm)) out.push(norm);
  }
  return out;
}

function buildEmailHtml(ctx: EmailContext, appUrl: string): string {
  const primary = ctx.link_codes[0];
  const inviteUrl = primary ? buildInviteUrl(appUrl, primary.token) : appUrl;
  const org = escapeHtml(ctx.organization_name);
  const parent = escapeHtml(ctx.parent_name);

  const codeList = ctx.link_codes
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.student_name)}</strong>: <code style="font-size:16px;letter-spacing:2px">${escapeHtml(c.token)}</code></li>`,
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="color:#4f46e5">${org} 학부모 포털 초대</h2>
      <p>안녕하세요, <strong>${parent}</strong>님.</p>
      <p>${org}에서 학부모 포털 이용을 초대했습니다. 아래 버튼을 눌러 가입·로그인한 뒤, 화면의 안내에 따라 연결을 직접 수락해 주세요.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${escapeHtml(inviteUrl)}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold">
          학부모 포털 연결하기
        </a>
      </p>
      ${ctx.link_codes.length > 0 ? `<p>연결 코드 (앱의 &lsquo;코드로 연결&rsquo;에 입력):</p><ul>${codeList}</ul>` : ""}
      <p style="font-size:12px;color:#64748b">본인이 요청하지 않은 초대라면 이 메일을 무시해 주세요. 연결 코드는 다른 사람과 공유하지 마세요.</p>
    </div>
  `;
}

function buildEmailText(ctx: EmailContext, appUrl: string): string {
  const primary = ctx.link_codes[0];
  return [
    `${oneLine(ctx.organization_name)} 학부모 포털 초대`,
    `${oneLine(ctx.parent_name)}님, 아래 링크로 가입·로그인한 뒤 연결을 수락해 주세요.`,
    primary ? buildInviteUrl(appUrl, primary.token) : appUrl,
    ...ctx.link_codes.map((c) => `${oneLine(c.student_name)}: ${c.token}`),
    "",
    "본인이 요청하지 않은 초대라면 이 메일을 무시해 주세요.",
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1) 인증
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      console.error("send-parent-invitation: SUPABASE_URL / SUPABASE_ANON_KEY missing");
      return json({ error: "Service unavailable" }, 503);
    }
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      db: { schema: "core" },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2) 입력: 토큰만 사용
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const tokens = extractTokens(body?.linkCodes);
    if (!tokens) {
      return json({ error: "Invalid request" }, 400);
    }

    const appUrl = resolveAppUrl();
    if (!appUrl) {
      console.error("send-parent-invitation: APP_URL secret missing or invalid");
      return json({ email_sent: false, message: "초대 메일 발송이 설정되지 않았습니다. 연결 코드를 직접 전달해 주세요." }, 503);
    }

    // 3) 수신자/문구 데이터는 DB에서 (호출자 권한 검증 포함)
    const { data: ctxData, error: ctxError } = await supabase.rpc("get_parent_invite_email_context", {
      p_tokens: tokens,
    });
    if (ctxError || !ctxData) {
      if (ctxError) console.warn("send-parent-invitation: context rejected", ctxError.code);
      return json({ error: "Forbidden" }, 403);
    }
    const ctx = ctxData as EmailContext;
    if (!ctx.email || !Array.isArray(ctx.link_codes) || ctx.link_codes.length === 0) {
      return json({ error: "Forbidden" }, 403);
    }

    // 선택적 교차검증 (신규 클라이언트가 보냄)
    const bodyOrg = typeof body.organizationId === "string" ? body.organizationId : null;
    const bodyParent = typeof body.parentCustomerId === "string" ? body.parentCustomerId : null;
    if ((bodyOrg && (!UUID_RE.test(bodyOrg) || bodyOrg !== ctx.organization_id)) ||
        (bodyParent && (!UUID_RE.test(bodyParent) || bodyParent !== ctx.parent_customer_id))) {
      return json({ error: "Forbidden" }, 403);
    }

    // 4) 발송
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("INVITE_FROM_EMAIL") || "onboarding@resend.dev";
    if (!resendKey) {
      return json({
        email_sent: false,
        message: "초대 메일 발송이 설정되지 않았습니다. 연결 코드를 직접 전달해 주세요.",
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ctx.email],
        subject: `[${oneLine(ctx.organization_name)}] 학부모 포털 초대`,
        html: buildEmailHtml(ctx, appUrl),
        text: buildEmailText(ctx, appUrl),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("send-parent-invitation: resend failed", res.status, errText.slice(0, 500));
      return json({ email_sent: false, message: "초대 메일 발송에 실패했습니다. 연결 코드를 직접 전달해 주세요." }, 502);
    }

    return json({ email_sent: true });
  } catch (err) {
    console.error("send-parent-invitation: unexpected error", err);
    return json({ error: "Internal error" }, 500);
  }
});
