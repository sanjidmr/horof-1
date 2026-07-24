import React from 'react';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import DownloadInvoiceButton from './DownloadInvoiceButton';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, product:products(*), variant:product_variants(*)')
    .eq('order_id', id);

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  const subtotal = Number(order.total_price || order.amount || 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const discount = Number(metadata.discount || 0);
  const total = subtotal + deliveryCharge - discount;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar - OUTSIDE invoice content */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-6 flex items-center justify-between print:hidden">
        <Link href="/orders" className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Orders
        </Link>
        <div className="flex gap-3">
          <Link href={`/track-order?order=${order.id}`} className="inline-flex items-center h-10 px-4 rounded-xl border text-xs font-bold hover:bg-slate-50 transition-colors">
            Track Order
          </Link>
          <DownloadInvoiceButton />
        </div>
      </div>

      {/* Pure invoice content - NO chrome, clean white, A4 proportions */}
      <div id="invoice-content" className="max-w-4xl mx-auto bg-white px-10 md:px-16 py-10 md:py-14">
        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10 border-slate-100">
          <div>
            <h1 className="text-3xl font-display font-bold text-[#1a4731] tracking-tight">HOROF</h1>
            <p className="text-xs text-slate-500 font-light mt-1 max-w-xs leading-relaxed">
              Premium Handcrafted Signage & Custom Acrylic Masterpieces.<br />
              Dhaka, Bangladesh.<br />
              support@horof.com | www.horof.com
            </p>
          </div>
          <div className="md:text-right space-y-2">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-400">Invoice</h2>
            <div className="text-xs text-slate-500 space-y-1">
              <p><span className="font-bold text-slate-700">Order ID:</span> #{order.id}</p>
              {order.transaction_id && <p><span className="font-bold text-slate-700">Txn ID:</span> <span className="font-mono">{order.transaction_id}</span></p>}
              <p><span className="font-bold text-slate-700">Date:</span> {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
            </div>
          </div>
        </div>

        {/* Customer & Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Billed To</h3>
            <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
              <p className="font-bold text-sm text-slate-900">{order.customer_name || 'Valued Customer'}</p>
              <p>{order.customer_email || '—'}</p>
              <p>{order.customer_phone || '—'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Shipping Address</h3>
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              <p className="font-bold text-sm text-slate-900">{order.customer_name || 'Valued Customer'}</p>
              {order.customer_address || 'No address provided'}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8 border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items && items.length > 0 ? (
                items.map((item: any) => {
                  const detail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                  const specs = detail?.selectedSpecs || {};
                  const designCharge = Number(detail?.designCharge || 0);

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-6 py-4 space-y-1.5">
                        <div className="font-bold text-slate-900">{item.product?.name || 'Artisan Piece'}</div>
                        {item.variant?.size && (
                          <div className="text-[10px] text-slate-500">
                            Size: {item.variant.size} {item.variant?.color && `| Color: ${item.variant.color}`}
                          </div>
                        )}
                        {specs && Object.keys(specs).length > 0 && (
                          <div className="text-[10px] text-[#1B4332] bg-[#E6F0EB] px-2 py-1 rounded-md inline-block">
                            {Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                        {designCharge > 0 && (
                          <p className="text-[10px] text-emerald-700 font-medium">+ Design Charge: {formatPrice(designCharge)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">{formatPrice(Number(item.unit_price))}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatPrice(Number(item.unit_price) * item.quantity + designCharge)}</td>
                    </tr>
                  );
                })
              ) : (
                metaItems.map((item: any, idx: number) => {
                  const designCharge = Number(item.designCharge || 0);
                  return (
                    <tr key={idx} className="align-top">
                      <td className="px-6 py-4 space-y-1.5">
                        <div className="font-bold text-slate-900">{item.name || 'Artisan Piece'}</div>
                        {item.selectedSpecs && Object.keys(item.selectedSpecs).length > 0 && (
                          <div className="text-[10px] text-[#1B4332] bg-[#E6F0EB] px-2 py-1 rounded-md inline-block">
                            {Object.entries(item.selectedSpecs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                        {designCharge > 0 && (
                          <p className="text-[10px] text-emerald-700 font-medium">+ Design Charge: {formatPrice(designCharge)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">{formatPrice(Number(item.unit_price))}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatPrice(Number(item.unit_price) * item.quantity + designCharge)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-t pt-8 mt-8 border-slate-100">
          <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
            <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Payment Details</h4>
            <p><span className="font-bold">Method:</span> <span className="capitalize">{order.payment_method || 'Cash on Delivery'}</span></p>
            <p><span className="font-bold">Status:</span> <span className="capitalize font-bold text-slate-900">{order.payment_status || 'Pending'}</span></p>
            {metadata.customer_notes && (
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl mt-2 max-w-sm">
                <span className="font-bold text-amber-900 block mb-0.5">Note:</span>
                <span className="text-[11px] text-amber-800">{metadata.customer_notes}</span>
              </div>
            )}
          </div>
          <div className="w-full md:w-80 text-xs space-y-2.5">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Delivery Charge:</span>
              <span>{deliveryCharge > 0 ? formatPrice(deliveryCharge) : 'Free'}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount {metadata.coupon_code ? `(${metadata.coupon_code})` : ''}:</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2 border-slate-200">
              <span>Total:</span>
              <span className="text-[#1a4731]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Invoice Footer */}
        <div className="border-t pt-10 mt-8 text-center space-y-2 border-slate-100">
          <p className="text-xs font-semibold text-slate-700">Thank you for supporting heritage craftsmanship!</p>
          <p className="text-[10px] text-slate-400 font-light leading-relaxed">
            This is a computer-generated invoice and requires no physical signature.<br />
            If you have any questions, please contact us at support@horof.com.
          </p>
        </div>
      </div>
    </div>
  );
}
