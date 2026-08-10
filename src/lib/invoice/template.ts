/**
 * Premium invoice template — the single source of truth for the on-screen
 * invoice, the print system, and the server-side PDF generator.
 *
 * All colors are hex values so every renderer (screen, print, Chrome headless)
 * reproduces the design exactly.
 */
import type { InvoiceData } from './types';
import { escapeHtml, formatMoney, formatDate } from './format';
import { getCompanyInfo } from './company';
import { getSettingsCompanyInfo } from '@/lib/actions/app-settings';
import { generateQrDataUrl, buildTrackingUrl } from './qr';
import { code39Svg } from './barcode';

export type InvoiceRenderOptions = {
  showInternalNotes?: boolean;
};

function statusChipClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('delivered') || s.includes('completed') || s.includes('confirmed')) return 'chip-green';
  if (s.includes('cancel') || s.includes('return') || s.includes('refund') || s.includes('reject') || s.includes('fail')) return 'chip-red';
  if (s.includes('ship') || s.includes('transit') || s.includes('dispatch') || s.includes('packed') || s.includes('processing')) return 'chip-blue';
  return 'chip-gold';
}

function variantText(variant: Record<string, string>): string {
  const entries = Object.entries(variant).filter(([, v]) => v);
  if (!entries.length) return '';
  return entries.map(([k, v]) => `${k}: ${escapeHtml(v)}`).join(' · ');
}

