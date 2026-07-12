'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success('Password updated successfully! Please log in with your new password.');
      
      // Sign out to clean the temp session
      await supabase.auth.signOut();
      
      router.push('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleUpdatePassword}
      className="bg-white border border-border-forest rounded-3xl md:rounded-[40px] p-6 md:p-10 space-y-5 md:space-y-6 shadow-xl shadow-accent-primary/5 glass-card"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Confirm Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
          />
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium leading-relaxed font-sans">
            {errorMessage}
          </div>
        )}

        <Button
          variant="gold"
          type="submit"
          className="w-full h-12 md:h-14 rounded-full uppercase tracking-widest text-[10px] md:text-xs font-bold shadow-lg shadow-gold/20 cursor-pointer flex items-center justify-center gap-2"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden bg-bg-primary text-slate-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] space-y-6 md:space-y-10 relative z-10"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <div className="inline-flex items-center justify-center p-2.5 md:p-3 bg-gold/20 rounded-xl md:rounded-2xl border border-gold/30 mb-1 md:mb-2 shadow-sm">
            <Lock className="h-6 w-6 md:h-8 md:w-8 text-gold" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary leading-tight font-serif text-slate-900">Set New Password</h1>
          <p className="text-sm md:text-base text-text-secondary px-4">Please enter a new password for your account below.</p>
        </div>

        <Suspense fallback={<div className="text-center py-8 text-slate-500 text-sm">Loading set password form...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-[10px] md:text-xs text-text-muted hover:text-gold transition-colors font-bold uppercase tracking-[0.2em]">
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
