import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'error' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className }) => {
  const variants = {
    primary: 'bg-accent-primary/20 text-accent-light border-accent-primary/30',
    secondary: 'bg-bg-card text-text-secondary border-border-forest',
    gold: 'bg-gold/20 text-gold border-gold/30',
    success: 'bg-success/20 text-success border-success/30',
    error: 'bg-error/20 text-error border-error/30',
    outline: 'bg-transparent border border-text-muted text-text-muted',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
