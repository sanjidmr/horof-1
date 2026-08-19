/**
 * QR code generation for the invoice tracking code.
 * Uses the `qrcode` package (pure JS, works in Node and browser).
 */
import QRCode from 'qrcode';

const QR_CACHE = new Map<string, string>();

/** Generate a data-URI PNG for the given text (cached per text). */
export async function generateQrDataUrl(text: string): Promise<string> {
  const cached = QR_CACHE.get(text);
  if (cached) return cached;

  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: {
      dark: '#10251c',
      light: '#ffffff',
    },
  });
  QR_CACHE.set(text, dataUrl);
  return dataUrl;
}

/** Build the order tracking URL used for the QR payload. */
export function buildTrackingUrl(trackPath: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://horofbd.com';
  return `${base}${trackPath}`;
}
