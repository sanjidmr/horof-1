'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();

  const isValidEmail = (email: string) => {
    // Strict email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid real email address');
      setLoading(false);
      return;
    }

    try {
      // signup in AuthContext handles signUp, signInWithPassword, and notifications
      const result = await signup(email, password);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('has_account', 'true');
      }
      
      if (result && result.needsEmailConfirmation) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      toast.success('Account created successfully!');
      
      const nextTarget = searchParams?.get('next') || '/';
      router.push(nextTarget);
      router.refresh();
      
      
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-3">
        <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-indigo-900">Verify Your Email</h3>
        <p className="text-sm text-indigo-700">We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account before logging in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
          {error}
        </div>
      )}
      
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};
