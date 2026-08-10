const STORAGE_PREFIX = 'horof_recent_products';
const MAX = 24;

export function getRecentProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX) ?? localStorage.getItem(STORAGE_PREFIX);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function appendRecentProductId(productId: string) {
  if (typeof window === 'undefined' || !productId) return;
  const prev = getRecentProductIds().filter(Boolean);
  const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX);
  const json = JSON.stringify(next);
  try {
    sessionStorage.setItem(STORAGE_PREFIX, json);
    localStorage.setItem(STORAGE_PREFIX, json);
  } catch {
    /* quota / privacy mode */
  }
}
