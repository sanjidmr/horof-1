'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  login: (
    emailOrParams: string | { email?: string; phone?: string; password?: string },
    password?: string
  ) => Promise<void>;
  signup: (
    emailOrParams: string | { email?: string; phone?: string; password?: string; firstName?: string; lastName?: string },
    password?: string
  ) => Promise<{ needsConfirmation: boolean; user: SupabaseUser | null }>;
  verifyOtp: (params: { email?: string; phone?: string; token: string; type: 'signup' | 'sms' }) => Promise<void>;
  resendOtp: (params: { email?: string; phone?: string; type: 'signup' | 'sms' }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isWarehouseStaff: boolean;
  userRole: 'admin' | 'customer' | 'warehouse_staff' | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Determine user role from auth user metadata + DB profile.
 * Auth metadata is PRIMARY (always available, no RLS issues).
 * DB profile is SECONDARY (adds assigned_warehouse_id, etc.).
 */
function detectRole(
  authUser: SupabaseUser | null,
  profile: { role?: string; is_warehouse_staff?: boolean; assigned_warehouse_id?: string } | null
): 'admin' | 'customer' | 'warehouse_staff' | null {
  if (!authUser) return null;

  const meta = authUser.user_metadata || {};
  const appMeta = authUser.app_metadata || {};

  // Priority 1: Auth user metadata (set by service role, always reliable)
  if (meta.is_warehouse_staff === true || appMeta.is_warehouse_staff === true) {
    return 'warehouse_staff';
  }
  if (meta.role === 'admin' || appMeta.role === 'admin') {
    return 'admin';
  }

  // Priority 2: DB profile (may not exist if column missing, but try)
  if (profile) {
    if (profile.is_warehouse_staff === true) return 'warehouse_staff';
    if (profile.role === 'warehouse_staff') return 'warehouse_staff';
    if (profile.role === 'admin') return 'admin';
    if (profile.role) return profile.role as 'admin' | 'customer' | 'warehouse_staff';
  }

  // Priority 3: Default
  return 'customer';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | 'warehouse_staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const roleResolved = useRef(false);

  // Phase 1: Get session + user from Supabase
  useEffect(() => {
    let isMounted = true;
    if (!supabase) { setSession(null); setUser(null); setIsLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    }).finally(() => {
      if (!isMounted) return;
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => { isMounted = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  // Phase 2: Detect role from auth metadata (instant), then enrich from DB profile
  useEffect(() => {
    let isMounted = true;
    if (!user || !supabase) {
      setUserRole(null);
      roleResolved.current = false;
      return;
    }

    // IMMEDIATE: detect role from auth user metadata (no DB query needed)
    const immediateRole = detectRole(user, null);
    if (immediateRole && !roleResolved.current) {
      setUserRole(immediateRole);
      roleResolved.current = true;
    }

    // ENRICH: fetch DB profile for additional data (assigned_warehouse_id, etc.)
    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_warehouse_staff, assigned_warehouse_id')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          const finalRole = detectRole(user, profile);
          setUserRole(finalRole);
        }
      } catch (err) {
        console.error('Profile fetch error (non-fatal):', err);
        // Role already set from auth metadata, don't downgrade
      }
    };

    fetchProfile();

    return () => { isMounted = false; };
  }, [user, supabase]);

  const login = async (
    emailOrParams: string | { email?: string; phone?: string; password?: string },
    password?: string
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    let signInParams: { email?: string; phone?: string; password?: string } = {};
    if (typeof emailOrParams === 'string') {
      signInParams = { email: emailOrParams, password };
    } else {
      signInParams = emailOrParams;
    }

    const { email, phone, password: pw } = signInParams;

    if (email) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw! });
      if (error) throw error;
    } else if (phone) {
      const { error } = await supabase.auth.signInWithPassword({ phone, password: pw! });
      if (error) throw error;
    } else {
      throw new Error('Please provide an email or phone number.');
    }
  };

  const signup = async (
    emailOrParams: string | { email?: string; phone?: string; password?: string; firstName?: string; lastName?: string },
    password?: string
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    let signUpParams: { email?: string; phone?: string; password?: string; firstName?: string; lastName?: string } = {};
    if (typeof emailOrParams === 'string') {
      signUpParams = { email: emailOrParams, password };
    } else {
      signUpParams = emailOrParams;
    }

    const { email, phone, password: pw, firstName, lastName } = signUpParams;

    let res;
    if (email) {
      res = await supabase.auth.signUp({
        email, password: pw!,
        options: { data: { first_name: firstName || '', last_name: lastName || '', full_name: `${firstName || ''} ${lastName || ''}`.trim() } }
      });
    } else if (phone) {
      res = await supabase.auth.signUp({
        phone, password: pw!,
        options: { data: { first_name: firstName || '', last_name: lastName || '', full_name: `${firstName || ''} ${lastName || ''}`.trim() } }
      });
    } else {
      throw new Error('Please provide an email or phone number.');
    }

    if (res.error) throw res.error;
    return { needsConfirmation: true, user: res.data.user };
  };

  const verifyOtp = async (params: { email?: string; phone?: string; token: string; type: 'signup' | 'sms' }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { email, phone, token, type } = params;
    let res;
    if (email) res = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    else if (phone) res = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    else throw new Error('Please provide an email or phone number.');
    if (res.error) throw res.error;
  };

  const resendOtp = async (params: { email?: string; phone?: string; type: 'signup' | 'sms' }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { email, phone, type } = params;
    let res;
    if (email) res = await supabase.auth.resend({ email, type: 'signup' });
    else if (phone) res = await supabase.auth.resend({ phone, type: 'sms' });
    else throw new Error('Please provide an email or phone number.');
    if (res.error) throw res.error;
  };

  const logout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    roleResolved.current = false;
  };

  const isAuthenticated = !!user;
  const isAdmin = userRole === 'admin';
  const isWarehouseStaff = userRole === 'warehouse_staff';

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isAuthenticated, isAdmin, isWarehouseStaff, userRole, isLoading, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
