import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { PrintTrigger } from './PrintTrigger';

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, product:products(*), variant:product_variants(*)')
    .eq('order_id', id);

  const { items: metaItems } = parseProductDetails(order.product_details);

  const subtotal = Number(order.total_price || order.amount || 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const discount = Number(order.discount || 0);
  const total = subtotal + deliveryCharge - discount;

  const statusColors: Record<string, string> = {
    delivered: '#16a34a', completed: '#16a34a', pending: '#ca8a04',
    processing: '#2563eb', shipped: '#9333ea', cancelled: '#dc2626',
    returned: '#ea580c', refunded: '#0891b2',
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Invoice #{order.id}</title>
        <style>{`
          @page { size: A5; margin: 8mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #1e293b; font-size: 8.5pt; line-height: 1.4;
            padding: 0;
          }
          .header {
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 1.5pt solid #1a4731; padding-bottom: 6pt; margin-bottom: 6pt;
          }
          .brand { font-size: 16pt; font-weight: 800; color: #1a4731; letter-spacing: -0.5pt; }
          .brand-sub { font-size: 5pt; color: #64748b; margin-top: 1pt; }
          .invoice-title { font-size: 11pt; font-weight: 700; color: #94a3b8; letter-spacing: 2pt; text-transform: uppercase; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 8pt; }
          .info-block { font-size: 7pt; color: #475569; }
          .info-block strong { color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
          th {
            background: #f1f5f9; text-align: left; padding: 4pt 5pt;
            font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; color: #64748b;
            border-bottom: 1pt solid #e2e8f0;
          }
          td { padding: 4pt 5pt; border-bottom: 0.5pt solid #f1f5f9; font-size: 7pt; color: #334155; }
          td:last-child, th:last-child { text-align: right; }
          td:nth-last-child(2), th:nth-last-child(2) { text-align: center; }
          .total-row td { font-weight: 700; font-size: 8pt; color: #1a4731; border-top: 1pt solid #1a4731; border-bottom: none; }
          .summary { margin-left: auto; width: 55%; font-size: 7pt; }
          .summary-row { display: flex; justify-content: space-between; padding: 2pt 0; }
          .summary-total { font-weight: 700; font-size: 9pt; color: #1a4731; border-top: 1pt solid #1a4731; padding-top: 3pt; margin-top: 3pt; }
          .badge { display: inline-block; padding: 1pt 4pt; border-radius: 2pt; font-size: 5.5pt; font-weight: 700; color: white; }
          .footer { text-align: center; font-size: 6pt; color: #94a3b8; border-top: 0.5pt solid #e2e8f0; padding-top: 6pt; margin-top: 6pt; }
          .item-name { font-weight: 600; color: #0f172a; }
          .item-specs { font-size: 6pt; color: #64748b; margin-top: 1pt; }
    `}</style>
      </head>
      <body>
        <PrintTrigger />

        <div className="header">
          <div>
            <div className="brand">HOROF</div>
            <div className="brand-sub">Premium Handcrafted Signage &amp; Custom Acrylic Masterpieces<br />Dhaka, Bangladesh | support@horof.com</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="invoice-title">Invoice</div>
            <div style={{ fontSize: '6pt', color: '#64748b', marginTop: '3pt' }}>
              <div>#{order.id.slice(0, 8)}</div>
              <div>{new Date(order.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-block">
            <strong>Bill To</strong><br />
            {order.customer_name || 'Valued Customer'}<br />
            {order.customer_email || '—'}<br />
            {order.customer_phone || '—'}
          </div>
          <div className="info-block" style={{ textAlign: 'right' }}>
            <strong>Ship To</strong><br />
            {order.customer_name || 'Valued Customer'}<br />
            {order.customer_address || 'No address'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Item</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '18%', textAlign: 'right' }}>Price</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(items && items.length > 0 ? items : metaItems).map((item: any, idx: number) => {
              const name = item.product?.name || item.name || 'Artisan Piece';
              const qty = item.quantity || 1;
              const unitPrice = Number(item.unit_price || item.price || 0);
              const lineTotal = unitPrice * qty;
              const variant = item.variant;
              return (
                <tr key={item.id || idx}>
                  <td>
                    <div className="item-name">{name}</div>
                    {(variant?.size || variant?.color) && (
                      <div className="item-specs">{variant.size}{variant.size && variant.color ? ' | ' : ''}{variant.color}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{qty}</td>
                  <td style={{ textAlign: 'right' }}>{formatPrice(unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>{formatPrice(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '6.5pt', color: '#475569' }}>
            <strong>Payment:</strong> {order.payment_method || 'COD'} &nbsp;|&nbsp;
            <span className="badge" style={{ backgroundColor: order.payment_status === 'paid' ? '#16a34a' : '#ca8a04' }}>
              {order.payment_status || 'pending'}
            </span>
            <br />
            <strong>Status:</strong>
            <span className="badge" style={{ backgroundColor: statusColors[order.status] || '#64748b', marginLeft: '3pt' }}>
              {order.status}
            </span>
          </div>
          <div className="summary">
            <div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="summary-row"><span>Delivery</span><span>{deliveryCharge > 0 ? formatPrice(deliveryCharge) : 'Free'}</span></div>
            {discount > 0 && <div className="summary-row" style={{ color: '#16a34a' }}><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
            <div className="summary-total summary-row"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>

        <div className="footer">
          Thank you for supporting handcrafted craftsmanship!<br />
          This is a computer-generated invoice. | support@horof.com | www.horof.com
        </div>
      </body>
    </html>
  );
}
