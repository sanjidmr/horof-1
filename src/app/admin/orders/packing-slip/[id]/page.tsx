import React from 'react';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { notFound } from 'next/navigation';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import PrintButton from './PrintButton';

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 print:bg-white print:py-0 print:px-0">
      <div id="packing-slip-content" className="max-w-4xl mx-auto bg-white border border-slate-200 p-10 md:p-14 print:border-none print:p-0 print:shadow-none shadow-sm space-y-10">
        
        {/* Navigation Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-6 print:hidden">
          <Link href={`/admin/orders/${order.id}`} className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Order details
          </Link>
          <PrintButton />
        </div>

        {/* Packing Slip Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8 border-slate-100">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-[#1a4731]">Packing Slip</h1>
            <p className="text-xs text-slate-500 font-light mt-1">
              Please pick and pack the following products for delivery.
            </p>
          </div>
          <div className="md:text-right text-xs text-slate-500 space-y-1">
            <p><span className="font-bold text-slate-700">Order ID:</span> #{order.id}</p>
            <p><span className="font-bold text-slate-700">Fulfillment:</span> <span className="font-semibold text-slate-900 capitalize">{metadata.fulfillment_status || 'Unfulfilled'}</span></p>
            <p><span className="font-bold text-slate-700">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Ship To</h3>
            <div className="text-xs text-slate-700 space-y-1 leading-relaxed">
              <p className="font-bold text-slate-900">{order.customer_name || 'Valued Customer'}</p>
              <p className="whitespace-pre-line leading-relaxed">{order.customer_address || 'No address provided'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Contact Details</h3>
            <div className="text-xs text-slate-700 space-y-1 leading-relaxed">
              <p><span className="font-bold text-slate-400">Phone:</span> {order.customer_phone || '—'}</p>
              <p><span className="font-bold text-slate-400">Email:</span> {order.customer_email || '—'}</p>
              <p><span className="font-bold text-slate-400">Courier:</span> <span className="font-semibold text-[#1a4731]">{metadata.courier_name || 'Not Assigned'}</span></p>
              {metadata.tracking_number && <p><span className="font-bold text-slate-400">Tracking #:</span> <span className="font-mono">{metadata.tracking_number}</span></p>}
            </div>
          </div>
        </div>

        {/* Pick List Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 text-center w-12">Picked</th>
                <th className="px-6 py-4">Item & Custom Specifications</th>
                <th className="px-6 py-4 text-center w-20">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items && items.length > 0 ? (
                items.map((item: any) => {
                  const detail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                  const specs = detail?.selectedSpecs || {};

                  return (
                    <tr key={item.id} className="align-middle hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <div className="h-5 w-5 mx-auto border-2 border-slate-300 rounded-md bg-white print:border-black" />
                      </td>
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
                        {detail?.customerNotes && (
                          <p className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1 max-w-md">
                            <span className="font-bold">Customer Note:</span> {detail.customerNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{item.quantity}</td>
                    </tr>
                  );
                })
              ) : (
                metaItems.map((item: any, idx: number) => (
                  <tr key={idx} className="align-middle hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <div className="h-5 w-5 mx-auto border-2 border-slate-300 rounded-md bg-white print:border-black" />
                    </td>
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="font-bold text-slate-900">{item.name || 'Artisan Piece'}</div>
                      {item.selectedSpecs && Object.keys(item.selectedSpecs).length > 0 && (
                        <div className="text-[10px] text-[#1B4332] bg-[#E6F0EB] px-2 py-1 rounded-md inline-block">
                          {Object.entries(item.selectedSpecs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </div>
                      )}
                      {item.customerNotes && (
                        <p className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1 max-w-md">
                          <span className="font-bold">Customer Note:</span> {item.customerNotes}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Special Instructions & Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t pt-8 border-slate-100">
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warehouse Notes</h4>
            {metadata.internal_notes ? (
              <div className="p-4 bg-slate-50 rounded-2xl border text-xs text-slate-700 italic">
                {metadata.internal_notes}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No internal warehouse notes for this order.</p>
            )}
          </div>
          
          {/* Signatures */}
          <div className="flex flex-col justify-end space-y-6 pt-6">
            <div className="flex justify-between items-end border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Picked By:</span>
              <span className="text-xs border-b border-slate-300 w-36 h-4" />
            </div>
            <div className="flex justify-between items-end border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checked By:</span>
              <span className="text-xs border-b border-slate-300 w-36 h-4" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 border-t pt-8 border-slate-100 leading-relaxed">
          Horof Signage Packing slip. Verify all dimensions and finishes match order parameters prior to packing.<br />
          Pack with protective foam and heavy wrapping to prevent damage.
        </div>

      </div>
    </div>
  );
}
