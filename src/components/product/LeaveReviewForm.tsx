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
  reviewableOrders: ReviewableOrder[];
}

export function LeaveReviewForm({
  productId,
  productName,
  slug,
  reviewableOrders,
}: LeaveReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<string>(
    reviewableOrders.find((o) => !o.alreadyReviewed)?.orderId ?? ''
  );
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const pendingOrders = reviewableOrders.filter((o) => !o.alreadyReviewed);

  if (reviewableOrders.length === 0) return null;
  if (pendingOrders.length === 0) {
    return (
      <div className="review-form-card flex items-center gap-3 text-[#2D6A4F]">
        <CheckCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">You&apos;ve already reviewed this product. Thank you!</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (rating === 0) {
      setErrorMsg('Please select a star rating before submitting.');
      return;
    }

    const fd = new FormData(formRef.current!);
    fd.set('rating', String(rating));
    fd.set('slug', slug);

    startTransition(async () => {
      const result = await submitReview(fd);
      if (result.success) {
        setSuccessMsg('Your review has been submitted successfully! Thank you.');
        setRating(0);
        formRef.current?.reset();
      } else {
        setErrorMsg(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <div className="review-form-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="review-form-icon">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Write a Review</h3>
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
        <input type="hidden" name="order_id"   value={selectedOrder} />

        {/* Order selector (if multiple eligible orders) */}
        {pendingOrders.length > 1 && (
          <div className="review-field-group">
            <label className="review-field-label">Select Order</label>
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="review-select"
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
          <label className="review-field-label">Your Rating *</label>
          <div className="flex items-center gap-3 mt-1">
            <StarRating value={rating} onChange={setRating} size="lg" showLabel />
          </div>
        </div>

        {/* Title */}
        <div className="review-field-group">
          <label htmlFor="review-title" className="review-field-label">Review Title</label>
          <input
            id="review-title"
            name="title"
            type="text"
            placeholder="Summarise your experience..."
            maxLength={120}
            className="review-input"
          />
        </div>

        {/* Body */}
        <div className="review-field-group">
          <label htmlFor="review-body" className="review-field-label">Your Review</label>
          <textarea
            id="review-body"
            name="body"
            rows={4}
            placeholder="Share details about the product quality, shipping, and your overall experience..."
            maxLength={1000}
            className="review-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="review-submit-btn"
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
