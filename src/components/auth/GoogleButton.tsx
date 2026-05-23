'use client';

import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

export const GoogleButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const nextUrl = searchParams?.get('next') || '/';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) throw error;
      
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to initialize Google login');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:shadow-md transition-all disabled:opacity-50"
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.71 17.58V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
          <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.58C14.73 18.24 13.48 18.64 12 18.64C9.14 18.64 6.7 16.71 5.81 14.12H2.12V16.98C3.94 20.6 7.68 23 12 23Z" fill="#34A853"/>
          <path d="M5.81 14.12C5.58 13.44 5.45 12.73 5.45 12C5.45 11.27 5.58 10.56 5.81 9.88V7.02H2.12C1.38 8.5 0.95 10.2 0.95 12C0.95 13.8 1.38 15.5 2.12 16.98L5.81 14.12Z" fill="#FBBC05"/>
          <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.03L19.36 3.87C17.46 2.11 14.97 1 12 1C7.68 1 3.94 3.4 2.12 7.02L5.81 9.88C6.7 7.29 9.14 5.38 12 5.38Z" fill="#EA4335"/>
        </svg>
      )}
      Continue with Google
    </button>
  );
};
