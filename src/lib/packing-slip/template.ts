/**
 * Packing slip HTML template — used by both the on-screen packing slip page
 * and the server-side PDF generator.
 */
import { escapeHtml, formatMoney, formatDate } from '@/lib/invoice/format';
import { getCompanyInfo } from '@/lib/invoice/company';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { GeneralSettings } from '@/lib/settings/types';
import { DEFAULT_GENERAL } from '@/lib/settings/types';
import { mergeSettingsWithDefaults } from '@/lib/utils/safe-json';

/**
 * Fetch company info from site settings, falling back to static defaults.
 * This is a local version that accepts a Supabase client directly.
 */
async function getSettingsCompanyInfo(supabase: any): Promise<ReturnType<typeof getCompanyInfo>> {
  const company = getCompanyInfo();
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['general']);
    
    const map: Record<string, unknown> = {};
    (data || []).forEach((row: any) => { map[row.key] = row.value; });
    
    const g = mergeSettingsWithDefaults<GeneralSettings>(map.general, DEFAULT_GENERAL);
    
    return {
      ...company,
      brand: g.website_name?.toUpperCase() || company.brand,
      address: g.business_address || company.address,
      email: g.support_email || company.email,
      phone: g.phone || company.phone,
      logoUrl: g.company_logo || company.logoUrl,
    };
  } catch {
    return company;
  }
}

export type PackingSlipItem = {
  id?: string;
  product_id?: string | null;
  product_name?: string;
  sku?: string;
  quantity: number;
  specifications?: Record<string, any>;
  customer_notes?: string;
  image_url?: string | null;
};

export type PackingSlipData = {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  courierName: string;
  trackingNumber: string;
  items: PackingSlipItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode: string;
  grandTotal: number;
  internalNotes: string;
};

