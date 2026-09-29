import { supabase } from './client';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** piano 스키마 클라이언트 */
export function getPianoClient(): SupabaseClient<Database, 'piano'> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }
  return supabase.schema('piano') as unknown as SupabaseClient<Database, 'piano'>;
}
