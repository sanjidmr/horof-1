type ImageRow = { url?: string | null; sort_order?: number | null };

export function extractProductImages(images: ImageRow[] | null | undefined): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return [];
  return [...images]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i) => i.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}
