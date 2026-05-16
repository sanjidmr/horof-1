import React from 'react';
import { AuthCard } from '../../components/auth/AuthCard';
import { SignupForm } from '../../components/auth/SignupForm';
import { GoogleButton } from '../../components/auth/GoogleButton';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <AuthCard 
      title="Create Account" 
      subtitle="Join us and start shopping"
    >
      <SignupForm />
      
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
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
