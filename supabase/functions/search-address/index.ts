import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** 로그인 사용자 검색 상한 */
const AUTHED_MAX_PER_PAGE = 100;
/** 가입 전(anon) 검색 상한 — 키 남용 완화 */
const ANON_MAX_PER_PAGE = 10;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SearchAddressRequest {
  keyword: string;
  currentPage?: number;
  countPerPage?: number;
}

interface JusoApiResponse {
  results: {
    common: {
      errorCode: string;
      errorMessage: string;
      totalCount: string;
      currentPage: string;
      countPerPage: string;
    };
    juso?: Array<{
      roadAddr: string;
      jibunAddr: string;
      zipNo: string;
      admCd: string;
      bdNm: string;
      bdKdcd: string;
      siNm: string;
      sggNm: string;
      emdNm: string;
      liNm: string;
      rn: string;
      buldMnnm: string;
      buldSlno: string;
    }>;
  };
}

interface AddressSearchResult {
  roadAddress: string;
  fullAddress: string;
  jibun: string | null;
  postal: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  buildingName: string | null;
}

function validateKeyword(keyword: string): { valid: boolean; error?: string } {
  if (!keyword || !keyword.trim()) {
    return { valid: false, error: "검색어를 입력해 주세요." };
  }
  if (keyword.length < 2) {
    return { valid: false, error: "검색어는 2자 이상 입력해 주세요." };
  }
  if (keyword.length > 200) {
    return { valid: false, error: "검색어가 너무 깁니다." };
  }
  return { valid: true };
}

/**
 * JWT가 있으면 사용자 검증. 없거나 anon이면 가입 전 검색 허용.
 * 항상 apikey(anon) 헤더는 게이트웨이에서 검증됨.
 */
async function resolveAuthMode(
  req: Request
): Promise<{ mode: "authenticated" | "anon"; error?: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { mode: "anon" };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return { mode: "anon", error: "서버 설정 오류" };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Bearer가 anon 키이거나 만료된 토큰 → 가입 전 검색으로 취급
      return { mode: "anon" };
    }

    return { mode: "authenticated" };
  } catch {
    return { mode: "anon" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await resolveAuthMode(req);
    if (auth.error === "서버 설정 오류") {
      return jsonResponse({ error: auth.error }, 500);
    }

    const payload = (await req.json()) as SearchAddressRequest;

    const validation = validateKeyword(payload.keyword);
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const confmKey = Deno.env.get("JUSO_CONFM_KEY");
    if (!confmKey) {
      return jsonResponse({ error: "주소 검색 서비스가 설정되지 않았습니다." }, 503);
    }

    const maxPerPage =
      auth.mode === "authenticated" ? AUTHED_MAX_PER_PAGE : ANON_MAX_PER_PAGE;
    const defaultPerPage = auth.mode === "authenticated" ? 20 : 10;
    const currentPage = Math.max(1, Math.min(payload.currentPage || 1, 999));
    const countPerPage = Math.max(
      1,
      Math.min(payload.countPerPage || defaultPerPage, maxPerPage)
    );

    const apiUrl = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    apiUrl.searchParams.set("confmKey", confmKey);
    apiUrl.searchParams.set("keyword", payload.keyword.trim());
    apiUrl.searchParams.set("currentPage", currentPage.toString());
    apiUrl.searchParams.set("countPerPage", countPerPage.toString());
    apiUrl.searchParams.set("resultType", "json");

    const jusoResponse = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!jusoResponse.ok) {
      return jsonResponse({ error: "주소 검색 서비스 오류" }, 502);
    }

    const jusoData: JusoApiResponse = await jusoResponse.json();

    if (jusoData.results.common.errorCode !== "0") {
      return jsonResponse(
        {
          error: jusoData.results.common.errorMessage || "주소 검색 실패",
          errorCode: jusoData.results.common.errorCode,
        },
        400
      );
    }

    const results: AddressSearchResult[] = (jusoData.results.juso || []).map((item) => ({
      roadAddress: item.roadAddr,
      fullAddress: item.roadAddr,
      jibun: item.jibunAddr || null,
      postal: item.zipNo || null,
      sido: item.siNm || null,
      sigungu: item.sggNm || null,
      dong: item.emdNm || null,
      buildingName: item.bdNm || null,
    }));

    return jsonResponse({
      results,
      totalCount: parseInt(jusoData.results.common.totalCount) || 0,
      currentPage: parseInt(jusoData.results.common.currentPage) || 1,
      countPerPage: parseInt(jusoData.results.common.countPerPage) || countPerPage,
    });
  } catch (e) {
    console.error("Address search error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "알 수 없는 오류" },
      500
    );
  }
});
