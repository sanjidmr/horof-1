/**
 * Reads public Supabase env vars. Does not throw.
 * Logs a single console warning when vars are missing (dev-friendly, safe for middleware).
 */
let warnedMissingEnv = false;

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  // Access variables directly on process.env for reliable Next.js static replacement
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Clean the values: remove whitespace and any accidental surrounding quotes
  const url = (rawUrl ?? '').trim().replace(/^["']|["']$/g, '');
  const anonKey = (rawKey ?? '').trim().replace(/^["']|["']$/g, '');

  if (!url || !anonKey) {
    if (!warnedMissingEnv && typeof window !== 'undefined') {
      warnedMissingEnv = true;
      console.warn(
        '[Supabase] Configuration missing. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    return null;
  }

  return { url, anonKey };
}
