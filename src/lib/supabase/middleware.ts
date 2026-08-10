import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from './public-env'
import { permissionForPath, LEGACY_PERMISSION_ALIASES } from '@/lib/auth/permissions'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const env = getSupabasePublicEnv()
  if (!env) {
    console.error('[Supabase Middleware] Cannot update session: Missing environment variables.')
  }

  const supabase = createServerClient(
    env?.url || '',
    env?.anonKey || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('[Supabase Middleware] Error fetching user session:', error)
  }

  const pathname = request.nextUrl.pathname

  // Redirect legacy /dashboard to /customer/dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/customer/dashboard', request.url))
  }
  if (pathname.startsWith('/dashboard/')) {
    const newPath = pathname.replace('/dashboard/', '/customer/')
    return NextResponse.redirect(new URL(newPath, request.url))
  }

  // Public routes that don't need auth check redirects
  if (pathname.startsWith('/auth/')) return supabaseResponse

  const isVerified = user ? !!user.email_confirmed_at : false;

  // Helper: detect warehouse staff from auth user metadata
  const isWarehouseStaffFromMeta = (u: typeof user): boolean => {
    const meta = u?.user_metadata || {};
    const appMeta = u?.app_metadata || {};
    return meta.is_warehouse_staff === true || appMeta.is_warehouse_staff === true;
  };

  const isAdminFromMeta = (u: typeof user): boolean => {
    const meta = u?.user_metadata || {};
    const appMeta = u?.app_metadata || {};
    return ['admin', 'super_admin', 'manager', 'staff'].some(
      (r) => meta.role === r || appMeta.role === r
    );
  };

  // If already logged in and hitting login/signup, redirect based on role
  if (user && isVerified && (pathname === '/login' || pathname === '/signup' || pathname === '/register')) {
    // Check auth metadata first (instant, no DB needed)
    if (isWarehouseStaffFromMeta(user)) {
      return NextResponse.redirect(new URL('/admin/warehouse', request.url))
    }
    if (isAdminFromMeta(user)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Fallback to DB profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_warehouse_staff, user_type')
      .eq('id', user.id)
      .single()

    if (profile?.is_warehouse_staff || profile?.role === 'warehouse_staff') {
      return NextResponse.redirect(new URL('/admin/warehouse', request.url))
    }
    if (profile?.user_type === 'internal' && (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'manager' || profile?.role === 'staff')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Default customer — honor the next param (e.g. /checkout) if provided
    const nextParam = request.nextUrl.searchParams.get('next');
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      return NextResponse.redirect(new URL(nextParam, request.url))
    }

    // Otherwise go to home page
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Check is_banned for all authenticated routes
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, is_warehouse_staff, user_type')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=banned', request.url))
    }

    // Admin/warehouse staff protection for /admin routes
    if (pathname.startsWith('/admin')) {
      if (!isVerified) {
        if (user.email) {
          return NextResponse.redirect(new URL(`/verify-otp?email=${encodeURIComponent(user.email)}`, request.url))
        }
        return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
      }

      const isWarehouseStaff = isWarehouseStaffFromMeta(user) || profile?.is_warehouse_staff === true || profile?.role === 'warehouse_staff';
      const isAdmin = isAdminFromMeta(user) || (profile?.user_type === 'internal' && (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'manager' || profile?.role === 'staff'));

      if (!isAdmin && !isWarehouseStaff) {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      }

      // Warehouse staff: only allow /admin/warehouse/* (deny access to admin dashboard)
      if (isWarehouseStaff && !isAdmin && !pathname.startsWith('/admin/warehouse')) {
        return NextResponse.redirect(new URL('/admin/warehouse', request.url))
      }

      // ================================================================
      // ENTERPRISE RBAC: per-route permission enforcement
      // Anything not explicitly granted by the Super Admin is denied.
      // super_admin / owner roles pass automatically via has_permission().
      // Fail-closed: an RPC error is treated as DENIED.
      //
      // Enforcement applies to EVERY internal user — including those whose
      // profile.role is 'admin'. There is no profile-role bypass: access
      // flows exclusively through user_roles -> role_permissions (the
      // legacy has_permission() profile fallback was removed). Internal
      // profiles are guaranteed a role assignment by migration
      // 20260810000000_default_roles_enterprise.sql.
      //
      // EXCEPTION: warehouse staff on /admin/warehouse/* routes are
      // allowed through without the has_permission() RPC check. They
      // are already validated as internal users (authenticated + verified
      // + profile.is_warehouse_staff) and restricted to warehouse routes
      // only. The RPC check is skipped until migration 20260810000000 is
      // applied (the old has_permission() doesn't recognize warehouse_staff).
      // ================================================================
      if (isWarehouseStaff && !isAdmin && pathname.startsWith('/admin/warehouse')) {
        // Warehouse staff — already validated, skip RBAC RPC check
      } else {
        const required = permissionForPath(pathname)
        if (required) {
          // Resolve legacy alias codes (e.g. marketing.coupons) to the new
          // module.<action> codes the RPC understands.
          const candidates = [required, ...(LEGACY_PERMISSION_ALIASES[required] ?? [])]
          let granted = false
          for (const code of candidates) {
            try {
              const { data } = await supabase.rpc('has_permission', { p_code: code })
              if (data === true) {
                granted = true
                break
              }
            } catch {
              // Fail-closed: treat RPC errors as denial of access
            }
          }
          if (!granted) {
            return NextResponse.redirect(new URL('/admin/forbidden', request.url))
          }
        }
      }
    }
  }

  // Customer protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/customer')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!isVerified) {
      if (user.email) {
        return NextResponse.redirect(new URL(`/verify-otp?email=${encodeURIComponent(user.email)}`, request.url))
      }
      return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
    }
  }

  return supabaseResponse
}