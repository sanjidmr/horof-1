import { generateCSVFeed } from '@/lib/actions/product-feeds';

export async function GET() {
  try {
    const csv = await generateCSVFeed();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="product-feed.csv"',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    return new Response('Error generating feed', { status: 500 });
  }
}
