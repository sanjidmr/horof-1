import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from './public-env'

// Clear invalid/corrupted localStorage session data before Supabase initialization
function validateAndCleanLocalStorage() {
  if (typeof window === 'undefined') return;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            const session = parsed.currentSession || parsed;
            if (session) {
              if (typeof session !== 'object' || !session.access_token || !session.refresh_token) {
                console.warn(`[Supabase Auth] Removing structurally invalid session from localStorage (key: ${key})`);
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            console.warn(`[Supabase Auth] Removing corrupted JSON session from localStorage (key: ${key})`);
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Supabase Auth] Error sanitizing localStorage:', err);
  }
}

// Custom fetch wrapper to catch network, DNS, and CORS errors
const customResilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(input, init);
    return response;
  } catch (error: any) {
    const isNetworkError = 
      error instanceof TypeError || 
      error?.message?.includes('fetch') || 
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('ENOTFOUND') ||
      error?.message?.includes('Failed to fetch');
      
    if (isNetworkError) {
      console.warn(
        `[Supabase Fetch Wrapper] Caught network/DNS/CORS failure for: ${input}. Returning simulated 400 response to prevent retry loops. Error details:`,
        error.message
      );
      
      // Return a simulated response with 400 status to let Supabase GoTrue handle it as a non-retryable error.
      // This prevents AuthRetryableFetchError from being thrown and stops infinite refresh loops.
      return new Response(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: `Network request failed: ${error.message}. The Supabase project may be unreachable or DNS resolution failed.`,
        }),
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    throw error;
  }
};

let clientInstance: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    const env = getSupabasePublicEnv();
    return createBrowserClient(
      env?.url || '',
      env?.anonKey || ''
    );
  }

  if (!clientInstance) {
    // 1. Clean localStorage first
    validateAndCleanLocalStorage();

    // 2. Load sanitized env vars
    const env = getSupabasePublicEnv();
    if (!env) {
      console.error('[Supabase Client] Cannot initialize: Missing Supabase environment variables.');
    }

    // 3. Create singleton client with custom fetch wrapper
    clientInstance = createBrowserClient(
      env?.url || '',
      env?.anonKey || '',
      {
        global: {
          fetch: customResilientFetch,
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }
      }
    );
  }

  return clientInstance;
}

export const createClient = createSupabaseBrowserClient;

