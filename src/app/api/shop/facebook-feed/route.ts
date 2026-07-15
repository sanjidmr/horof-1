import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new NextResponse('Not configured', { status: 500 });

  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, compare_price, images, sku, slug, categories(name)')
    .eq('is_active', true);

  if (!products) return new NextResponse('No products', { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';

  const items = products.map((p: any) => ({
    id: p.id,
    title: p.name,
    description: p.description || p.name,
    link: `${siteUrl}/product/${p.slug}`,
    image_link: p.images?.[0] || '',
    price: `${Number(p.price)} BDT`,
    sale_price: p.compare_price ? `${Number(p.compare_price)} BDT` : undefined,
    availability: 'in stock',
    brand: 'Horof',
    condition: 'new',
    sku: p.sku || p.id,
    google_product_category: (Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name) || 'Home & Garden',
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Horof Products Feed</title>
    <link>${siteUrl}</link>
    <description>Horof Facebook & Google Shopping Feed</description>
    ${items.map((item) => `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>
      <g:price>${escapeXml(item.price)}</g:price>
      ${item.sale_price ? `<g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>` : ''}
      <g:availability>${item.availability}</g:availability>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:condition>${item.condition}</g:condition>
      <g:sku>${escapeXml(item.sku)}</g:sku>
      <g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>
    </item>`).join('')}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
