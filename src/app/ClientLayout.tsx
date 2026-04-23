'use client';

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePathname } from 'next/navigation';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { WishlistProvider } from '../context/WishlistContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { CartSidebar } from '../components/layout/CartSidebar';

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith('/admin');

  useEffect(() => {
    setHasMounted(true);
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!hasMounted) return <div className="min-h-screen bg-white" />;

  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
            {!isAdminPath && <Navbar onOpenCart={() => setIsCartOpen(true)} />}
            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            
            <main className="flex-1 w-full">
              {children}
            </main>

            {!isAdminPath && <Footer />}
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
    </AuthProvider>
  );
};
