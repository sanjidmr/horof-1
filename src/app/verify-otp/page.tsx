'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { OtpInput } from '../../components/auth/OtpInput';
import { AuthCard } from '../../components/auth/AuthCard';
import { Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function VerifyOtpContent() {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(59);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';

  const { verifyOtp, resendOtp } = useAuth();

  // Countdown timer logic
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit OTP when it reaches 6 digits
  useEffect(() => {
    if (otp.length === 6) {
      handleVerify(otp);
    }
  }, [otp]);

  const handleVerify = async (codeValue: string) => {
    if (verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyOtp({
        email,
        token: codeValue,
        type: 'signup',
      });
      toast.success('Email verified successfully! Welcome.');

      const nextTarget = searchParams?.get('next') || '/';
      router.push(nextTarget);
      router.refresh();
    } catch (err: any) {
      console.error('Verification error:', err);
      const errMsg = err?.message || 'Verification failed. Please check the code.';
      setError(errMsg);
      toast.error(errMsg);
      setOtp(''); // Reset OTP input on failure
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      handleVerify(otp);
    } else {
      setError('Please enter a 6-digit code.');
    }
  };

  const handleResend = async () => {
    if (resending || timer > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendOtp({
        email,
        type: 'signup',
      });
      toast.success('A new OTP has been sent to your email.');
      setTimer(59);
    } catch (err: any) {
      console.error('Resend error:', err);
      let errMsg = err?.message || 'Failed to resend code.';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('rate limit') || lowerMsg.includes('rate_limit')) {
        errMsg = 'Email rate limit exceeded. Please wait a while before requesting another code.';
      } else if (lowerMsg.includes('security purposes') || lowerMsg.includes('request this after')) {
        errMsg = 'Please wait a moment before trying to resend the code again.';
      }
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 font-medium mb-4">Invalid verification request. Missing email.</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-green-800 font-bold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium leading-relaxed">
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <div className="p-3 bg-green-50 rounded-2xl text-green-800">
          <Mail className="h-8 w-8" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-slate-500 font-light">
          We sent a 6-digit confirmation code to:
        </p>
        <p className="font-bold text-slate-900 break-all">{email}</p>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-6">
        <div className="py-2">
          <OtpInput
            length={6}
            value={otp}
            onChange={setOtp}
            disabled={verifying}
          />
        </div>

        <button
          type="submit"
          disabled={verifying || otp.length !== 6}
          className="w-full py-2.5 bg-green-800 text-white font-semibold rounded-md hover:bg-green-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying code...</span>
            </>
          ) : (
            <span>Verify Code</span>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        {timer > 0 ? (
          <p className="text-xs text-slate-400 font-medium">
            Resend code in <span className="font-bold text-slate-600">{timer}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-bold text-green-800 hover:text-green-900 flex items-center gap-1.5 mx-auto transition-colors disabled:opacity-50 cursor-pointer"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Resend Code
          </button>
        )}
      </div>

      <div className="text-center border-t border-slate-100 pt-4">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthCard
      title="Verify Your Email"
      subtitle="Complete signup by verifying your email address"
    >
      <Suspense fallback={<div className="text-center py-8 text-slate-500 text-sm">Loading verification details...</div>}>
        <VerifyOtpContent />
      </Suspense>
    </AuthCard>
  );
}
