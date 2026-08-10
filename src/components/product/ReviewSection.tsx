import { getProductReviews, getReviewStats, getReviewableOrders } from '@/lib/actions/reviews';
import { LeaveReviewForm } from './LeaveReviewForm';
import { ReviewCard } from './ReviewCard';
import { StarDisplay } from './StarRating';

interface ReviewSectionProps {
  productId: string;
  productName: string;
  slug: string;
}

export async function ReviewSection({ productId, productName, slug }: ReviewSectionProps) {
  // Fetch data in parallel
  const [reviews, stats, reviewableOrders] = await Promise.all([
    getProductReviews(productId),
    getReviewStats(productId),
    getReviewableOrders(productId),
  ]);

  return (
    <div className="py-16 md:py-24 border-t border-slate-100" id="reviews">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Left Column: Stats & Leave Review */}
          <div className="lg:w-1/3 flex flex-col gap-10">
            <div>
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-6">Customer Reviews</h2>
              
              <div className="flex items-end gap-4 mb-8">
                <div className="text-5xl font-display font-bold text-slate-900 leading-none">
                  {stats.average.toFixed(1)}
                </div>
                <div className="pb-1 space-y-1">
                  <StarDisplay rating={stats.average} size="md" />
                  <p className="text-sm text-slate-500 font-medium">
                    Based on {stats.total} review{stats.total === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star as 1|2|3|4|5] || 0;
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12 shrink-0">
                        <span className="text-sm font-bold text-slate-700">{star}</span>
                        <StarDisplay rating={1} size="sm" />
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#F59E0B] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Review Form (only shows if eligible) */}
            <LeaveReviewForm 
              productId={productId} 
              productName={productName} 
              slug={slug} 
              reviewableOrders={reviewableOrders} 
            />
          </div>

          {/* Right Column: Review List */}
          <div className="lg:w-2/3">
            {reviews.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <StarDisplay rating={0} size="md" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No reviews yet</h3>
                <p className="text-slate-500 max-w-sm">
                  Be the first to share your thoughts about this product after your purchase is delivered!
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
