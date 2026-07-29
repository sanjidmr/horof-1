import type { OrderWithItems } from './types';
import { normalizeOrderStatus } from './types';
import { orderRowTotal } from './orderHelpers';
import { extractProductImages } from '../store/extract-images';

const bd = '০১২৩৪৫৬৭৮৯';
function toEng(n: number) {
  return n.toLocaleString('bn-BD').replace(/[০-৯]/g, d => String(bd.indexOf(d)));
}
function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildInvoiceHtml(order: OrderWithItems, brand = 'Horof') {
  const status = normalizeOrderStatus(order.status);
  const rows = (order.items ?? [])
    .map((li) => {
      const name = escapeHtml(li.product?.name ?? 'Item');
      const imgs = extractProductImages(li.product?.product_images);
      const qty = li.quantity;
      const unitRaw = typeof li.price === 'string' ? parseFloat(li.price) : Number(li.price);
      const unit = Number.isFinite(unitRaw) ? unitRaw : 0;
      const line = unit * qty;
      return `<tr>
        <td style="padding:10px;border-bottom:1px solid #e5ebe6;">
          ${imgs[0] ? `<img src="${escapeHtml(imgs[0])}" alt="" width="48" height="48" style="border-radius:8px;object-fit:cover;" />` : ''}
        </td>
        <td style="padding:10px;border-bottom:1px solid #e5ebe6;font-weight:600;color:#1A3320;">${name}</td>
        <td style="padding:10px;border-bottom:1px solid #e5ebe6;">${qty}</td>
        <td style="padding:10px;border-bottom:1px solid #e5ebe6;">৳${toEng(line)}</td>
      </tr>`;
    })
    .join('');

  const total = orderRowTotal(order);

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(order.id)}</title></head>
<body style="margin:0;padding:40px;background:#fafcf9;font-family:system-ui,sans-serif;color:#1A3320;">
  <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d7e6db;border-radius:24px;padding:32px;">
    <h1 style="font-family:Georgia, serif;margin-top:0;">${escapeHtml(brand)} Invoice</h1>
    <p style="margin:6px 0;color:#547456;"><strong>Order</strong> ${escapeHtml(order.id)}</p>
    <p style="margin:6px 0;color:#547456;"><strong>Status</strong> ${escapeHtml(status)}</p>
    <p style="margin:6px 0;color:#547456;"><strong>Date</strong> ${escapeHtml(new Date(order.created_at).toLocaleString())}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <thead><tr>
        <th align="left" style="padding:10px;border-bottom:2px solid #1A3320;">Image</th>
        <th align="left" style="padding:10px;border-bottom:2px solid #1A3320;">Item</th>
        <th align="left" style="padding:10px;border-bottom:2px solid #1A3320;">Qty</th>
        <th align="left" style="padding:10px;border-bottom:2px solid #1A3320;">Line</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:24px;font-size:22px;font-weight:800;color:#c9a962;">Total: ৳${toEng(total)}</p>
    <p style="margin-top:18px;color:#547456;font-size:12px;">Thank you for supporting handcrafted decor.</p>
  </div>
</body></html>`;
}

export function downloadInvoiceFile(order: OrderWithItems, filenamePrefix = 'invoice') {
  const html = buildInvoiceHtml(order);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${order.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
