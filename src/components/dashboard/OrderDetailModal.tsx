'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import type { OrderWithItems } from '../../lib/dashboard/types';
import { normalizeOrderStatus } from '../../lib/dashboard/types';
import type { OrderStatus } from '../../lib/types';
import { orderRowTotal, parseProductImages } from '../../lib/dashboard/orderHelpers';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Button } from '../ui/Button';

interface OrderDetailModalProps {
  order: OrderWithItems | null;
  open: boolean;
  onClose: () => void;
  /** Shown when the order row has no shipping_* columns populated */
  shippingFallback?: string;
  onDownloadInvoice?: (order: OrderWithItems) => void;
}

const TIMELINE: Array<{ status: OrderStatus; label: string; desc: string }> = [
  { status: 'pending', label: 'Confirmed', desc: 'We received your order' },
  { status: 'processing', label: 'Processing', desc: 'Preparing your pieces' },
  { status: 'shipped', label: 'Shipped', desc: 'On the way to you' },
  { status: 'delivered', label: 'Delivered', desc: 'Enjoy your Horof piece' },
];

function statusRank(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 1;
    case 'processing':
      return 2;
    case 'shipped':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

function stepReached(current: OrderStatus, step: OrderStatus): boolean {
  if (current === 'cancelled') return false;
  const c = statusRank(current);
  const s = statusRank(step);
  return c >= s;
}

export function OrderDetailModal({
  order,
  open,
  onClose,
  shippingFallback,
  onDownloadInvoice,
}: OrderDetailModalProps) {
  if (!open || !order) return null;

  const status = normalizeOrderStatus(order.status);
  const lineItems = order.items ?? [];
  const shippingLine =
    [order.shipping_address, order.shipping_city].filter(Boolean).join(', ') ||
    shippingFallback ||
    'Shipping details will appear here once fulfillment updates your order.';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-accent-primary/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border-forest bg-white shadow-2xl shadow-accent-primary/10 sm:rounded-[2rem]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-forest bg-white/95 px-6 py-4 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary">
                  Order
                </p>
                <p className="font-mono text-sm font-bold text-accent-primary">{order.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={status} />
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-border-forest bg-bg-secondary p-2 text-accent-primary hover:border-accent-primary transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-8 px-6 py-8">
              {status === 'cancelled' ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-900">
                  This order has been cancelled. Contact support if you need help.
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-bold text-accent-primary">Timeline</h3>
                  <div className="space-y-4">
                    {TIMELINE.map((step, i) => {
                      const completed = stepReached(status, step.status);
                      const Icon = completed ? CheckCircle : Clock;
                      return (
                        <div key={step.label} className="relative flex gap-4 pl-2">
                          {i < TIMELINE.length - 1 && (
                            <span
                              className={cn(
                                'absolute left-[22px] top-10 bottom-[-18px] w-0.5',
                                completed ? 'bg-accent-primary/40' : 'bg-border-forest'
                              )}
                              aria-hidden
                            />
                          )}
                          <div
                            className={cn(
                              'relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm',
                              completed
                                ? 'border-accent-primary bg-accent-primary text-white'
                                : 'border-border-forest bg-bg-secondary text-text-muted'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-accent-primary">{step.label}</p>
                            <p className="text-xs text-text-secondary">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-border-forest bg-bg-secondary p-6 shadow-inner">
                <div className="mb-3 flex items-center gap-2 text-accent-primary">
                  <Truck className="h-4 w-4" />
                  <h4 className="text-sm font-bold uppercase tracking-widest">Shipping address</h4>
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">{shippingLine}</p>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2 text-accent-primary">
                  <Package className="h-4 w-4" />
                  <h4 className="font-display text-lg font-bold">Items</h4>
                </div>
                <ul className="space-y-3">
                  {lineItems.map((li) => {
                    const imgs = parseProductImages(li.product?.images);
                    const thumb = imgs[0];
                    const name = li.product?.name ?? 'Product';
                    const unit =
                      typeof li.price === 'string' ? parseFloat(li.price) : Number(li.price);
                    const safeUnit = Number.isFinite(unit) ? unit : 0;
                    const lineTotal = safeUnit * li.quantity;

                    return (
                      <li
                        key={li.id}
                        className="flex items-center gap-4 rounded-2xl border border-border-forest bg-white p-3 shadow-sm"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-bg-secondary">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-accent-primary">
                              {name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-accent-primary">{name}</p>
                          <p className="text-[11px] text-text-secondary">
                            Qty {li.quantity} · {formatPrice(safeUnit)}
                          </p>
                        </div>
                        <p className="text-sm font-display font-bold text-gold">{formatPrice(lineTotal)}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex flex-col gap-3 border-t border-border-forest pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-secondary">
                  Total{' '}
                  <span className="font-display text-2xl font-bold text-accent-primary">
                    {formatPrice(orderRowTotal(order))}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl normal-case tracking-normal font-semibold"
                  onClick={() => onDownloadInvoice?.(order)}
                >
                  Download invoice
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
