'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | 'warehouse_staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch role dynamically from profiles table when user changes
  useEffect(() => {
    let isMounted = true;
    if (!user || !supabase) {
      setUserRole(null);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, is_warehouse_staff')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (data) {
            if (data.is_warehouse_staff) {
              setUserRole('warehouse_staff');
            } else {
              setUserRole(data.role);
            }
          } else {
            setUserRole('customer');
          }
        }
      } catch (err) {
        console.error('Failed to fetch role in AuthContext:', err);
        if (isMounted) setUserRole('customer');
      }
    };

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  const login = async (
    emailOrParams: string | { email?: string; phone?: string; password?: string },
    password?: string
  ) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

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
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

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
        email,
        password: pw!,
        options: {
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
            full_name: `${firstName || ''} ${lastName || ''}`.trim(),
          }
        }
      });
    } else if (phone) {
      res = await supabase.auth.signUp({
        phone,
        password: pw!,
        options: {
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
            full_name: `${firstName || ''} ${lastName || ''}`.trim(),
          }
        }
      });
    } else {
      throw new Error('Please provide an email or phone number.');
    }

    if (res.error) throw res.error;

    return {
      needsConfirmation: true,
      user: res.data.user
    };
  };

  const verifyOtp = async (params: { email?: string; phone?: string; token: string; type: 'signup' | 'sms' }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { email, phone, token, type } = params;
    
    let res;
    if (email) {
      res = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    } else if (phone) {
      res = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    } else {
      throw new Error('Please provide an email or phone number.');
    }

    if (res.error) throw res.error;
  };

  const resendOtp = async (params: { email?: string; phone?: string; type: 'signup' | 'sms' }) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { email, phone, type } = params;

    let res;
    if (email) {
      res = await supabase.auth.resend({ email, type: 'signup' });
    } else if (phone) {
      res = await supabase.auth.resend({ phone, type: 'sms' });
    } else {
      throw new Error('Please provide an email or phone number.');
    }

    if (res.error) throw res.error;
  };

  const logout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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