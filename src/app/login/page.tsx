import React, { Suspense } from 'react';
import { AuthCard } from '../../components/auth/AuthCard';
import { LoginForm } from '../../components/auth/LoginForm';
import { GoogleButton } from '../../components/auth/GoogleButton';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <AuthCard 
      title="Welcome Back" 
      subtitle="Sign in to manage your account"
    >
      <Suspense fallback={<div className="text-center py-4 text-slate-500 text-sm">Loading login portal...</div>}>
        <LoginForm />
      </Suspense>
      
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100"></div>
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
          <span className="bg-white px-4 text-slate-400">OR</span>
        </div>
      </div>

      <GoogleButton />

      <div className="text-center pt-4">
        <p className="text-sm text-slate-500">
          Don't have an account?{' '}
          <Link href="/signup" className="text-indigo-600 font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}