'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: 'admin' | 'customer' | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | null>(null);
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
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (data) {
            setUserRole(data.role);
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

  const login = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // ✅ Signup এর পরে auto login
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;

    // Create admin notification
    try {
      const { createNotification } = await import('@/lib/actions/notifications');
      await createNotification(
        'New Customer Registered',
        `A new user (${email}) has just registered on the platform.`,
        'customer'
      );
    } catch (e) {
      console.error('Failed to create notification:', e);
    }
  };

  const logout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isAuthenticated = !!user;
  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isAuthenticated, isAdmin, userRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};