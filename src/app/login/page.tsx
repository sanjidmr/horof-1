import React, { Suspense } from 'react';
import { LoginForm } from '../../components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      {/* Page Heading */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Account</h1>
        <div className="mx-auto w-16 h-0.5 bg-green-800 mb-3" />
        <p className="text-sm text-gray-500">
          Login if you already our customer. Otherwise please{' '}
          <Link href="/signup" className="text-green-800 hover:underline">register</Link> yourself.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md">
        <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <div className="flex-1 text-center py-3 text-sm font-semibold text-gray-900 bg-white border-b-2 border-gray-900 cursor-default">
              Login
            </div>
            <Link
              href="/signup"
              className="flex-1 text-center py-3 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors border-l border-gray-200"
            >
              Registration
            </Link>
          </div>

          {/* Form Area */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Login</h2>
            <p className="text-xs text-gray-400 mb-5">
              Sign in to your account to continue shopping.
            </p>

            <Suspense
              fallback={
                <div className="text-center py-4 text-gray-400 text-sm">
                  Loading...
                </div>
              }
            >
              <LoginForm />
            </Suspense>

            <p className="text-center text-xs text-gray-500 mt-4">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-green-800 hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}