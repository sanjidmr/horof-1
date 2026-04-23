'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, TreePine, Github } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login('customer@example.com', 'customer');
    toast.success('Successfully logged in!');
    router.push('/');
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden bg-bg-secondary">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] space-y-6 md:space-y-10 relative z-10"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <Link href="/" className="inline-flex items-center justify-center p-2.5 md:p-3 bg-accent-primary rounded-xl md:rounded-2xl border border-accent-primary mb-1 md:mb-2 shadow-lg">
            <TreePine className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-accent-primary">Welcome Back</h1>
          <p className="text-sm md:text-base text-text-secondary px-4">Sign in to your <span className="text-accent-primary font-bold">Horof</span> account to manage your collection.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-border-forest rounded-3xl md:rounded-[40px] p-6 md:p-10 space-y-5 md:space-y-6 shadow-xl shadow-accent-primary/5">
          <Input label="Email Address" type="email" placeholder="you@example.com" required className="rounded-xl" />
          <div className="space-y-2 text-right">
            <Input label="Password" type="password" placeholder="••••••••" required className="rounded-xl" />
            <Link href="/forget-password" title="Forgot Password" className="text-[10px] md:text-xs text-gold hover:underline font-bold uppercase tracking-widest block pr-1">Forgot Password?</Link>
          </div>

          <Button variant="primary" className="w-full h-12 md:h-14 rounded-full uppercase tracking-widest text-[10px] md:text-xs font-bold shadow-lg shadow-accent-primary/20">
            Sign In
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-forest"></div></div>
            <div className="relative flex justify-center text-[9px] md:text-[10px] uppercase tracking-widest font-bold"><span className="bg-white px-4 text-text-muted">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Button variant="secondary" className="h-11 md:h-12 w-full flex items-center justify-center gap-2 border-border-forest rounded-xl text-[10px] md:text-xs tracking-widest uppercase">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Google
            </Button>
            <Button variant="secondary" className="h-11 md:h-12 w-full flex items-center justify-center gap-2 border-border-forest rounded-xl text-[10px] md:text-xs tracking-widest uppercase">
              <Github className="h-3.5 w-3.5 md:h-4 md:w-4" />
              GitHub
            </Button>
          </div>
        </form>

        <p className="text-center text-xs md:text-sm text-text-secondary">
          New to Horof?{' '}
          <Link href="/register" className="text-accent-primary font-bold hover:underline">Create an Account</Link>
        </p>

        <div className="text-center pt-6 md:pt-8 border-t border-border-forest/50">
          <Link href="/admin/login" className="text-[9px] md:text-[10px] text-text-muted hover:text-gold transition-colors font-bold uppercase tracking-[0.3em]">
            Access Admin Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