function itemRow(item: InvoiceData['items'][number], idx: number): string {
  const variant = variantText(item.variant);
  return `
    <tr class="${idx % 2 === 1 ? 'alt' : ''}">
      <td class="col-img">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" width="46" height="46" />` : `<div class="img-ph">—</div>`}
      </td>
      <td class="col-name">
        <div class="pname">${escapeHtml(item.name)}</div>
        ${variant ? `<div class="pvariant">${variant}</div>` : ''}
        ${item.designCharge > 0 ? `<div class="pdesign">+ Design charge ${formatMoney(item.designCharge)}</div>` : ''}
      </td>
      <td class="col-sku">${item.sku ? `<span class="sku">${escapeHtml(item.sku)}</span>` : '—'}</td>
      <td class="col-cat">${item.category ? escapeHtml(item.category) : '—'}</td>
      <td class="col-var">${variant || '—'}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatMoney(item.unitPrice)}</td>
      <td class="num total">${formatMoney(item.lineTotal)}</td>
    </tr>`;
}

function summaryRows(data: InvoiceData): string {
  const p = data.pricing;
  const rows: string[] = [];
  rows.push(`<div class="srow"><span>Subtotal</span><span>${formatMoney(p.subtotal)}</span></div>`);
  rows.push(`<div class="srow"><span>Shipping Charge</span><span>${p.shipping > 0 ? formatMoney(p.shipping) : '<em class="free">Free</em>'}</span></div>`);
  if (p.discount > 0) {
    rows.push(`<div class="srow neg"><span>Discount</span><span>−${formatMoney(p.discount)}</span></div>`);
  }
  if (p.couponDiscount > 0) {
    rows.push(`<div class="srow neg"><span>Coupon Discount${p.couponCode ? ` <span class="coupon">(${escapeHtml(p.couponCode)})</span>` : ''}</span><span>−${formatMoney(p.couponDiscount)}</span></div>`);
  }
  rows.push(`<div class="srow grand"><span>Grand Total</span><span>${formatMoney(p.grandTotal)}</span></div>`);
  return rows.join('');
}

export function buildInvoiceStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #eef1ef; color: #17221c; line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: 210mm; min-height: 297mm; margin: 24px auto; padding: 15mm 15mm 12mm;
      background: #ffffff; box-shadow: 0 24px 70px rgba(16, 37, 28, 0.16);
      border-radius: 6px; overflow: hidden; position: relative;
    }
    @page { size: A4; margin: 0; }
    @media print {
      body { background: #ffffff !important; }
      .no-print { display: none !important; }
      .sheet { margin: 0; width: 210mm; min-height: 297mm; box-shadow: none; border-radius: 0; }
      .items thead { display: table-header-group; }
      .items tr, .items td, .items th { page-break-inside: avoid; }
      .keep { page-break-inside: avoid; }
    }

    /* ── Header ── */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .brand-block { display: flex; align-items: center; gap: 14px; }
    .brand-logo {
      width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #1a4731, #2d6a4f);
      display: flex; align-items: center; justify-content: center; color: #f6e5b8;
      font-weight: 900; font-size: 26px; letter-spacing: -1px; font-family: Georgia, 'Times New Roman', serif;
      box-shadow: 0 8px 20px rgba(26, 71, 49, 0.28);
    }
    .brand-name { font-size: 26px; font-weight: 900; color: #10251c; letter-spacing: 2px; line-height: 1.1; }
    .brand-tagline { font-size: 10px; color: #5d7366; margin-top: 3px; letter-spacing: 0.2px; max-width: 230px; }
    .inv-head-right { text-align: right; }
    .inv-title { font-size: 30px; font-weight: 800; color: #c9a962; letter-spacing: 7px; text-transform: uppercase; }
    .inv-number { font-size: 13px; font-weight: 700; color: #33443a; margin-top: 4px; letter-spacing: 0.5px; }
    .inv-statuses { margin-top: 10px; display: flex; justify-content: flex-end; gap: 6px; }
    .chip {
      display: inline-block; padding: 4px 11px; border-radius: 999px; font-size: 9.5px;
      font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: #fff;
    }
    .chip-green { background: #1a4731; }
    .chip-gold  { background: #b98a2e; }
    .chip-blue  { background: #2563a8; }
    .chip-red   { background: #b02a2a; }
    .gold-rule { height: 3px; border: none; border-radius: 99px; margin: 22px 0 18px; background: linear-gradient(90deg, #c9a962, #e9d8a6, #c9a962); }

    /* ── Meta grid ── */
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .meta-card {
      border: 1px solid #e7ece9; border-radius: 12px; padding: 12px 14px; background: #fafcfb;
    }
    .meta-label {
      font-size: 9px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
      color: #c9a962; margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1px solid #edf1ef;
    }
    .meta-line { font-size: 10.5px; color: #3c4b42; line-height: 1.5; }
    .meta-line strong { color: #17221c; font-weight: 700; }
    .meta-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }

    /* ── Payment strip ── */
    .pay-strip {
      margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px 28px;
      border: 1px solid #e7ece9; border-radius: 12px; padding: 10px 14px; background: #fafcfb;
    }
    .pay-item { font-size: 10px; color: #5d7366; }
    .pay-item b { color: #17221c; font-weight: 700; margin-right: 5px; }

    /* ── Items table ── */
    .items-section { margin-top: 16px; }
    .items { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .items thead th {
      background: #10251c; color: #ffffff; text-align: left; padding: 9px 10px;
      font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
    }
    .items thead th:first-child { border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
    .items thead th:last-child { border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
    .items thead th.num, .items td.num { text-align: right; }
    .items tbody td {
      padding: 10px; border-bottom: 1px solid #eff3f1; vertical-align: middle;
    }
    .items tbody tr.alt td { background: #f7faf8; }
    .items tbody tr:hover td { background: #f0f6f2; }
    .items td { color: #33443a; }
    .items .col-img { width: 54px; text-align: center; }
    .items .col-img img { width: 44px; height: 44px; border-radius: 9px; object-fit: cover; border: 1px solid #e7ece9; }
    .img-ph {
      width: 44px; height: 44px; border-radius: 9px; background: #edf1ef; color: #a9b8af;
      display: inline-flex; align-items: center; justify-content: center; font-size: 10px;
    }
    .items .pname { font-weight: 700; color: #17221c; font-size: 11px; }
    .items .pvariant { font-size: 9.5px; color: #5d7366; margin-top: 3px; }
    .items .pdesign { font-size: 9px; color: #1a7f46; font-weight: 700; margin-top: 3px; }
    .items .sku { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 9.5px; color: #5d7366; background: #edf1ef; padding: 2px 6px; border-radius: 6px; }
    .items td.total { font-weight: 800; color: #10251c; }
    .items td.num { font-variant-numeric: tabular-nums; }

    /* ── Bottom: notes/QR + summary ── */
    .bottom { display: flex; justify-content: space-between; align-items: stretch; gap: 20px; margin-top: 18px; }
    .notes-qr { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; min-width: 0; }
    .notes-box {
      border: 1px dashed #d8e1dc; border-radius: 12px; padding: 12px 14px; background: #fbfdfc;
    }
    .notes-box .meta-label { border-bottom: none; margin-bottom: 4px; }
    .notes-box p { font-size: 10px; color: #4b5c53; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
    .qr-box { display: flex; align-items: center; gap: 14px; }
    .qr-box img { width: 74px; height: 74px; border-radius: 10px; border: 1px solid #e7ece9; }
    .qr-caption { font-size: 9.5px; color: #5d7366; line-height: 1.5; max-width: 210px; }
    .qr-caption b { color: #17221c; display: block; margin-bottom: 2px; }

    .summary { width: 245px; flex-shrink: 0; }
    .summary-card {
      border: 1px solid #e7ece9; border-radius: 14px; overflow: hidden; background: #fafcfb;
    }
    .summary-head {
      background: #10251c; color: #fff; padding: 10px 14px; font-size: 10px;
      font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px;
    }
    .srow { display: flex; justify-content: space-between; align-items: center; padding: 9px 14px; font-size: 11px; color: #3c4b42; border-top: 1px solid #eff3f1; }
    .srow .free { font-style: normal; color: #1a7f46; font-weight: 700; }
    .srow .coupon { font-size: 9px; color: #5d7366; font-weight: 600; }
    .srow.neg { color: #1a7f46; font-weight: 600; }
    .srow.grand {
      background: linear-gradient(135deg, #1a4731, #2d6a4f); color: #fff;
      font-size: 13px; font-weight: 900; padding: 12px 14px;
    }
    .srow.grand span:last-child { font-size: 15px; }

    /* ── Footer ── */
    .inv-footer { margin-top: 20px; border-top: 1px solid #e7ece9; padding-top: 14px; }
    .foot-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 18px; }
    .foot-col .f-title {
      font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px;
      color: #c9a962; margin-bottom: 5px;
    }
    .foot-col p { font-size: 9.5px; color: #55665c; line-height: 1.6; }
    .thankyou {
      text-align: center; font-family: Georgia, 'Times New Roman', serif; font-size: 15px;
      color: #1a4731; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 12px;
    }
    .barcode-row { display: flex; justify-content: center; margin-top: 12px; }
    .barcode-row svg { height: 46px; }
    .legal-note { text-align: center; font-size: 8.5px; color: #93a39a; margin-top: 10px; letter-spacing: 0.3px; }

    /* ── Screen responsiveness ── */
    @media screen and (max-width: 860px) {
      .sheet { width: 100%; min-height: auto; margin: 0; border-radius: 0; padding: 20px 14px; }
      .inv-header { flex-direction: column; gap: 16px; }
      .inv-head-right { text-align: left; }
      .inv-statuses { justify-content: flex-start; }
      .meta-grid, .foot-grid { grid-template-columns: 1fr; }
      .bottom { flex-direction: column; }
      .summary { width: 100%; }
      .items-section { overflow-x: auto; }
      .items { min-width: 640px; }
    }
  `;
}

