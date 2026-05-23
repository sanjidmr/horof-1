import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import Link from 'next/link';
import { orders as mockOrders } from '../../lib/mockData';

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    // Show mock orders if supabase is not configured
    return (
      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto space-y-8">
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold">Your Orders (Demo)</h1>
            <p className="text-text-secondary text-sm italic">Showing demo orders since Supabase is not configured.</p>
          </div>
          <Link href="/products" className="text-xs font-bold uppercase tracking-widest text-accent-primary hover:underline">
            Continue shopping
          </Link>
        </div>

        <div className="space-y-4">
          {mockOrders.map((o) => (
            <div key={o.id} className="bg-white border border-border-forest rounded-3xl p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Order</p>
                  <p className="font-mono text-xs">{o.id}</p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</p>
                  <p className="text-sm font-bold uppercase">{o.status}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-border-forest">
                <p className="text-sm text-text-secondary">
                  Items: <span className="font-bold text-text-primary">{o.items.length}</span>
                </p>
                <p className="text-lg font-display font-bold text-gold">৳{o.total.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/orders');
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_price, status, created_at, order_items(id, product_id, quantity, price, products(name, slug))')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold">Your Orders</h1>
          <p className="text-text-secondary text-sm">Signed in as <span className="font-bold">{user.email}</span></p>
        </div>
        <Link href="/products" className="text-xs font-bold uppercase tracking-widest text-accent-primary hover:underline">
          Continue shopping
        </Link>
      </div>

      {orders?.length ? (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-border-forest rounded-3xl p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Order</p>
                  <p className="font-mono text-xs">{o.id}</p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</p>
                  <p className="text-sm font-bold">{o.status}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-border-forest">
                <div className="space-y-1 text-sm text-text-secondary">
                  <p>Items: <span className="font-bold text-text-primary">{o.order_items?.length ?? 0}</span></p>
                  
                  {o.status === 'delivered' && o.order_items && o.order_items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {o.order_items.map((item: any) => (
                        <Link 
                          key={item.id} 
                          href={`/product/${item.products?.slug}#reviews`}
                          className="inline-flex items-center text-xs font-semibold text-[#2D6A4F] bg-[#D8F3DC] px-2 py-1 rounded-md hover:bg-[#B7E4C7] transition-colors"
                        >
                          Review {item.products?.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-lg font-display font-bold text-gold">৳{Number(o.total_price).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-forest rounded-3xl p-10 text-center space-y-4">
          <h2 className="text-2xl font-display font-bold">No orders yet</h2>
          <p className="text-text-secondary">When you checkout, your order history will appear here.</p>
          <Link href="/products" className="inline-block text-xs font-bold uppercase tracking-widest text-accent-primary hover:underline">
            Browse products
          </Link>
        </div>
      )}
    </div>
  );
}

