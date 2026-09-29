import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * 국세청 사업자등록 상태조회 프록시.
 * Secret: NTS_BUSINESS_SERVICE_KEY (디코딩된 일반 인증키)
 * POST https://api.odcloud.kr/api/nts-businessman/v1/status
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_URL = "https://api.odcloud.kr/api/nts-businessman/v1/status";
const VALIDATE_URL = "https://api.odcloud.kr/api/nts-businessman/v1/validate";

interface StatusItem {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

async function loadServiceKey(): Promise<string | null> {
  const fromEnv = Deno.env.get("NTS_BUSINESS_SERVICE_KEY");
  if (fromEnv) return fromEnv;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "core" },
  });
  const { data, error } = await admin.rpc("get_nts_business_service_key");
  if (error || typeof data !== "string" || !data.trim()) return null;
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
      return json({ error: "인증이 필요합니다." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "인증 확인 실패" }, 401);
    }

    const serviceKey = await loadServiceKey();
    if (!serviceKey) {
      return json({ error: "사업자 상태 조회가 설정되지 않았습니다." }, 503);
    }

    const payload = (await req.json()) as {
      check?: string;
      businessNumber?: string;
      representativeName?: string;
      startDate?: string;
      businessName?: string;
    };
    const businessNumber = digitsOnly(String(payload.businessNumber ?? ""));
    if (businessNumber.length !== 10 || /^0+$/.test(businessNumber)) {
      return json({ error: "사업자등록번호는 10자리 숫자여야 합니다.", active: false, matched: false }, 400);
    }

    const params = new URLSearchParams();
    params.set("serviceKey", serviceKey);
    params.set("returnType", "JSON");

    if (payload.check === "validate") {
      const startDate = digitsOnly(String(payload.startDate ?? ""));
      const representativeName = String(payload.representativeName ?? "").trim();
      const businessName = String(payload.businessName ?? "").trim();
      if (!/^\d{8}$/.test(startDate) || !representativeName) {
        return json({ error: "대표자 이름과 개업일자를 입력해 주세요.", matched: false }, 400);
      }

      const apiRes = await fetch(`${VALIDATE_URL}?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          businesses: [{
            b_no: businessNumber,
            start_dt: startDate,
            p_nm: representativeName,
            b_nm: businessName,
          }],
        }),
      });
      const raw = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !raw) {
        return json({ error: "사업자 정보 일치 확인에 실패했습니다.", matched: false }, 502);
      }

      const item = Array.isArray(raw.data) ? raw.data[0] : null;
      const matched = String(item?.valid ?? "") === "01";
      const statusCode = String(item?.status?.b_stt_cd ?? "");
      const active = !statusCode || statusCode === "01";
      return json({
        matched,
        active: matched && active,
        businessNumber,
        statusCode,
        statusName: String(item?.status?.b_stt ?? ""),
        message: matched && active
          ? "사업자 정보가 일치합니다."
          : matched
            ? "계속사업자가 아닙니다."
            : "사업자등록번호, 대표자 이름, 개업일자, 상호가 일치하지 않습니다.",
      });
    }

    const apiRes = await fetch(`${STATUS_URL}?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ b_no: [businessNumber] }),
    });
    const raw = await apiRes.json().catch(() => null);
    if (!apiRes.ok || !raw) {
      return json({ error: "사업자 상태 조회에 실패했습니다.", active: false }, 502);
    }

    const item = (Array.isArray(raw.data) ? raw.data[0] : null) as StatusItem | null;
    const statusCode = String(item?.b_stt_cd ?? "");
    const statusName = String(item?.b_stt ?? "");
    const active = statusCode === "01";

    return json({
      active,
      businessNumber,
      statusCode,
      statusName,
      taxType: item?.tax_type ?? "",
      message: active
        ? "계속사업자입니다."
        : statusName || "국세청에 등록된 계속사업자가 아닙니다.",
    });
  } catch (error) {
    console.error("verify-business-status", error);
    return json({ error: "사업자 상태 조회 중 오류가 발생했습니다.", active: false }, 500);
  }
});
