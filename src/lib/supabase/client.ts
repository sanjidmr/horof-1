import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './public-env';

/**
 * Browser Supabase client. Returns `null` if public env vars are missing (no throw).
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}

/**
 * Singleton browser client for easy import.
 */
export const supabase = createSupabaseBrowserClient();
