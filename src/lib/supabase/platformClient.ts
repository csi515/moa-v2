import { supabase } from './client';

/** platform 스키마 클라이언트. 사업장 core 원장과 분리한다. */
export function getPlatformClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }
  return supabase.schema('platform');
}

export type PlatformClient = ReturnType<typeof getPlatformClient>;
