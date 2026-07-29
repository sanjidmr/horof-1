import React from 'react';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { notFound } from 'next/navigation';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import PrintButton from './PrintButton';
import { formatPrice } from '@/lib/utils';
import { extractProductImages } from '@/lib/store/extract-images';

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
    .select('*, products(name, sku, product_images(url,sort_order)), product_variants(size, color)')
    .eq('order_id', id);

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .packing-slip-page { padding: 0 !important; background: white !important; }
        }
      `}</style>
      <div className="packing-slip-page max-w-4xl mx-auto bg-white border border-slate-200 p-10 md:p-14 shadow-sm space-y-8">

        {/* Navigation Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between border-b pb-6">
          <Link href={`/admin/orders/${order.id}`} className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Order details
          </Link>
          <PrintButton />
        </div>

        {/* Company Header */}
        <div className="flex justify-between items-start border-b-2 border-[#1a4731] pb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-[#1a4731]">Horof</h1>
            <p className="text-[10px] text-slate-500 mt-1">Premium Handcrafted Signage &amp; Custom Acrylic Masterpieces</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-[0.3em] text-slate-400">Packing Slip</h2>
            <p className="text-[10px] text-slate-500 mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Order Info & Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Order Information</h3>
              <div className="text-xs text-slate-700 space-y-1 mt-2">
                <p><span className="font-semibold text-slate-500">Order ID:</span> #{order.id}</p>
                <p><span className="font-semibold text-slate-500">Order Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                <p><span className="font-semibold text-slate-500">Order Status:</span> <span className="capitalize font-semibold text-[#1a4731]">{order.status?.replace(/_/g, ' ')}</span></p>
                <p><span className="font-semibold text-slate-500">Payment:</span> {order.payment_method || 'COD'} | <span className="capitalize">{order.payment_status || 'pending'}</span></p>
              </div>
            </div>
            <div>
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Courier</h3>
              <div className="text-xs text-slate-700 space-y-1 mt-2">
                <p><span className="font-semibold text-slate-500">Courier:</span> {metadata.courier_name || 'Not Assigned'}</p>
                {metadata.tracking_number && <p><span className="font-semibold text-slate-500">Tracking #:</span> <span className="font-mono font-bold">{metadata.tracking_number}</span></p>}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Ship To</h3>
              <div className="text-xs text-slate-700 space-y-1 mt-2 leading-relaxed">
                <p className="font-bold text-slate-900">{order.customer_name || 'Valued Customer'}</p>
                <p className="whitespace-pre-line leading-relaxed">{order.customer_address || 'No address provided'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Contact</h3>
              <div className="text-xs text-slate-700 space-y-1 mt-2">
                <p><span className="font-semibold text-slate-500">Phone:</span> {order.customer_phone || '—'}</p>
                <p><span className="font-semibold text-slate-500">Email:</span> {order.customer_email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-14">Image</th>
                <th className="px-4 py-3">Product & SKU</th>
                <th className="px-4 py-3">Specifications</th>
                <th className="px-4 py-3">Customer Note</th>
                <th className="px-4 py-3 text-center w-16">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(items ?? []).length > 0 ? (
                (items ?? []).map((item: any) => {
                  const detail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                  const specs = detail?.specifications || detail?.selectedSpecs || {};
                  const note = detail?.customer_notes || detail?.customerNotes || '';
                  const images = extractProductImages(item.products?.product_images);

                  return (
                    <tr key={item.id} className="align-middle hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                          {images[0] ? (
                            <img src={images[0]} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <span className="text-slate-300 text-[9px] font-bold">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{item.products?.name || detail?.product_name || 'Product'}</p>
                        {item.products?.sku && <p className="text-[9px] text-slate-400 font-mono mt-0.5">SKU: {item.products.sku}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {specs && typeof specs === 'object' && Object.keys(specs).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(specs).map(([k, v]) => (
                              <p key={k} className="text-[10px] text-slate-600"><span className="font-semibold text-slate-500">{k}:</span> {String(v)}</p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {note ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block max-w-[200px] truncate" title={note}>
                            {note}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    </tr>
                  );
                })
              ) : (
                metaItems.map((item: any, idx: number) => (
                  <tr key={idx} className="align-middle hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <span className="text-slate-300 text-[9px] font-bold">N/A</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{item.product_name || 'Product'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(item.specifications).map(([k, v]) => (
                            <p key={k} className="text-[10px] text-slate-600"><span className="font-semibold text-slate-500">{k}:</span> {String(v)}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.customer_notes || item.customerNotes ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">{item.customer_notes || item.customerNotes}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{item.quantity || 1}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Order Totals */}
        <div className="border-t pt-4">
          <div className="ml-auto w-full md:w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-semibold text-slate-800">{formatPrice(Number(order.total_price || order.amount || 0))}</span></div>
            <div className="flex justify-between text-slate-500"><span>Delivery Charge</span><span className="font-semibold text-slate-800">{Number(order.delivery_charge) > 0 ? formatPrice(Number(order.delivery_charge)) : 'Free'}</span></div>
            {metadata.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount{metadata.coupon_code ? ` (${metadata.coupon_code})` : ''}</span><span className="font-semibold">-{formatPrice(metadata.discount)}</span></div>}
            <div className="flex justify-between text-base font-black text-[#1a4731] border-t border-slate-200 pt-2 mt-2">
              <span>Grand Total</span>
              <span>{formatPrice(Number(order.total_price || order.amount || 0))}</span>
            </div>
          </div>
        </div>

        {/* Admin Note */}
        {metadata.internal_notes && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h4 className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Admin Note</h4>
            <p className="text-xs text-slate-700 italic">{metadata.internal_notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t pt-6 border-slate-100">
          <div className="flex flex-col justify-end space-y-6">
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
        <div className="text-center text-[10px] text-slate-400 border-t pt-6 border-slate-100 leading-relaxed">
          Horof — Premium Handcrafted Signage<br />
          support@horof.com | www.horof.com<br />
          Pack with protective foam and heavy wrapping to prevent damage.
        </div>

      </div>
    </div>
  );
}
