'use client';

import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster richColors position="bottom-right" closeButton />
    </ThemeProvider>
  );
}
