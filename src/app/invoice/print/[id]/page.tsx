import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadInvoiceData, canManageInvoices } from '@/lib/invoice/loader';
import { buildInvoiceBody, buildInvoiceStyles } from '@/lib/invoice/template';
import { InvoiceToolbar } from '@/components/invoice/InvoiceToolbar';
import { PrintOnMount } from '@/components/invoice/PrintOnMount';

export const dynamic = 'force-dynamic';

/**
 * Dedicated print route (top-level, outside the admin layout) so the invoice
 * prints as a clean full-bleed A4 document with zero app chrome.
 */
export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order } = await supabase.from('orders').select('user_id').eq('id', id).single();
  if (!order) notFound();

  const isManager = user ? await canManageInvoices(supabase, user.id) : false;
  const isOwner = Boolean(order.user_id && user && String(order.user_id) === String(user.id));
  const isPublicGuest = !order.user_id;

  if (!user) {
    if (!isPublicGuest) redirect(`/login?next=${encodeURIComponent(`/invoice/print/${id}`)}`);
  } else if (!isManager && !isOwner && !isPublicGuest) {
    notFound();
  }

  const data = await loadInvoiceData(supabase, id);
  if (!data) notFound();

  const styles = buildInvoiceStyles();
  const body = await buildInvoiceBody(data, { showInternalNotes: isManager });

  return (
    <div className="min-h-screen bg-[#eef1ef]">
      <PrintOnMount />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-5">
        <InvoiceToolbar
          orderId={id}
          backHref={isManager ? `/admin/orders/${id}` : '/orders'}
          backLabel={isManager ? 'Back to Order' : 'Back to Orders'}
          trackHref={`/track-order?order=${data.orderNumber}`}
          canDownload={Boolean(user && (isManager || isOwner))}
          downloadLabel="Download PDF"
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-[calc(100vh-140px)] flex flex-col">
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </div>
  );
}
