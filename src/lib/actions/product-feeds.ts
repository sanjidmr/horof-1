'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type FeedProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  sku: string | null;
  is_active: boolean;
  stock_quantity: number;
  brand: string | null;
  category: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  gtin: string | null;
  mpn: string | null;
};

export async function getFeedProducts(): Promise<FeedProduct[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, price, discount_price, sku, 
      is_active, stock_quantity, created_at, updated_at,
      brand:brands(name),
      category:categories(name),
      images:product_images(url, sort_order)
    `)
    .eq('is_active', true)
    .order('name');

  if (!products) return [];

  return products.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    discount_price: p.discount_price,
    sku: p.sku,
    is_active: p.is_active,
    stock_quantity: p.stock_quantity || 0,
    brand: p.brand?.name || null,
    category: p.category?.name || null,
    images: (p.images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((img: any) => img.url).filter(Boolean),
    created_at: p.created_at,
    updated_at: p.updated_at,
    gtin: null,
    mpn: null,
  }));
}

export async function generateGoogleMerchantFeed(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  const products = await getFeedProducts();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '<channel>\n';
  xml += `  <title>${siteUrl}</title>\n`;
  xml += `  <link>${siteUrl}</link>\n`;
  xml += `  <description>Premium handcrafted wood crafts and DIY supplies</description>\n`;

  for (const product of products) {
    if (!product.name || !product.price) continue;
    const images = product.images.length > 0 ? product.images : [`${siteUrl}/og-default.jpg`];
    const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';
    const salePrice = product.discount_price && product.discount_price < product.price;

    xml += '  <item>\n';
    xml += `    <g:id>${product.sku || product.id}</g:id>\n`;
    xml += `    <g:title><![CDATA[${product.name}]]></g:title>\n`;
    xml += `    <g:description><![CDATA[${(product.description || product.name).substring(0, 5000)}]]></g:description>\n`;
    xml += `    <g:link>${siteUrl}/product/${product.slug}</g:link>\n`;
    xml += `    <g:image_link>${images[0]}</g:image_link>\n`;
    for (let i = 1; i < Math.min(images.length, 10); i++) {
      xml += `    <g:additional_image_link>${images[i]}</g:additional_image_link>\n`;
    }
    xml += `    <g:price>${product.price} BDT</g:price>\n`;
    if (salePrice) {
      xml += `    <g:sale_price>${product.discount_price} BDT</g:sale_price>\n`;
    }
    xml += `    <g:availability>${availability}</g:availability>\n`;
    xml += `    <g:condition>new</g:condition>\n`;
    if (product.brand) xml += `    <g:brand><![CDATA[${product.brand}]]></g:brand>\n`;
    if (product.category) xml += `    <g:product_type><![CDATA[${product.category}]]></g:product_type>\n`;
    if (product.sku) xml += `    <g:gtin>${product.sku}</g:gtin>\n`;
    xml += '  </item>\n';
  }

  xml += '</channel>\n</rss>';
  return xml;
}

export async function generateFacebookCatalogFeed(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  const products = await getFeedProducts();

  const items = products.map(product => {
    const images = product.images.length > 0 ? product.images : [`${siteUrl}/og-default.jpg`];
    const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';
    
    return {
      id: product.sku || product.id,
      title: product.name,
      description: (product.description || product.name).substring(0, 5000),
      availability,
      condition: 'new',
      price: `${product.price} BDT`,
      link: `${siteUrl}/product/${product.slug}`,
      image_link: images[0],
      additional_image_link: images.slice(1, 10),
      brand: product.brand || '',
      product_type: product.category || '',
      ...(product.discount_price && product.discount_price < product.price
        ? { sale_price: `${product.discount_price} BDT` }
        : {}),
    };
  });

  return JSON.stringify({ data: items }, null, 2);
}

export async function generatePinterestFeed(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  const products = await getFeedProducts();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0" xmlns:p="http://pinterest.com/schemas/0.1/pinterest.xsd">\n';
  xml += '<channel>\n';
  xml += `  <title>${siteUrl} Products</title>\n`;
  xml += `  <link>${siteUrl}</link>\n`;
  xml += `  <description>Premium handcrafted wood crafts</description>\n`;

  for (const product of products) {
    if (!product.name || !product.price || product.images.length === 0) continue;
    
    xml += '  <item>\n';
    xml += `    <g:id>${product.sku || product.id}</g:id>\n`;
    xml += `    <g:title><![CDATA[${product.name}]]></g:title>\n`;
    xml += `    <g:description><![CDATA[${(product.description || product.name).substring(0, 500)}]]></g:description>\n`;
    xml += `    <g:link>${siteUrl}/product/${product.slug}</g:link>\n`;
    xml += `    <g:image_link>${product.images[0]}</g:image_link>\n`;
    xml += `    <g:price>${product.price} BDT</g:price>\n`;
    xml += `    <g:availability>${product.stock_quantity > 0 ? 'in stock' : 'out of stock'}</g:availability>\n`;
    xml += `    <g:condition>new</g:condition>\n`;
    if (product.brand) xml += `    <g:brand><![CDATA[${product.brand}]]></g:brand>\n`;
    xml += '  </item>\n';
  }

  xml += '</channel>\n</rss>';
  return xml;
}

export async function generateCSVFeed(): Promise<string> {
  const products = await getFeedProducts();
  const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type', 'sku'];
  
  let csv = headers.join(',') + '\n';
  
  for (const product of products) {
    const images = product.images;
    const row = [
      product.sku || product.id,
      `"${(product.name || '').replace(/"/g, '""')}"`,
      `"${(product.description || product.name || '').replace(/"/g, '""').substring(0, 5000)}"`,
      product.stock_quantity > 0 ? 'in stock' : 'out of stock',
      'new',
      product.price,
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com'}/product/${product.slug}`,
      images[0] || '',
      `"${(product.brand || '').replace(/"/g, '""')}"`,
      `"${(product.category || '').replace(/"/g, '""')}"`,
      product.sku || '',
    ];
    csv += row.join(',') + '\n';
  }
  
  return csv;
}
