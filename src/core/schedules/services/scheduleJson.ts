import type { Json } from '@/lib/supabase/database.types';

/** Domain Record ↔ Supabase Json 경계 변환 (구조는 동일, 타입만 좁힘) */
export function recordToJson(value: Record<string, unknown>): Json {
  return value as Json;
}

export function jsonToRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
