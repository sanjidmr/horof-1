import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Only run middleware on routes which actually need session checks or redirects.
  // This avoids running expensive Supabase checks on every asset/API request and improves dev/prod startup and response times.
  matcher: [
    '/login',
    '/signup',
    '/register',
    '/verify-otp',
    '/verify-email',
    '/auth/:path*',
    '/admin/:path*',
    '/customer/:path*',
    '/dashboard',
    '/dashboard/:path*'
  ],
}
