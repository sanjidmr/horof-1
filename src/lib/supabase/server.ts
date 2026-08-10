import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from './public-env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const env = getSupabasePublicEnv()

  if (!env) {
    console.error('[Supabase Server Client] Cannot initialize: Missing environment variables.')
  }

  return createServerClient(
    env?.url || '',
    env?.anonKey || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export const createClient = createSupabaseServerClient;

