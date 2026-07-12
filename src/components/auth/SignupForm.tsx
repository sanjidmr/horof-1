'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SignupForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await signup({
        email,
        password,
        firstName,
        lastName,
      });

      toast.success('Registration initiated. Please confirm your email.');
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error('Signup error:', err);
      let errMsg = err?.message || 'Something went wrong. Please try again.';

      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('rate limit') || lowerMsg.includes('rate_limit')) {
        errMsg = 'Email rate limit exceeded. Please wait a while before trying again.';
      } else if (lowerMsg.includes('security purposes') || lowerMsg.includes('request this after')) {
        errMsg = 'For security reasons, please wait before requesting another email.';
      }

      setError(errMsg);
      toast.error(errMsg);
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
        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md outline-none focus:border-green-800 focus:ring-1 focus:ring-green-800 transition-all text-gray-800 text-sm placeholder:text-gray-300"
          />
        </div>

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

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="017......"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md outline-none focus:border-green-800 focus:ring-1 focus:ring-green-800 transition-all text-gray-800 text-sm placeholder:text-gray-300"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
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
              <span>Registering...</span>
            </>
          ) : (
            <span>Register</span>
          )}
        </button>
      </form>
    </div>
  );
};