export function buildPackingSlipStyles(): string {
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#eef1ef;color:#17221c;line-height:1.45;-webkit-font-smoothing:antialiased}
.sheet{width:210mm;min-height:297mm;margin:24px auto;padding:15mm 15mm 12mm;background:#fff;box-shadow:0 24px 70px rgba(16,37,28,.16);border-radius:6px;overflow:hidden;position:relative}
@page{size:A4;margin:0}
@media print{body{background:#fff!important}.no-print{display:none!important}.sheet{margin:0;width:210mm;min-height:297mm;box-shadow:none;border-radius:0}.items thead{display:table-header-group}.items tr,.items td,.items th{page-break-inside:avoid}.keep{page-break-inside:avoid}}
.ps-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #1a4731;padding-bottom:18px}
.brand-block{display:flex;align-items:center;gap:14px}
.brand-logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#1a4731,#2d6a4f);display:flex;align-items:center;justify-content:center;color:#f6e5b8;font-weight:900;font-size:24px;letter-spacing:-1px;font-family:Georgia,'Times New Roman',serif;box-shadow:0 8px 20px rgba(26,71,49,.28)}
.brand-name{font-size:24px;font-weight:900;color:#10251c;letter-spacing:2px;line-height:1.1}
.brand-tagline{font-size:9.5px;color:#5d7366;margin-top:3px;letter-spacing:.2px;max-width:230px}
.ps-head-right{text-align:right}
.ps-title{font-size:24px;font-weight:800;color:#c9a962;letter-spacing:6px;text-transform:uppercase}
.ps-date{font-size:10px;color:#5d7366;margin-top:4px}
.meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:20px}
.meta-card{border:1px solid #e7ece9;border-radius:12px;padding:12px 14px;background:#fafcfb}
.meta-label{font-size:8.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#c9a962;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid #edf1ef}
.meta-line{font-size:10.5px;color:#3c4b42;line-height:1.5}
.meta-line strong{color:#17221c;font-weight:700}
.meta-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
.items-section{margin-top:20px}
.items{width:100%;border-collapse:collapse;font-size:10.5px}
.items thead th{background:#10251c;color:#fff;text-align:left;padding:9px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px}
.items thead th:first-child{border-top-left-radius:10px;border-bottom-left-radius:10px}
.items thead th:last-child{border-top-right-radius:10px;border-bottom-right-radius:10px}
.items thead th.num,.items td.num{text-align:right}
.items tbody td{padding:10px;border-bottom:1px solid #eff3f1;vertical-align:middle}
.items tbody tr.alt td{background:#f7faf8}
.items td{color:#33443a}
.items .col-img{width:54px;text-align:center}
.items .col-img img{width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e7ece9}
.img-ph{width:40px;height:40px;border-radius:8px;background:#edf1ef;color:#a9b8af;display:inline-flex;align-items:center;justify-content:center;font-size:9px}
.items .pname{font-weight:700;color:#17221c;font-size:11px}
.items .pvariant{font-size:9.5px;color:#5d7366;margin-top:3px}
.items .sku{font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:9px;color:#5d7366;background:#edf1ef;padding:2px 6px;border-radius:6px}
.items .note{font-size:9px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:3px 8px;border-radius:6px;display:inline-block;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.totals{margin-top:18px;display:flex;justify-content:flex-end}
.summary{width:260px}
.summary-card{border:1px solid #e7ece9;border-radius:14px;overflow:hidden;background:#fafcfb}
.summary-head{background:#10251c;color:#fff;padding:10px 14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px}
.srow{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;font-size:11px;color:#3c4b42;border-top:1px solid #eff3f1}
.srow .free{font-style:normal;color:#1a7f46;font-weight:700}
.srow .coupon{font-size:9px;color:#5d7366;font-weight:600}
.srow.neg{color:#1a7f46;font-weight:600}
.srow.grand{background:linear-gradient(135deg,#1a4731,#2d6a4f);color:#fff;font-size:13px;font-weight:900;padding:12px 14px}
.srow.grand span:last-child{font-size:15px}
.notes-box{margin-top:16px;border:1px dashed #d8e1dc;border-radius:12px;padding:12px 14px;background:#fbfdfc}
.notes-box .meta-label{border-bottom:none;margin-bottom:4px}
.notes-box p{font-size:10px;color:#4b5c53;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.signatures{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px;border-top:1px solid #e7ece9;padding-top:20px}
.sig-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #d8e1dc;padding-bottom:6px;margin-bottom:16px}
.sig-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#5d7366}
.sig-line{width:120px;height:14px}
.ps-footer{margin-top:20px;border-top:1px solid #e7ece9;padding-top:14px;text-align:center}
.ps-footer p{font-size:9px;color:#93a39a;line-height:1.6;letter-spacing:.3px}
@media screen and (max-width:860px){.sheet{width:100%;min-height:auto;margin:0;border-radius:0;padding:20px 14px}.ps-header{flex-direction:column;gap:16px}.ps-head-right{text-align:left}.meta-grid,.signatures{grid-template-columns:1fr}.items-section{overflow-x:auto}.items{min-width:640px}.totals{justify-content:stretch}.summary{width:100%}}
`;
}

export async function buildPackingSlipBody(data: PackingSlipData, supabase: any): Promise<string> {
  let company = getCompanyInfo();
  try {
    company = await getSettingsCompanyInfo(supabase);
  } catch {
    // fall back to static company info
  }

  const itemsRows = data.items
    .map((item, idx) => {
      const specs = item.specifications && typeof item.specifications === 'object' ? item.specifications : {};
      const specEntries = Object.entries(specs).filter(([, v]) => v !== null && v !== undefined && v !== '');
      const specText = specEntries.map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`).join(' · ');

      return `<tr class="${idx % 2 === 1 ? 'alt' : ''}">
        <td class="col-img">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" width="40" height="40" />` : '<div class="img-ph">—</div>'}</td>
        <td><div class="pname">${escapeHtml(item.product_name || 'Product')}</div>${item.sku ? `<div class="pvariant"><span class="sku">SKU: ${escapeHtml(item.sku)}</span></div>` : ''}</td>
        <td>${specText ? `<div class="pvariant">${specText}</div>` : '<span style="color:#a9b8af;font-size:9px;">—</span>'}</td>
        <td>${item.customer_notes ? `<span class="note" title="${escapeHtml(item.customer_notes)}">${escapeHtml(item.customer_notes)}</span>` : '<span style="color:#a9b8af;font-size:9px;">—</span>'}</td>
        <td class="num" style="font-weight:700;color:#17221c;">${item.quantity}</td>
      </tr>`;
    })
    .join('');

  return `<div class="sheet">
    <header class="ps-header">
      <div class="brand-block">
        <div class="brand-logo">H</div>
        <div>
          <div class="brand-name">${escapeHtml(company.brand)}</div>
          <div class="brand-tagline">${escapeHtml(company.tagline)}</div>
        </div>
      </div>
      <div class="ps-head-right">
        <div class="ps-title">Packing Slip</div>
        <div class="ps-date">${formatDate(new Date().toISOString())}</div>
      </div>
    </header>

    <section class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Order Information</div>
        <div class="meta-grid-2">
          <div class="meta-line"><strong>Order ID</strong><br/>#${escapeHtml(data.orderId)}</div>
          <div class="meta-line"><strong>Order Date</strong><br/>${formatDate(data.orderDate)}</div>
          <div class="meta-line"><strong>Status</strong><br/>${escapeHtml(data.orderStatus)}</div>
          <div class="meta-line"><strong>Payment</strong><br/>${escapeHtml(data.paymentMethod)} | ${escapeHtml(data.paymentStatus)}</div>
        </div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Courier</div>
        <div class="meta-line">
          <strong>${escapeHtml(data.courierName || 'Not Assigned')}</strong><br/>
          ${data.trackingNumber ? `Tracking: <strong>${escapeHtml(data.trackingNumber)}</strong>` : ''}
        </div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Ship To</div>
        <div class="meta-line">
          <strong>${escapeHtml(data.customerName || 'Valued Customer')}</strong><br/>
          ${escapeHtml(data.customerAddress || 'No address provided')}
        </div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Contact</div>
        <div class="meta-line">
          ${data.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(data.customerPhone)}<br/>` : ''}
          ${data.customerEmail ? `<strong>Email:</strong> ${escapeHtml(data.customerEmail)}` : ''}
        </div>
      </div>
    </section>

    <section class="items-section">
      <table class="items">
        <thead>
          <tr>
            <th class="col-img">Image</th>
            <th>Product & SKU</th>
            <th>Specifications</th>
            <th>Customer Note</th>
            <th class="num">Qty</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </section>

    <div class="totals keep">
      <div class="summary">
        <div class="summary-card">
          <div class="summary-head">Order Totals</div>
          <div class="srow"><span>Subtotal</span><span>${formatMoney(data.subtotal)}</span></div>
          <div class="srow"><span>Delivery Charge</span><span>${data.deliveryCharge > 0 ? formatMoney(data.deliveryCharge) : '<em class="free">Free</em>'}</span></div>
          ${data.discount > 0 ? `<div class="srow neg"><span>Discount${data.couponCode ? ` <span class="coupon">(${escapeHtml(data.couponCode)})</span>` : ''}</span><span>−${formatMoney(data.discount)}</span></div>` : ''}
          <div class="srow grand"><span>Grand Total</span><span>${formatMoney(data.grandTotal)}</span></div>
        </div>
      </div>
    </div>

    ${data.internalNotes ? `<div class="notes-box keep">
      <div class="meta-label">Admin Note</div>
      <p>${escapeHtml(data.internalNotes)}</p>
    </div>` : ''}

    <div class="signatures keep">
      <div>
        <div class="sig-row"><span class="sig-label">Picked By</span><span class="sig-line" style="border-bottom:1px solid #cbd5e1;"></span></div>
        <div class="sig-row"><span class="sig-label">Checked By</span><span class="sig-line" style="border-bottom:1px solid #cbd5e1;"></span></div>
      </div>
    </div>

    <footer class="ps-footer keep">
      <p>
        ${escapeHtml(company.brand)} — ${escapeHtml(company.tagline)}<br/>
        ${escapeHtml(company.email)} | ${escapeHtml(company.website)}<br/>
        Pack with protective foam and heavy wrapping to prevent damage.
      </p>
    </footer>
  </div>`;
}

export async function buildPackingSlipDocument(data: PackingSlipData, supabase: any): Promise<string> {
  const body = await buildPackingSlipBody(data, supabase);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Packing Slip #${escapeHtml(data.orderId)}</title>
  <style>${buildPackingSlipStyles()}</style>
</head>
<body>${body}</body>
</html>`;
}
