import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  organizationId: string;
  studentId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** FCM legacy HTTP — FCM_SERVER_KEY 있을 때만 실제 발송 (앱 푸시 전용) */
async function sendFcm(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  const key = Deno.env.get("FCM_SERVER_KEY");
  if (!key || tokens.length === 0) {
    return { sent: 0, skipped: true as const };
  }

  let sent = 0;
  for (const token of tokens) {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body },
        data: data || {},
        priority: "high",
      }),
    });
    if (res.ok) sent += 1;
  }
  return { sent, skipped: false as const };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as PushRequest;
    if (!payload.organizationId || !payload.studentId || !payload.title) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      db: { schema: "core" },
    });

    const { data: rows, error } = await admin.rpc("get_push_tokens_for_customer", {
      p_organization_id: payload.organizationId,
      p_customer_id: payload.studentId,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens = (rows || [])
      .map((r: { token?: string }) => r.token)
      .filter((t: string | undefined): t is string => Boolean(t));

    const result = await sendFcm(tokens, payload.title, payload.body, payload.data);

    return new Response(
      JSON.stringify({
        ok: true,
        tokenCount: tokens.length,
        ...result,
        channel: "app_push_only",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown", sent: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
