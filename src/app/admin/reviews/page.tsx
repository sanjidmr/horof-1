'use client';

import { useState, useEffect, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Star, Check, X, Trash2, MessageSquare, Search, Star as StarIcon, User, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AdminReview {
  id: string;
  product_id: string;
  customer_id: string;
  order_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  variant_info: any;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  products: { id: string; name: string; slug: string } | null;
  orders: { id: string; order_number: string } | null;
}

type FilterStatus = 'all' | 'approved' | 'pending';

export default function AdminReviewsPage() {
  const supabase = createSupabaseBrowserClient();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isPending, startTransition] = useTransition();

  // Stats
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin') return;

      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, profiles(full_name, avatar_url), products(id, name, slug), orders(id, order_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allReviews = (data ?? []) as AdminReview[];
      setReviews(allReviews);
      setStats({
        total: allReviews.length,
        approved: allReviews.filter(r => r.is_approved).length,
        pending: allReviews.filter(r => !r.is_approved).length,
      });
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(reviewId: string) {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('product_reviews')
          .update({ is_approved: true })
          .eq('id', reviewId);

        if (error) throw error;

        toast.success('Review approved');
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r));
        setStats(prev => ({
          ...prev,
          approved: prev.approved + 1,
          pending: prev.pending - 1,
        }));
      } catch (err: any) {
        toast.error(err.message || 'Failed to approve review');
      }
    });
  }

  async function handleReject(reviewId: string) {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('product_reviews')
          .update({ is_approved: false })
          .eq('id', reviewId);

        if (error) throw error;

        toast.success('Review rejected');
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: false } : r));
        setStats(prev => ({
          ...prev,
          approved: prev.approved - 1,
          pending: prev.pending + 1,
        }));
      } catch (err: any) {
        toast.error(err.message || 'Failed to reject review');
      }
    });
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('product_reviews')
          .delete()
          .eq('id', reviewId);

        if (error) throw error;

        toast.success('Review deleted');
        const deleted = reviews.find(r => r.id === reviewId);
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        setStats(prev => ({
          total: prev.total - 1,
          approved: deleted?.is_approved ? prev.approved - 1 : prev.approved,
          pending: deleted?.is_approved ? prev.pending : prev.pending - 1,
        }));
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete review');
      }
    });
  }

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('product_reviews')
          .update({
            admin_reply: replyText.trim(),
            admin_reply_at: new Date().toISOString(),
          })
          .eq('id', reviewId);

        if (error) throw error;

        toast.success('Reply added');
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, admin_reply: replyText.trim(), admin_reply_at: new Date().toISOString() } : r));
        setReplyingTo(null);
        setReplyText('');
      } catch (err: any) {
        toast.error(err.message || 'Failed to add reply');
      }
    });
  }

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (filterStatus === 'approved' && !r.is_approved) return false;
    if (filterStatus === 'pending' && r.is_approved) return false;
    if (filterRating > 0 && r.rating !== filterRating) return false;
    if (filterProduct && r.product_id !== filterProduct) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = 
        r.title?.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q) ||
        r.profiles?.full_name?.toLowerCase().includes(q) ||
        r.products?.name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // Get unique products for filter
  const uniqueProducts = Array.from(new Set(reviews.map(r => r.product_id)))
    .map(id => ({ id, name: reviews.find(r => r.product_id === id)?.products?.name || 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer reviews and ratings</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Approved</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white outline-none focus:border-[#2D6A4F]"
            >
              <option value="all">All Reviews</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rating</label>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white outline-none focus:border-[#2D6A4F]"
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Product</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white outline-none focus:border-[#2D6A4F]"
            >
              <option value="">All Products</option>
              {uniqueProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews..."
                className="w-full h-10 pl-9 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-[#2D6A4F]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <StarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No reviews found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className={cn(
                "bg-white border rounded-2xl p-5 shadow-sm",
                review.is_approved ? "border-slate-200" : "border-amber-300 bg-amber-50/30"
              )}
            >
              {/* Review Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E5F5EC] flex items-center justify-center overflow-hidden shrink-0">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-[#40916C]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {review.profiles?.full_name || 'Anonymous'}
                      </span>
                      {review.is_approved ? (
                        <Badge className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full">Approved</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={cn("w-3 h-3", s <= review.rating ? "text-amber-500 fill-amber-500" : "text-slate-200")}
                          />
                        ))}
                      </div>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                      {review.products && (
                        <>
                          <span>·</span>
                          <a href={`/products/${review.products.id}`} className="text-[#2D6A4F] hover:underline font-medium">
                            {review.products.name}
                          </a>
                        </>
                      )}
                      {review.orders && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400">Order #{review.orders.order_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {!review.is_approved && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={isPending}
                      title="Approve"
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {review.is_approved && (
                    <button
                      onClick={() => handleReject(review.id)}
                      disabled={isPending}
                      title="Reject (Unapprove)"
                      className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === review.id ? null : review.id);
                      setReplyText(review.admin_reply || '');
                    }}
                    title="Reply"
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={isPending}
                    title="Delete"
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-2 ml-13">
                {review.title && (
                  <h4 className="font-bold text-slate-800">{review.title}</h4>
                )}
                {review.body && (
                  <p className="text-slate-600 text-sm leading-relaxed">{review.body}</p>
                )}
                {review.variant_info && (review.variant_info.size || review.variant_info.color) && (
                  <p className="text-xs text-slate-400">
                    Variant: {review.variant_info.size ? `Size: ${review.variant_info.size}` : ''}
                    {review.variant_info.size && review.variant_info.color ? ' · ' : ''}
                    {review.variant_info.color ? `Color: ${review.variant_info.color}` : ''}
                  </p>
                )}
              </div>

              {/* Admin Reply */}
              {review.admin_reply && replyingTo !== review.id && (
                <div className="mt-3 ml-13 pl-4 border-l-2 border-[#2D6A4F]/30 bg-[#E5F5EC]/30 rounded-r-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
                    <span className="text-xs font-bold text-[#2D6A4F] uppercase tracking-wider">Store Reply</span>
                    {review.admin_reply_at && (
                      <span className="text-[10px] text-slate-400">
                        · {formatDistanceToNow(new Date(review.admin_reply_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{review.admin_reply}</p>
                </div>
              )}

              {/* Reply Form */}
              {replyingTo === review.id && (
                <div className="mt-3 ml-13 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply to this review..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#2D6A4F]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReply(review.id)}
                      disabled={isPending}
                      className="bg-[#1B4332] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#2D6A4F] disabled:opacity-50"
                    >
                      {isPending ? 'Saving...' : 'Save Reply'}
                    </Button>
                    <Button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      variant="outline"
                      className="px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}