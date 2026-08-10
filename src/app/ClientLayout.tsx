'use client';

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePathname } from 'next/navigation';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { AuthModalProvider } from '../context/AuthModalContext';
import { WishlistProvider } from '../context/WishlistContext';
import { PermissionProvider } from '../context/PermissionContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { CartSidebar } from '../components/layout/CartSidebar';
import { PopupDisplay } from '../components/campaign/PopupDisplay';
import { FloatingActions } from '../components/layout/FloatingActions';

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith('/admin');
  const isDashboardPath = pathname?.startsWith('/dashboard') || pathname?.startsWith('/customer');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AuthProvider>
      <PermissionProvider>
        <AuthModalProvider>
          <WishlistProvider>
            <CartProvider>
              <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
                {!isAdminPath && !isDashboardPath && (
                <Navbar onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
              )}
              <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              
              <main className="flex-1 w-full">
                {children}
              </main>

              {!isAdminPath && !isDashboardPath && <Footer />}
              {!isAdminPath && !isDashboardPath && <PopupDisplay />}
              {!isAdminPath && !isDashboardPath && <FloatingActions />}
              <Toaster 
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#FFFFFF',
                    color: '#1A3320',
                    border: '1px solid rgba(26, 51, 32, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '12px'
                  },
                }}
              />
            </div>
          </CartProvider>
        </WishlistProvider>
        </AuthModalProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};
