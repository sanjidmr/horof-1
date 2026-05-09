'use client';

import React from 'react';
import type { OrderStatus } from '../../lib/types';
import { cn } from '../../lib/utils';

const styles: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  processing: 'bg-blue-100 text-blue-900 border-blue-300',
  shipped: 'bg-purple-100 text-purple-900 border-purple-300',
  delivered: 'bg-green-100 text-green-900 border-green-300',
  cancelled: 'bg-red-100 text-red-900 border-red-300',
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  const label =
    status === 'processing'
      ? 'Processing'
      : status.slice(0, 1).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
        styles[status],
        className
      )}
    >
      {label}
    </span>
  );
};
