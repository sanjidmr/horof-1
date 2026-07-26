import { generatePinterestFeed } from '@/lib/actions/product-feeds';

export async function GET() {
  try {
    const xml = await generatePinterestFeed();
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    return new Response('Error generating feed', { status: 500 });
  }
}
