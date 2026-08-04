import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './public-env';

/**
 * Service-role Supabase client (bypasses RLS).
 * ONLY use from Server-side code (server actions / API routes).
 * Never import into client components.
 */
let cachedAdminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient | null {
  if (cachedAdminClient) return cachedAdminClient;

  const env = getSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) {
    console.error('[Supabase Admin Client] Missing env (url or SUPABASE_SERVICE_ROLE_KEY).');
    return null;
  }

  cachedAdminClient = createClient(env.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdminClient;
}
