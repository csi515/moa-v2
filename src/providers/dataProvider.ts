import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import type { DataProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase/client";

/**
 * Thrown when a DataProvider operation is executed without valid Supabase configuration.
 * Distinguishes missing environment credentials from network/DB query errors.
 */
export class SupabaseClientNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase client is not configured. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are properly set."
    );
    this.name = "SupabaseClientNotConfiguredError";
  }
}

/**
 * Creates a defensive proxy DataProvider that preserves build-time & type-check safety
 * while failing explicitly at runtime if environment variables are not supplied.
 */
function createUnconfiguredDataProvider(): DataProvider {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Allow inspections, serialization, and symbol access without throwing
      if (typeof prop === "symbol" || prop === "then" || prop === "inspect" || prop === "toString") {
        return undefined;
      }
      return async () => {
        throw new SupabaseClientNotConfiguredError();
      };
    },
  };

  return new Proxy({}, handler) as DataProvider;
}

export const dataProvider: DataProvider = supabase
  ? refineSupabaseDataProvider(supabase)
  : createUnconfiguredDataProvider();
