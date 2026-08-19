import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPackingSlipData } from '@/lib/packing-slip/loader';
import { buildPackingSlipDocument } from '@/lib/packing-slip/template';
import { renderHtmlToPdf } from '@/lib/invoice/pdf';
import { canManageInvoices } from '@/lib/invoice/loader';

export const runtime = 'nodejs';

function safeFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return clean.length > 0 ? clean : 'packing-slip';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role-based access: admin/warehouse staff only.
  const isManager = await canManageInvoices(supabase, user.id);
  if (!isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await loadPackingSlipData(supabase, id);
  if (!data) {
    return NextResponse.json({ error: 'Packing slip data could not be loaded' }, { status: 404 });
  }

  const html = await buildPackingSlipDocument(data, supabase);

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    console.error('[Packing Slip PDF] generation failed:', err);
    return NextResponse.json(
      { error: 'PDF generation failed. Make sure Chrome is installed or set CHROME_PATH.' },
      { status: 500 }
    );
  }

  const filename = `Packing-Slip-${safeFilename(data.orderNumber)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}