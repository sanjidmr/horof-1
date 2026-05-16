'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type SettingsContextType = {
  settings: Record<string, any>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ settings, children }: { settings: Record<string, any>; children: ReactNode }) {
  return <SettingsContext.Provider value={{ settings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
