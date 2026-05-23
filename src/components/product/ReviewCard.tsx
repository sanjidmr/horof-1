'use client';

import { formatDistanceToNow } from 'date-fns';
import { StarDisplay } from './StarRating';
import { ReviewWithProfile } from '@/lib/actions/reviews';
import { BadgeCheck, User } from 'lucide-react';

export function ReviewCard({ review }: { review: ReviewWithProfile }) {
  const isVerified = true; // Based on our logic, all reviews are tied to a delivered order.

  return (
    <div className="review-card">
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
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <StarDisplay rating={review.rating} size="sm" />
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
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
    </div>
  );
}
