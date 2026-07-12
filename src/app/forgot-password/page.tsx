'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(
          'Supabase is not configured. Please check your .env.local file and restart the dev server.'
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success('Reset link sent to your email');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset link';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden bg-bg-primary text-slate-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] space-y-6 md:space-y-10 relative z-10"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <div className="inline-flex items-center justify-center p-2.5 md:p-3 bg-gold/20 rounded-xl md:rounded-2xl border border-gold/30 mb-1 md:mb-2 shadow-sm">
            <KeyRound className="h-6 w-6 md:h-8 md:w-8 text-gold" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary leading-tight">Reset Password</h1>
          <p className="text-sm md:text-base text-text-secondary px-4">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        <form
          onSubmit={handleReset}
          className="bg-bg-card border border-border-forest rounded-3xl md:rounded-[40px] p-6 md:p-10 space-y-5 md:space-y-6 shadow-xl shadow-accent-primary/5 glass-card"
        >
          {!isSent ? (
            <div className="space-y-5 md:space-y-6">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="you@example.com" 
                required 
                className="rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errorMessage && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-[10px] md:text-xs font-bold leading-relaxed">
                  {errorMessage}
                </div>
              )}
              <Button
                variant="gold"
                type="submit"
                className="w-full h-12 md:h-14 rounded-full uppercase tracking-widest text-[10px] md:text-xs font-bold shadow-lg shadow-gold/20 cursor-pointer"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Send Reset Link
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-2 md:py-4">
              <div className="p-3 md:p-4 bg-success/10 border border-success/20 rounded-xl text-success text-[10px] md:text-xs font-bold uppercase tracking-widest">
                Success! Check your Email.
              </div>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed px-2">
                We've sent a password reset link to your email. Please follow the instructions to regain access.
              </p>
              <Button variant="secondary" className="w-full h-11 md:h-12 rounded-xl text-[10px] md:text-xs font-bold tracking-widest uppercase border-border-forest cursor-pointer" onClick={() => setIsSent(false)}>
                Resend Link
              </Button>
            </div>
          )}
        </form>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-[10px] md:text-xs text-text-muted hover:text-gold transition-colors font-bold uppercase tracking-[0.2em]">
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
