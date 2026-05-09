import type { DbOrderRow } from './types';

export function orderRowTotal(row: Pick<DbOrderRow, 'total' | 'total_price'>): number {
  const raw = row.total ?? row.total_price;
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  return Number.isFinite(n) ? Number(n) : 0;
}

export function shortenOrderId(id: string, max = 12): string {
  if (!id) return '';
  return id.length <= max ? id : `#${id.slice(0, 8)}…`;
}

export function parseProductImages(images: unknown): string[] {
  if (images == null) return [];
  if (Array.isArray(images)) {
    return images.filter((x): x is string => typeof x === 'string');
  }
  if (typeof images === 'string') {
    try {
      const p = JSON.parse(images) as unknown;
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string');
      return [images];
    } catch {
      return [images];
    }
  }
  return [];
}
