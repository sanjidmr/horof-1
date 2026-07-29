import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { PrintTrigger } from './PrintTrigger';
import { extractProductImages } from '@/lib/store/extract-images';

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, products(name, sku, product_images(url,sort_order)), product_variants(size, color)')
    .eq('order_id', id);

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  const subtotal = Number(order.total_price || order.amount || 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const discount = Number(metadata.discount || order.discount || 0);
  const total = subtotal + deliveryCharge - discount;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Invoice #{order.id}</title>
        <style>{`
          @page { size: A5 portrait; margin: 6mm; }
          @media print {
            html, body { width: 148mm; height: 210mm; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #1e293b; font-size: 7.5pt; line-height: 1.35;
            padding: 2mm;
          }
          .header {
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 1.5pt solid #1a4731; padding-bottom: 4pt; margin-bottom: 4pt;
          }
          .brand { font-size: 14pt; font-weight: 800; color: #1a4731; letter-spacing: -0.5pt; }
          .brand-sub { font-size: 5pt; color: #64748b; margin-top: 1pt; line-height: 1.4; }
          .inv-title { font-size: 10pt; font-weight: 700; color: #94a3b8; letter-spacing: 2pt; text-transform: uppercase; }
          .info-grid { display: flex; justify-content: space-between; gap: 4pt; margin-bottom: 5pt; }
          .info-block { font-size: 6.5pt; color: #475569; flex: 1; }
          .info-block strong { color: #1e293b; font-size: 6pt; text-transform: uppercase; letter-spacing: 0.3pt; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5pt; }
          th {
            background: #f1f5f9; text-align: left; padding: 3pt 4pt;
            font-size: 5.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3pt; color: #64748b;
            border-bottom: 0.75pt solid #e2e8f0;
          }
          td { padding: 3pt 4pt; border-bottom: 0.5pt solid #f1f5f9; font-size: 6.5pt; color: #334155; vertical-align: top; }
          td:last-child, th:last-child { text-align: right; }
          td:nth-last-child(2), th:nth-last-child(2) { text-align: center; }
          .item-img { width: 22pt; height: 22pt; border-radius: 2pt; object-fit: cover; background: #f8fafc; }
          .item-name { font-weight: 600; color: #0f172a; font-size: 6.5pt; }
          .item-sku { font-size: 5.5pt; color: #94a3b8; font-family: monospace; }
          .item-specs { font-size: 5.5pt; color: #64748b; margin-top: 1pt; line-height: 1.3; }
          .summary { margin-left: auto; width: 55%; font-size: 6.5pt; }
          .summary-row { display: flex; justify-content: space-between; padding: 1.5pt 0; }
          .summary-total { font-weight: 700; font-size: 8pt; color: #1a4731; border-top: 0.75pt solid #1a4731; padding-top: 2pt; margin-top: 2pt; }
          .badge { display: inline-block; padding: 0.5pt 3pt; border-radius: 1.5pt; font-size: 5pt; font-weight: 700; color: white; }
          .footer { text-align: center; font-size: 5.5pt; color: #94a3b8; border-top: 0.5pt solid #e2e8f0; padding-top: 4pt; margin-top: 4pt; line-height: 1.5; }
          .footer strong { color: #64748b; }
          .divider { border: none; border-top: 0.5pt dashed #e2e8f0; margin: 3pt 0; }
    `}</style>
      </head>
      <body>
        <PrintTrigger />

        {/* Header */}
        <div className="header">
          <div>
            <div className="brand">HOROF</div>
            <div className="brand-sub">
              Premium Handcrafted Signage &amp; Custom Acrylic Masterpieces<br />
              Dhaka, Bangladesh | support@horof.com | www.horof.com
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="inv-title">Invoice</div>
            <div style={{ fontSize: '5.5pt', color: '#64748b', marginTop: '2pt' }}>
              <div>#{String(order.id).slice(0, 8).toUpperCase()}</div>
              <div>{new Date(order.created_at).toLocaleDateString('en-GB')}</div>
            </div>
          </div>
        </div>

        {/* Customer & Order Info */}
        <div className="info-grid">
          <div className="info-block">
            <strong>Bill To</strong><br />
            {order.customer_name || 'Valued Customer'}<br />
            {order.customer_email || '—'}<br />
            {order.customer_phone || '—'}
          </div>
          <div className="info-block">
            <strong>Ship To</strong><br />
            {order.customer_name || 'Valued Customer'}<br />
            {order.customer_address ? order.customer_address.split('\n').map((l: string, i: number) => <span key={i}>{l}<br /></span>) : 'No address'}
          </div>
          <div className="info-block" style={{ textAlign: 'right' }}>
            <strong>Order</strong><br />
            #{String(order.id).slice(0, 8).toUpperCase()}<br />
            <span className="badge" style={{ backgroundColor: order.payment_status === 'paid' ? '#16a34a' : '#ca8a04', marginTop: '1pt', display: 'inline-block' }}>
              {order.payment_status || 'pending'}
            </span>
            &nbsp;
            <span className="badge" style={{ backgroundColor: '#1a4731' }}>
              {order.status?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <hr className="divider" />

        {/* Products Table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '6%' }}></th>
              <th style={{ width: '30%' }}>Item</th>
              <th style={{ width: '16%' }}>Specs</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Price</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Disc</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(items && items.length > 0 ? items : metaItems).map((item: any, idx: number) => {
              const name = item.products?.name || item.product_name || item.name || 'Product';
              const sku = item.products?.sku || '';
              const qty = item.quantity || 1;
              const unitPrice = Number(item.unit_price || item.price || 0);
              const images = item.products?.product_images ? extractProductImages(item.products.product_images) : [];
              const specs = item.specifications || item.selectedSpecs || {};
              const design = Number(item.design_charge || item.designCharge || 0);
              const lineTotal = unitPrice * qty + design;
              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    {images[0] ? (
                      <img src={images[0]} alt="" className="item-img" />
                    ) : (
                      <div className="item-img" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '5pt', color: '#cbd5e1' }}>N/A</div>
                    )}
                  </td>
                  <td>
                    <div className="item-name">{name}</div>
                    {sku && <div className="item-sku">SKU: {sku}</div>}
                  </td>
                  <td>
                    {specs && typeof specs === 'object' && Object.keys(specs).length > 0 ? (
                      <div className="item-specs">
                        {Object.entries(specs).map(([k, v]) => (
                          <div key={k}>{k}: {String(v)}</div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '5.5pt' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{qty}</td>
                  <td style={{ textAlign: 'right' }}>{formatPrice(unitPrice)}</td>
                  <td style={{ textAlign: 'right', color: design > 0 ? '#16a34a' : '#cbd5e1' }}>{design > 0 ? formatPrice(design) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatPrice(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary & Payment Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2pt' }}>
          <div style={{ fontSize: '6pt', color: '#475569', maxWidth: '45%' }}>
            <div><strong>Payment:</strong> {order.payment_method || 'COD'}</div>
            <div><strong>Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{order.status?.replace(/_/g, ' ')}</span></div>
            {metadata.coupon_code && <div><strong>Coupon:</strong> {metadata.coupon_code}</div>}
            {order.customer_notes_text && <div style={{ marginTop: '2pt' }}><strong>Note:</strong> {order.customer_notes_text}</div>}
          </div>
          <div className="summary">
            <div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="summary-row"><span>Delivery</span><span>{deliveryCharge > 0 ? formatPrice(deliveryCharge) : 'Free'}</span></div>
            {discount > 0 && <div className="summary-row" style={{ color: '#16a34a' }}><span>Discount{metadata.coupon_code ? ` (${metadata.coupon_code})` : ''}</span><span>-{formatPrice(discount)}</span></div>}
            <div className="summary-total summary-row"><span>Grand Total</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          Thank you for supporting handcrafted craftsmanship!<br />
          <strong>Horof</strong> — Dhaka, Bangladesh | <strong>Web:</strong> www.horof.com | <strong>Email:</strong> support@horof.com<br />
          This is a computer-generated invoice. No signature required.
        </div>
      </body>
    </html>
  );
}
