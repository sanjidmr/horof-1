import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadInvoiceData, canManageInvoices } from '@/lib/invoice/loader';
import { buildInvoiceDocument } from '@/lib/invoice/template';
import { renderHtmlToPdf } from '@/lib/invoice/pdf';

export const runtime = 'nodejs';

function safeFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return clean.length > 0 ? clean : 'invoice';
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

  // Role-based access: order owner or admin/warehouse staff.
  const { data: order } = await supabase.from('orders').select('user_id').eq('id', id).single();
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const isManager = await canManageInvoices(supabase, user.id);
  const isOwner = Boolean(order.user_id) && String(order.user_id) === String(user.id);
  if (!isManager && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await loadInvoiceData(supabase, id);
  if (!data) {
    return NextResponse.json({ error: 'Invoice data could not be loaded' }, { status: 404 });
  }

  const html = await buildInvoiceDocument(data, { showInternalNotes: isManager });

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    console.error('[Invoice PDF] generation failed:', err);
    return NextResponse.json(
      { error: 'PDF generation failed. Make sure Chrome is installed or set CHROME_PATH.' },
      { status: 500 }
    );
  }

  const filename = `Invoice-${safeFilename(data.invoiceNumber)}.pdf`;
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
