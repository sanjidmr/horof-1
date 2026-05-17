'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface HomeMotionWrapperProps {
  children: React.ReactNode;
}

export function HomeMotionWrapper({ children }: HomeMotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 sm:space-y-16 pb-12 sm:pb-24"
    >
      {children}
    </motion.div>
  );
}
