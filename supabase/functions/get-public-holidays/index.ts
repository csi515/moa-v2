import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * 공공데이터포털 특일정보(공휴일) API 프록시.
 * Secret: DATA_GO_KR_SERVICE_KEY (디코딩된 일반 인증키)
 * Endpoint base: https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const API_BASE =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";

interface HolidayRequest {
  /** 조회 연도 YYYY */
  solYear?: string | number;
  /** 조회 월 MM (선택, 없으면 연간) */
  solMonth?: string | number;
  /** getRestDeInfo | getHoliDeInfo — 기본 공휴일(getRestDeInfo) */
  operation?: "getRestDeInfo" | "getHoliDeInfo";
}

interface PublicHoliday {
  dateName: string;
  locdate: string; // YYYYMMDD
  isHoliday: boolean;
  dateKind?: string;
  seq?: string;
}

function padMonth(month: string | number | undefined): string | null {
  if (month === undefined || month === null || month === "") return null;
  const n = Number(month);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return String(n).padStart(2, "0");
}

function parseHolidaysFromXml(xml: string): PublicHoliday[] {
  const items: PublicHoliday[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m?.[1]?.trim() ?? "";
    };
    const dateName = get("dateName");
    const locdate = get("locdate");
    if (!dateName || !locdate) continue;
    const isHolidayRaw = get("isHoliday").toLowerCase();
    items.push({
      dateName,
      locdate,
      isHoliday: isHolidayRaw === "y" || isHolidayRaw === "true",
      dateKind: get("dateKind") || undefined,
      seq: get("seq") || undefined,
    });
  }
  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "DATA_GO_KR_SERVICE_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json().catch(() => ({}))) as HolidayRequest;
    const year = String(body.solYear ?? new Date().getFullYear());
    if (!/^\d{4}$/.test(year)) {
      return new Response(
        JSON.stringify({ error: "solYear must be YYYY", holidays: [] }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const month = padMonth(body.solMonth);
    const operation =
      body.operation === "getHoliDeInfo" ? "getHoliDeInfo" : "getRestDeInfo";

    // serviceKey는 시크릿에 디코딩 값으로 저장. URLSearchParams가 1회 인코딩.
    const params = new URLSearchParams();
    params.set("serviceKey", serviceKey);
    params.set("solYear", year);
    params.set("numOfRows", "100");
    params.set("pageNo", "1");
    if (month) params.set("solMonth", month);

    const url = `${API_BASE}/${operation}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    let apiRes: Response;
    let xmlText: string;
    try {
      apiRes = await fetch(url, { signal: controller.signal });
      xmlText = await apiRes.text();
    } catch (fetchErr) {
      const aborted =
        fetchErr instanceof Error &&
        (fetchErr.name === "AbortError" || /abort/i.test(fetchErr.message));
      return new Response(
        JSON.stringify({
          error: aborted
            ? "공휴일 API 응답이 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요."
            : "공휴일 API에 연결하지 못했습니다.",
          holidays: [],
        }),
        {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({
          error: "공휴일 API 요청에 실패했습니다.",
          holidays: [],
          status: apiRes.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resultCodeMatch = xmlText.match(/<resultCode>([^<]*)<\/resultCode>/);
    const resultMsgMatch = xmlText.match(/<resultMsg>([^<]*)<\/resultMsg>/);
    const resultCode = resultCodeMatch?.[1]?.trim();
    if (resultCode && resultCode !== "00") {
      return new Response(
        JSON.stringify({
          error: resultMsgMatch?.[1]?.trim() || "공휴일 조회에 실패했습니다.",
          holidays: [],
          resultCode,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const holidays = parseHolidaysFromXml(xmlText);

    return new Response(
      JSON.stringify({
        holidays,
        solYear: year,
        solMonth: month,
        operation,
        totalCount: holidays.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message, holidays: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
