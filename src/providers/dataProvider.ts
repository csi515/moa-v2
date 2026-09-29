import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

// Fallback dummy client for build-time safety if env is not provided
const activeClient =
  supabase ||
  createClient(
    "https://placeholder.supabase.co",
    "placeholder-anon-key",
    { db: { schema: "core" } }
  );

export const dataProvider = refineSupabaseDataProvider(activeClient);
