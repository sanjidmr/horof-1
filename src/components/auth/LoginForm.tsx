'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam === 'verify_required') {
      setError('Please verify your account using the OTP code sent to you.');
    } else if (errorParam === 'Invalid_or_expired_link') {
      setError('The verification link or OTP is invalid or has expired.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      await login({ email, password });
      toast.success('Logged in successfully!');
      
      const nextTarget = searchParams?.get('next') || '/';
      router.push(nextTarget);
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = err?.message || '';
      
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        toast.error('Email verification is required.');
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid_grant')) {
        setError('Invalid credentials. Please verify and try again.');
      } else {
        setError(errMsg || 'Something went wrong. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md outline-none focus:border-green-800 focus:ring-1 focus:ring-green-800 transition-all text-gray-800 text-sm placeholder:text-gray-300"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-green-800 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="your password"
              className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-md outline-none focus:border-green-800 focus:ring-1 focus:ring-green-800 transition-all text-gray-800 text-sm placeholder:text-gray-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-green-800 text-white font-semibold rounded-md hover:bg-green-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>
      </form>
    </div>
  );
};

