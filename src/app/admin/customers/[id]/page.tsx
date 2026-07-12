import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { formatPrice } from '@/lib/utils';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  User, 
  Shield, 
  ShieldAlert, 
  Info,
  Clock,
  Eye
} from 'lucide-react';

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) {
    notFound();
  }

  // Fetch orders and order requests in parallel
  const [ordersRes, requestsRes, addressesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_price, status, payment_status, payment_method, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('order_requests')
      .select('id, product_name, final_total_price, status, created_at, customer_info, quantity')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('addresses')
      .select('*')
      .or(`user_id.eq.${id},customer_id.eq.${id}`)
  ]);

  const confirmedOrders = (ordersRes.data || []).map(o => ({ ...o, is_request: false, amount: Number(o.total_price || 0) }));
  const orderRequests = (requestsRes.data || []).map(r => ({
    id: r.id,
    is_request: true,
    amount: Number(r.final_total_price || 0),
    total_price: r.final_total_price,
    status: r.status === 'pending' ? 'pending_approval' : r.status,
    payment_status: 'pending',
    payment_method: r.customer_info?.payment_method || 'cod',
    created_at: r.created_at,
    product_name: r.product_name,
    customer_info: r.customer_info
  }));

  // Merged & sorted combined order history
  const orders = [...confirmedOrders, ...orderRequests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const addresses = addressesRes.data || [];

  // Calculations — exclude cancelled/rejected from spend
  const totalOrders = orders.length;
  const nonCancelledOrders = orders.filter(o => !['cancelled', 'rejected'].includes(o.status));
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const avgOrderValue = nonCancelledOrders.length > 0 ? (totalSpent / nonCancelledOrders.length) : 0;

  // Status styling helpers
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-[#E6F0EB] text-[#1B4332] border-[#CDE0D6] hover:bg-[#E6F0EB] font-bold capitalize">Delivered</Badge>;
      case 'shipped':
        return <Badge className="bg-[#EAF2FF] text-[#0A58CA] border-[#CFE2FF] hover:bg-[#EAF2FF] font-bold capitalize">Shipped</Badge>;
      case 'processing':
        return <Badge className="bg-[#FFF3CD] text-[#664D03] border-[#FFE69C] hover:bg-[#FFF3CD] font-bold capitalize">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-[#F8F9FA] text-[#212529] border-[#DEE2E6] hover:bg-[#F8F9FA] font-bold capitalize">Pending</Badge>;
      case 'pending_approval':
        return <Badge className="bg-[#FFF3CD] text-[#664D03] border-[#FFE69C] hover:bg-[#FFF3CD] font-bold">Pending Approval</Badge>;
      case 'cancelled':
        return <Badge className="bg-[#F8D7DA] text-[#842029] border-[#F5C2C7] hover:bg-[#F8D7DA] font-bold capitalize">Cancelled</Badge>;
      case 'rejected':
        return <Badge className="bg-[#F8D7DA] text-[#842029] border-[#F5C2C7] hover:bg-[#F8D7DA] font-bold">Request Rejected</Badge>;
      case 'returned':
        return <Badge className="bg-[#E2D9F3] text-[#4A1D96] border-[#D1C2EB] hover:bg-[#E2D9F3] font-bold capitalize">Returned</Badge>;
      default:
        return <Badge className="capitalize font-bold">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-[#E6F0EB] text-[#1B4332] hover:bg-[#E6F0EB] capitalize font-semibold border-none">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-[#FFF3CD] text-[#664D03] hover:bg-[#FFF3CD] capitalize font-semibold border-none">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-[#F8D7DA] text-[#842029] hover:bg-[#F8D7DA] capitalize font-semibold border-none">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-[#E2D9F3] text-[#4A1D96] hover:bg-[#E2D9F3] capitalize font-semibold border-none">Refunded</Badge>;
      default:
        return <Badge className="capitalize font-semibold border-none">{status || 'Pending'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Details</h1>
          <p className="text-sm text-slate-500">View customer profile, contact information, and order history.</p>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6 flex-wrap md:flex-nowrap">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center font-bold text-2xl md:text-3xl shadow-inner border border-slate-50 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || 'Unnamed User'}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F0EB] text-[#1B4332] text-xs font-bold capitalize">
                    <Shield className="h-3 w-3" /> {profile.role}
                  </span>
                  {profile.is_blocked || profile.is_banned ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F8D7DA] text-[#842029] text-xs font-bold">
                      <ShieldAlert className="h-3 w-3" /> Banned / Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      Active Account
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile.email}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <ShoppingBag className="h-4 w-4 text-[#2D6A4F]" /> Total Orders
              </div>
              <p className="text-xl font-bold text-slate-900">{totalOrders}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <DollarSign className="h-4 w-4 text-[#2D6A4F]" /> Lifetime Spend
              </div>
              <p className="text-xl font-bold text-[#1B4332]">{formatPrice(totalSpent)}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <TrendingUp className="h-4 w-4 text-[#2D6A4F]" /> Avg. Order Value
              </div>
              <p className="text-xl font-bold text-slate-900">{formatPrice(avgOrderValue)}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar className="h-4 w-4 text-[#2D6A4F]" /> Customer Since
              </div>
              <p className="text-base font-bold text-slate-900">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (Profile details & Addresses) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Detailed Info Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#2D6A4F]" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                <p className="text-sm font-medium text-slate-900">{profile.full_name || 'Not provided'}</p>
              </div>
              {profile.first_name || profile.last_name ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">First Name</span>
                    <p className="text-sm font-medium text-slate-900">{profile.first_name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Name</span>
                    <p className="text-sm font-medium text-slate-900">{profile.last_name || '—'}</p>
                  </div>
                </div>
              ) : null}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                <p className="text-sm font-medium text-slate-900">{profile.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {profile.phone || 'Not provided'}
                </p>
              </div>
              {profile.address && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Address</span>
                  <p className="text-sm font-medium text-slate-900 flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{profile.address}</span>
                  </p>
                </div>
              )}
              {profile.notes && (
                <div className="space-y-1 p-3 rounded-lg bg-yellow-50/50 border border-yellow-100/50 text-slate-700">
                  <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3" /> Admin Notes
                  </span>
                  <p className="text-xs font-medium mt-1 leading-relaxed">{profile.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Addresses Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#2D6A4F]" /> Shipping Addresses
              </CardTitle>
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-bold border-none">
                {addresses.length} Saved
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  No shipping addresses saved.
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="p-4 rounded-xl border border-slate-100 hover:border-[#CDE0D6] hover:bg-slate-50/50 transition-all space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">{addr.name || 'Unnamed Address'}</p>
                      {addr.is_default && (
                        <span className="px-2 py-0.5 bg-[#E6F0EB] text-[#1B4332] rounded text-[10px] font-bold border border-[#CDE0D6]">
                          Default
                        </span>
                      )}
                    </div>
                    {addr.phone && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {addr.phone}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {addr.address}{addr.city ? `, ${addr.city}` : ''}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column (Orders list) */}
        <div className="lg:col-span-8">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden h-full">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#2D6A4F]" /> Order History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingBag className="h-16 w-16 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No orders placed yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Orders placed by this customer will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((order) => {
                        const orderNum = `#${String(order.id).slice(0, 8).toUpperCase()}`;
                        const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';
                        const viewHref = order.is_request
                          ? `/admin/order-requests`
                          : `/admin/orders/${order.id}`;
                        return (
                          <tr key={`${order.is_request ? 'req' : 'ord'}-${order.id}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-mono text-xs font-bold text-slate-900">{orderNum}</div>
                              {order.is_request && (
                                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Order Request</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                              {dateStr}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                              {formatPrice(Number(order.amount || order.total_price || 0))}
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(order.status || 'pending')}
                            </td>
                            <td className="px-6 py-4 space-y-0.5">
                              {getPaymentStatusBadge(order.payment_status || 'pending')}
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                {order.payment_method || 'cod'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={viewHref}>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold hover:bg-[#E6F0EB] hover:text-[#1B4332] hover:border-[#CDE0D6] transition-all">
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
