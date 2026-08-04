'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { StarDisplay } from './StarRating';
import { ReviewWithProfile } from '@/lib/actions/reviews';
import { BadgeCheck, User, MessageSquare } from 'lucide-react';

export function ReviewCard({ review }: { review: ReviewWithProfile }) {
  // All reviews are tied to a delivered order, so they are verified purchases
  const isVerified = !!review.order_id;

  // Format variant info for display
  const variantParts: string[] = [];
  if (review.variant_info) {
    if (review.variant_info.size) variantParts.push(`Size: ${review.variant_info.size}`);
    if (review.variant_info.color) variantParts.push(`Color: ${review.variant_info.color}`);
  }
  const variantText = variantParts.join(' · ');

  return (
    <div className="review-card bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E5F5EC] border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {review.profiles?.avatar_url ? (
              <img
                src={review.profiles.avatar_url}
                alt={review.profiles.full_name || 'Customer'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-[#40916C]" />
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {review.profiles?.full_name || 'Verified Customer'}
              </span>
              {isVerified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#2D6A4F] bg-[#D8F3DC] px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <StarDisplay rating={review.rating} size="sm" />
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span title={format(new Date(review.created_at), 'PPP')}>
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
              {variantText && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-slate-400">{variantText}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {review.title && (
          <h4 className="font-bold text-slate-800 text-lg">{review.title}</h4>
        )}
        {review.body && (
          <p className="text-slate-600 leading-relaxed text-sm md:text-base">{review.body}</p>
        )}
      </div>

      {/* Admin Reply */}
      {review.admin_reply && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-[#2D6A4F]/30 bg-[#E5F5EC]/30 rounded-r-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
            <span className="text-xs font-bold text-[#2D6A4F] uppercase tracking-wider">Store Reply</span>
            {review.admin_reply_at && (
              <span className="text-[10px] text-slate-400">
                · {formatDistanceToNow(new Date(review.admin_reply_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{review.admin_reply}</p>
        </div>
      )}
    </div>
  );
}