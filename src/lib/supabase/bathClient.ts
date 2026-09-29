import { supabase } from './client';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** bath 스키마 클라이언트 */
export function getBathClient(): SupabaseClient<Database, 'bath'> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }
  return supabase.schema('bath') as unknown as SupabaseClient<Database, 'bath'>;
}
