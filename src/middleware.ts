import { NextResponse, type NextRequest } from 'next/server';
import { updateSupabaseSession } from './lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from './lib/supabase/public-env';

export async function middleware(request: NextRequest) {
  let response: NextResponse;
  try {
    response = await updateSupabaseSession(request);
  } catch {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  const { pathname } = request.nextUrl;
  const isAdminProtected = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isDashboardProtected = pathname.startsWith('/dashboard');
  const isProtected =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    isDashboardProtected ||
    isAdminProtected;
  if (!isProtected) return response;

  const env = getSupabasePublicEnv();
  if (!env) {
    // Without Supabase, cannot verify session — allow page to load (UI can prompt for .env)
    return response;
  }

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isAdminProtected ? '/admin/login' : '/login';
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    // Misconfigured client or network — fail open so Next.js keeps running
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
