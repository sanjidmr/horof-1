'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, TreePine, Lock } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getRoleBasedRedirect } from '../../../lib/auth/redirect';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email) || !password) {
      toast.error('Please enter a valid email address and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Role-based redirect: admin → /admin/dashboard, warehouse staff → /admin/warehouse/orders
      const { createSupabaseBrowserClient } = await import('../../../lib/supabase/client');
      const supabase = createSupabaseBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const redirectTo = getRoleBasedRedirect(authUser, '/admin/dashboard');
      const isStaff = redirectTo === '/admin/warehouse' || redirectTo === '/admin/warehouse/orders';
      toast.success(isStaff ? 'Welcome back, Staff' : 'Welcome back, Administrator');
      router.push(redirectTo);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center px-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-accent-primary rounded-2xl border border-accent-primary mb-4 shadow-xl">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-accent-primary uppercase tracking-tighter">
            Horof <span className="text-gold italic">Admin</span>
          </h1>
          <p className="text-text-secondary text-sm font-bold uppercase tracking-widest">Enterprise Control Panel</p>
        </div>

        <form onSubmit={handleAdminLogin} className="bg-white border border-border-forest rounded-[40px] p-10 space-y-6 shadow-2xl shadow-accent-primary/10">
          <Input 
            label="Administrator Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@horof.art"
            required
          />
          <Input 
            label="Access Key" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button 
            variant="primary" 
            className="w-full h-14 rounded-full uppercase tracking-[0.2em] font-bold"
            isLoading={isLoading}
            disabled={isLoading}
            type="submit"
          >
            Secure Entry
            <Lock className="ml-2 h-4 w-4" />
          </Button>

          <div className="flex items-center gap-4 p-5 bg-gold/5 border border-gold/10 rounded-2xl text-[10px] text-gold font-bold uppercase tracking-[0.2em] leading-relaxed">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>Administrative session is encrypted and audited.</span>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-text-muted hover:text-accent-primary transition-colors uppercase tracking-[0.3em] font-bold underline underline-offset-8"
          >
            Back to Showroom
          </button>
        </div>
      </motion.div>
    </div>
  );
};