export async function buildInvoiceBody(data: InvoiceData, opts: InvoiceRenderOptions = {}): Promise<string> {
  let company = getCompanyInfo();
  try {
    company = await getSettingsCompanyInfo();
  } catch {
    // fall back to static company info
  }
  const p = data.pricing;
  const qrDataUrl = await generateQrDataUrl(buildTrackingUrl(data.trackingUrl));

  const itemsRows = data.items.map((item, idx) => itemRow(item, idx)).join('');

  const orderMetaLines: Array<[string, string]> = [
    ['Invoice No.', data.invoiceNumber],
    ['Order ID', `#${data.orderId}`],
    ['Invoice Date', formatDate(data.invoiceDate)],
    ['Order Date', formatDate(data.orderDate)],
    ['Payment Method', data.payment.method],
    ['Payment Status', data.payment.status],
  ];

  return `
    <div class="sheet">
      <header class="inv-header">
        <div class="brand-block">
          <div class="brand-logo">H</div>
          <div>
            <div class="brand-name">${escapeHtml(company.brand)}</div>
            <div class="brand-tagline">${escapeHtml(company.tagline)}</div>
          </div>
        </div>
        <div class="inv-head-right">
          <div class="inv-title">Invoice</div>
          <div class="inv-number">${escapeHtml(data.invoiceNumber)}</div>
          <div class="inv-statuses">
            <span class="chip ${statusChipClass(data.statuses.orderStatus)}">${escapeHtml(data.statuses.orderStatus)}</span>
            <span class="chip ${statusChipClass(data.statuses.paymentStatus)}">${escapeHtml(data.statuses.paymentStatus)}</span>
          </div>
        </div>
      </header>
      <div class="gold-rule"></div>

      <section class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Billed To</div>
          <div class="meta-line">
            <strong>${escapeHtml(data.customer.name)}</strong><br/>
            ${data.customer.email ? `${escapeHtml(data.customer.email)}<br/>` : ''}
            ${data.customer.phone ? escapeHtml(data.customer.phone) : ''}
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Shipping Address</div>
          <div class="meta-line">
            <strong>${escapeHtml(data.shipping.name)}</strong><br/>
            ${data.shipping.address ? escapeHtml(data.shipping.address) : 'No shipping address provided'}
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Order Details</div>
          <div class="meta-grid-2">
            ${orderMetaLines.map(([k, v]) => `<div class="meta-line"><strong>${escapeHtml(k)}</strong><br/>${escapeHtml(v)}</div>`).join('')}
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Company</div>
          <div class="meta-line">
            <strong>${escapeHtml(company.brand)}</strong> — ${escapeHtml(company.tagline)}<br/>
            ${escapeHtml(company.city)}<br/>
            ${escapeHtml(company.website)}<br/>
            ${escapeHtml(company.email)}<br/>
            ${escapeHtml(company.phone)}
          </div>
        </div>
      </section>

      <section class="pay-strip">
        ${data.payment.transactionId ? `<div class="pay-item"><b>Transaction ID:</b>${escapeHtml(data.payment.transactionId)}</div>` : ''}
        ${data.fulfillment.courier ? `<div class="pay-item"><b>Courier:</b>${escapeHtml(data.fulfillment.courier)}</div>` : ''}
        ${data.fulfillment.tracking ? `<div class="pay-item"><b>Tracking:</b>${escapeHtml(data.fulfillment.tracking)}</div>` : ''}
        ${data.fulfillment.estimatedDelivery ? `<div class="pay-item"><b>Est. Delivery:</b>${formatDate(data.fulfillment.estimatedDelivery)}</div>` : ''}
        ${!data.payment.transactionId && !data.fulfillment.courier && !data.fulfillment.tracking && !data.fulfillment.estimatedDelivery ? '<div class="pay-item">Cash on Delivery — pay when you receive your order.</div>' : ''}
      </section>

      <section class="items-section">
        <table class="items">
          <thead>
            <tr>
              <th class="col-img">Image</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Variant</th>
              <th class="num">Qty</th>
              <th class="num">Unit Price</th>
              <th class="num">Line Total</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </section>

      <section class="bottom keep">
        <div class="notes-qr">
          <div class="notes-box">
            <div class="meta-label">Notes</div>
            <p>${data.notes.customer ? escapeHtml(data.notes.customer) : 'No special notes for this order.'}</p>
          </div>
          ${opts.showInternalNotes && data.notes.internal ? `
          <div class="notes-box">
            <div class="meta-label">Internal Notes</div>
            <p>${escapeHtml(data.notes.internal)}</p>
          </div>` : ''}
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="QR code" />
            <div class="qr-caption"><b>Track your order</b>Scan this QR code to follow your order in real time.</div>
          </div>
        </div>
        <div class="summary">
          <div class="summary-card">
            <div class="summary-head">Payment Summary</div>
            ${summaryRows(data)}
          </div>
        </div>
      </section>

      <footer class="inv-footer keep">
        <div class="thankyou">Thank you for choosing ${escapeHtml(company.brand)} — crafted with care, delivered with pride.</div>
        <div class="foot-grid">
          <div class="foot-col">
            <div class="f-title">Return Policy</div>
            <p>${escapeHtml(company.returnPolicy)}</p>
          </div>
          <div class="foot-col">
            <div class="f-title">Customer Support</div>
            <p>For any questions about your order, reach us during ${escapeHtml(company.supportHours)}.</p>
          </div>
          <div class="foot-col">
            <div class="f-title">Contact</div>
            <p>
              ${escapeHtml(company.brand)} — ${escapeHtml(company.city)}<br/>
              Web: ${escapeHtml(company.website)}<br/>
              Email: ${escapeHtml(company.email)}<br/>
              Phone: ${escapeHtml(company.phone)}
            </p>
          </div>
        </div>
        <div class="barcode-row">${code39Svg(data.invoiceNumber)}</div>
        <div class="legal-note">This is a computer-generated invoice. No physical signature is required.</div>
      </footer>
    </div>`;
}

export async function buildInvoiceDocument(data: InvoiceData, opts: InvoiceRenderOptions = {}): Promise<string> {
  const body = await buildInvoiceBody(data, opts);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(data.invoiceNumber)} — ${escapeHtml(data.customer.name)}</title>
  <style>${buildInvoiceStyles()}</style>
</head>
<body>${body}</body>
</html>`;
}
