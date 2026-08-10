'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { Lock, X, LogIn, UserPlus } from 'lucide-react';

interface AuthModalContextType {
  requireAuth: (action: () => void, message?: string, redirectTo?: string) => void;
  isOpen: boolean;
  message: string;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('Please login first to continue.');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string>('/checkout');
  const router = useRouter();
  const pathname = usePathname();

  const requireAuth = (action: () => void, customMessage?: string, redirectTo?: string) => {
    if (isAuthenticated) {
      action();
    } else {
      setMessage(customMessage || 'Please login first to continue.');
      setPendingAction(() => action);
      setPendingRedirect(redirectTo || pathname || '/');
      setIsOpen(true);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  const handleRedirectToLogin = () => {
    setIsOpen(false);
    const encodedPath = encodeURIComponent(pendingRedirect);
    router.push(`/login?next=${encodedPath}`);
  };

  const handleRedirectToSignup = () => {
    setIsOpen(false);
    const encodedPath = encodeURIComponent(pendingRedirect);
    router.push(`/signup?next=${encodedPath}`);
  };

  return (
    <AuthModalContext.Provider value={{ requireAuth, isOpen, message, closeModal }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-2xl space-y-6 text-center transform scale-100 transition-all">
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Lock Icon Wrapper */}
            <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
              <Lock className="h-8 w-8" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Authentication Required</h3>
              <p className="text-slate-500 text-sm leading-relaxed px-4">{message}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleRedirectToLogin}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:shadow-none"
              >
                <LogIn className="h-4.5 w-4.5" />
                Sign In
              </button>
              
              <button
                onClick={handleRedirectToSignup}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-2 border border-slate-100"
              >
                <UserPlus className="h-4.5 w-4.5" />
                Create An Account
              </button>

              <button
                onClick={closeModal}
                className="w-full py-3 text-slate-400 hover:text-slate-600 font-medium text-sm transition"
              >
                Continue Browsing as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
};

export const useRequireAuth = () => {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error('useRequireAuth must be used within an AuthModalProvider');
  return context;
};
