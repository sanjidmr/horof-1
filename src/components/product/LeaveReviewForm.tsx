'use client';

import { useRef, useState, useTransition } from 'react';
import { CheckCircle, Loader2, Send, AlertCircle, X } from 'lucide-react';
import { submitReview } from '@/lib/actions/reviews';
import { StarRating } from './StarRating';

interface ReviewableOrder {
  orderId: string;
  orderNumber: string;
  alreadyReviewed: boolean;
}

interface LeaveReviewFormProps {
  productId: string;
  productName: string;
  slug: string;
  reviewableOrders?: ReviewableOrder[];
  onReviewSubmitted?: (review: any) => void;
  user?: any;
}

export function LeaveReviewForm({
  productId,
  productName,
  slug,
  reviewableOrders = [],
  onReviewSubmitted,
  user,
}: LeaveReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [guestName, setGuestName] = useState('');
  
  // Find pending orders for database reviews
  const pendingOrders = reviewableOrders.filter((o) => !o.alreadyReviewed);
  
  const [selectedOrder, setSelectedOrder] = useState<string>(
    pendingOrders[0]?.orderId ?? ''
  );
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // If logged in and has pending orders, this is a database review
  const isDbReviewEligible = user && pendingOrders.length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (rating === 0) {
      setErrorMsg('Please select a star rating before submitting.');
      return;
    }

    const fd = new FormData(formRef.current!);
    const title = (fd.get('title') as string)?.trim() || '';
    const body = (fd.get('body') as string)?.trim() || '';

    if (!body) {
      setErrorMsg('Please write some review text.');
      return;
    }

    if (!user && !guestName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    if (isDbReviewEligible) {
      // Authenticated database review flow
      fd.set('rating', String(rating));
      fd.set('slug', slug);
      fd.set('order_id', selectedOrder);

      startTransition(async () => {
        const result = await submitReview(fd);
        if (result.success) {
          setSuccessMsg('Your review has been submitted successfully! Thank you.');
          
          const newReview = {
            id: `db-local-${Date.now()}`,
            product_id: productId,
            customer_id: user.id,
            order_id: selectedOrder,
            rating: rating,
            title: title || null,
            body: body || null,
            is_approved: true,
            created_at: new Date().toISOString(),
            profiles: {
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Verified Customer',
              avatar_url: user.user_metadata?.avatar_url || null
            }
          };

          if (onReviewSubmitted) {
            onReviewSubmitted(newReview);
          }

          setRating(0);
          formRef.current?.reset();
        } else {
          setErrorMsg(result.error ?? 'Something went wrong.');
        }
      });
    } else {
      // Guest or local-only review flow
      const newReview = {
        id: `local-${Date.now()}`,
        product_id: productId,
        customer_id: user?.id || 'guest',
        order_id: 'local-order',
        rating: rating,
        title: title || null,
        body: body || null,
        is_approved: true,
        created_at: new Date().toISOString(),
        profiles: {
          full_name: user 
            ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer')
            : (guestName.trim() || 'Guest Customer'),
          avatar_url: user?.user_metadata?.avatar_url || null
        }
      };

      if (onReviewSubmitted) {
        onReviewSubmitted(newReview);
      }

      setSuccessMsg('Thank you! Your review has been added.');
      setRating(0);
      setGuestName('');
      formRef.current?.reset();
    }
  }

  return (
    <div className="review-form-card bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="review-form-icon bg-[#1B4332] p-2.5 rounded-xl">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Write a Review</h3>
          <p className="text-xs text-slate-500">for <span className="font-semibold">{productName}</span></p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-5 flex items-start gap-3 bg-[#D8F3DC] border border-[#95D5B2] rounded-xl px-4 py-3 animate-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-[#1B4332] mt-0.5 shrink-0" />
          <p className="text-sm text-[#1B4332] font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* Hidden fields */}
        <input type="hidden" name="product_id" value={productId} />

        {/* Guest Name input */}
        {!user && (
          <div className="review-field-group">
            <label htmlFor="guest-name" className="review-field-label text-xs font-bold text-slate-600 block mb-1">Your Name *</label>
            <input
              id="guest-name"
              required
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name..."
              className="review-input w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#2D6A4F]"
            />
          </div>
        )}

        {/* Order selector (if multiple eligible orders) */}
        {isDbReviewEligible && pendingOrders.length > 1 && (
          <div className="review-field-group">
            <label className="review-field-label text-xs font-bold text-slate-600 block mb-1">Select Order</label>
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="review-select w-full border border-slate-200 rounded-xl px-3 h-11 text-sm bg-white outline-none focus:border-[#2D6A4F]"
            >
              {pendingOrders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  Order #{o.orderNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Star Rating */}
        <div className="review-field-group">
          <label className="review-field-label text-xs font-bold text-slate-600 block mb-1">Your Rating *</label>
          <div className="flex items-center gap-3 mt-1">
            <StarRating value={rating} onChange={setRating} size="lg" showLabel />
          </div>
        </div>

        {/* Title */}
        <div className="review-field-group">
          <label htmlFor="review-title" className="review-field-label text-xs font-bold text-slate-600 block mb-1">Review Title</label>
          <input
            id="review-title"
            name="title"
            type="text"
            placeholder="Summarise your experience..."
            maxLength={120}
            className="review-input w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#2D6A4F]"
          />
        </div>

        {/* Body */}
        <div className="review-field-group">
          <label htmlFor="review-body" className="review-field-label text-xs font-bold text-slate-600 block mb-1">Your Review *</label>
          <textarea
            id="review-body"
            name="body"
            rows={4}
            placeholder="Share details about the product quality, shipping, and your overall experience..."
            maxLength={1000}
            className="review-textarea w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#2D6A4F]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="review-submit-btn w-full bg-[#1B4332] text-white h-12 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2D6A4F] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>
      </form>
    </div>
  );
}
