'use client';

import React from 'react';

interface HomeMotionWrapperProps {
  children: React.ReactNode;
}

export function HomeMotionWrapper({ children }: HomeMotionWrapperProps) {
  return (
    <div className="space-y-8 sm:space-y-16 pb-12 sm:pb-24">
      {children}
    </div>
  );
}
