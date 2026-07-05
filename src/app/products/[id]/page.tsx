'use client';

import React, { useState, use, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { formatPrice } from '../../../lib/utils';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useWishlist } from '../../../context/WishlistContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Star,
  ShoppingCart,
  Heart,
  ShieldCheck,
  Truck,
  ChevronRight,
  Minus,
  Plus,
  Zap,
  Check,
  AlertCircle,
  Upload,
  Globe,
  Boxes,
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  User,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { saveCheckoutItems } from '../../../lib/checkoutStorage';

import { ProductCard } from '../../../components/product/ProductCard';
import { appendRecentProductId } from '../../../lib/recentlyViewed';
import { Product } from '../../../lib/types';
import { useRequireAuth } from '../../../context/AuthModalContext';
import { StarDisplay } from '../../../components/product/StarRating';
import { ReviewCard } from '../../../components/product/ReviewCard';
import { LeaveReviewForm } from '../../../components/product/LeaveReviewForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const supabase = createSupabaseBrowserClient();

  const [product, setProduct] = useState<any | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Gallery zoom magnifier state
  const [zoomOrigin, setZoomOrigin] = useState('center');
  const [isZoomed, setIsZoomed] = useState(false);

  // Dynamic specs and design add-on state
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [isDesignChargeAdded, setIsDesignChargeAdded] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Product variants state
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
  });
  const [reviewableOrders, setReviewableOrders] = useState<any[]>([]);

  // Customer Contact Info modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');


  // Flash sale countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Load product, variants, and reviews
  useEffect(() => {
    async function fetchProductData() {
      if (!id) return;
      setLoading(true);

      const [productRes, reviewsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(name, slug), brands(name, logo_url), product_variants(*)')
          .eq('id', id)
          .eq('is_active', true)
          .single(),
        supabase
          .from('product_reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('product_id', id)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
      ]);

      if (productRes.data && !productRes.error) {
        const data = productRes.data;
        
        // Reconcile flat DB fields into order_config structure
        const mappedProduct = {
          ...data,
          category: data.categories?.name || 'Uncategorized',
          brandName: data.brands?.name || null,
          brandLogo: data.brands?.logo_url || null,
          order_config: {
            quantity_discounts: data.quantity_discounts || [],
            specification_steps: data.specification_steps || [],
            design_charge: {
              enabled: !!data.design_charge_enabled,
              amount: Number(data.design_charge_amount || 0),
              description: data.design_charge_notes || ''
            },
            customer_notes_settings: {
              enabled: !!data.customer_notes_enabled,
              title: data.customer_notes_title || 'Specification Need Details',
              placeholder: data.custom_placeholder || ''
            },
            pricing_config: {
              min_order_qty: Number(data.min_order_qty || 1),
              max_order_qty: data.max_order_qty ? Number(data.max_order_qty) : null
            },
            order_request_settings: data.order_request_settings || {
              enable_order_requests: true,
              enable_add_to_cart: true,
              enable_direct_order: true,
              auto_approval: false
            },
            display_controls: data.display_controls || {
              show_discount_table: true,
              show_specifications: true,
              show_customer_notes: true,
              show_quantity_selector: true,
              show_design_charge: true,
              show_total_price: true,
              show_send_request: true,
              show_add_to_cart: true
            }
          }
        };

        setProduct(mappedProduct);
        appendRecentProductId(data.id);

        // Fetch variants
        const productVariants = data.product_variants || [];
        setVariants(productVariants);

        // Set default variant selections
        const uniqueSizes = Array.from(new Set(productVariants.map((v: any) => v.size).filter(Boolean))) as string[];
        const uniqueColors = Array.from(new Set(productVariants.map((v: any) => v.color).filter(Boolean))) as string[];
        
        if (uniqueSizes.length > 0) setSelectedSize(null);
        if (uniqueColors.length > 0) setSelectedColor(null);

        // Default design service check
        if (mappedProduct.order_config.design_charge?.enabled) {
          setIsDesignChargeAdded(true);
        }

        // Fetch related products
        const { data: relatedData } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('category_id', data.category_id)
          .neq('id', data.id)
          .eq('is_active', true)
          .limit(4);

        if (relatedData) {
          setRelatedProducts(relatedData.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            discountPrice: p.compare_price ? Number(p.compare_price) : undefined,
            images: p.images || [],
            category: p.categories?.name || 'Uncategorized',
            rating: 4.5,
            reviewCount: 12,
            stock: p.stock || 0,
            tags: [],
            isNew: !!p.is_new_arrival,
            isFeatured: !!p.is_best_selling,
            slug: p.slug,
            specification: p.specification || '',
            perfect_for: p.perfect_for || ''
          })));
        }
      }

      if (reviewsRes.data && !reviewsRes.error) {
        const dbReviews = reviewsRes.data;
        let localRevs: any[] = [];
        try {
          const stored = localStorage.getItem(`local_reviews_${id}`);
          if (stored) {
            localRevs = JSON.parse(stored);
          }
        } catch (e) {
          console.error('[localStorage load reviews]', e);
        }
        
        // Merge local reviews and database reviews (avoid duplicate ids)
        const dbIds = new Set(dbReviews.map((r: any) => r.id));
        const uniqueLocalRevs = localRevs.filter((r: any) => !dbIds.has(r.id));
        const combined = [...uniqueLocalRevs, ...dbReviews];
        
        setReviews(combined);

        // Calculate stats
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;
        combined.forEach((r: any) => {
          const star = r.rating as 5|4|3|2|1;
          if (dist[star] !== undefined) {
            dist[star]++;
          }
          sum += r.rating;
        });

        setReviewStats({
          average: combined.length ? Math.round((sum / combined.length) * 10) / 10 : 0,
          total: combined.length,
          distribution: dist
        });
      }

      setLoading(false);
    }
    fetchProductData();
  }, [id, supabase]);

  // Set default values for Dynamic Steps and prefill customer info
  useEffect(() => {
    if (product?.order_config?.specification_steps) {
      setSelectedSpecs({});
    }

    if (product?.order_config?.pricing_config?.min_order_qty) {
      setQuantity(product.order_config.pricing_config.min_order_qty);
    } else {
      setQuantity(1);
    }
  }, [product]);

  // Load customer profile and check for reviewable orders
  useEffect(() => {
    if (user) {
      setCustomerEmail(user.email || '');
      setCustomerName(user.user_metadata?.full_name || '');
      
      const fetchProfileAndOrders = async () => {
        const { data: profile } = await supabase.from('profiles').select('name, phone').eq('id', user.id).maybeSingle();
        if (profile) {
          if (profile.name) setCustomerName(profile.name);
          if (profile.phone) setCustomerPhone(profile.phone);
        }

        // Fetch user's order items to see if they can leave a review
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, orders!inner(id, order_number, status, customer_id)')
          .eq('product_id', id);

        if (orderItems) {
          const deliveredItems = orderItems.filter((item: any) => {
            const order = item.orders;
            return order && order.status === 'delivered' && order.customer_id === user.id;
          });

          const { data: existingReviews } = await supabase
            .from('product_reviews')
            .select('order_id')
            .eq('product_id', id)
            .eq('customer_id', user.id);

          const reviewedOrderIds = new Set((existingReviews ?? []).map((r: any) => r.order_id));

          setReviewableOrders(deliveredItems.map((item: any) => ({
            orderId: item.orders.id,
            orderNumber: item.orders.order_number,
            alreadyReviewed: reviewedOrderIds.has(item.orders.id)
          })));
        }
      };
      fetchProfileAndOrders();
    }
  }, [user, id, supabase]);

  // Flash Sale Timer Effect
  useEffect(() => {
    if (product?.section !== 'flash_sale' || !product.flash_sale_ends_at) return;

    const targetDate = new Date(product.flash_sale_ends_at).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 65)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [product]);

  // Display controls variables
  const showDiscountTable = product?.order_config?.display_controls?.show_discount_table ?? true;
  const showSpecifications = product?.order_config?.display_controls?.show_specifications ?? true;
  const showCustomerNotes = product?.order_config?.display_controls?.show_customer_notes ?? true;
  const showQuantitySelector = product?.order_config?.display_controls?.show_quantity_selector ?? true;
  const showDesignCharge = product?.order_config?.display_controls?.show_design_charge ?? true;
  const showTotalPrice = product?.order_config?.display_controls?.show_total_price ?? true;
  const showSendRequest = product?.order_config?.display_controls?.show_send_request ?? true;
  const showAddToCart = product?.order_config?.display_controls?.show_add_to_cart ?? true;

  // Active product variant calculation
  const activeVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find(v => 
      (!selectedSize || v.size === selectedSize) && 
      (!selectedColor || v.color === selectedColor)
    );
  }, [variants, selectedSize, selectedColor]);

  // Base pricing
  const basePrice = product ? Number(product.price) : 0;
  const comparePrice = product && product.compare_price ? Number(product.compare_price) : null;

  // Variant modifier
  const variantCost = activeVariant ? Number(activeVariant.price_modifier) : 0;

  // Custom B2B specifications costs
  const specCost = useMemo(() => {
    if (!product?.order_config?.specification_steps) return 0;
    return product.order_config.specification_steps.reduce((total: number, step: any) => {
      if (!step.active) return total;
      const selectedVal = selectedSpecs[step.id];
      if (!selectedVal) return total;

      let cost = Number(step.additional_price ?? 0);
      if (step.type === 'select' || step.type === 'radio') {
        const option = step.options?.find((o: any) => o.name === selectedVal);
        if (option) {
          cost += Number(option.price_modifier ?? 0);
        }
      }
      return total + cost;
    }, 0);
  }, [product, selectedSpecs]);

  // Total Unit Price before discount
  const unitPrice = basePrice + variantCost + specCost;

  // Quantity discounts calculation
  const discountPercent = useMemo(() => {
    const discounts = product?.order_config?.quantity_discounts ?? [];
    if (discounts.length === 0) return 0;
    const sorted = [...discounts].sort((a, b) => b.quantity - a.quantity);
    const match = sorted.find(d => quantity >= d.quantity);
    return match ? Number(match.discount_percent) : 0;
  }, [product, quantity]);

  // Quantity discounts calculation with base tier - Filtered to exclude 1+ tier / 0% discounts
  const discountTiers = useMemo(() => {
    const discounts = product?.order_config?.quantity_discounts ?? [];
    const sorted = [...discounts].sort((a, b) => a.quantity - b.quantity);
    return sorted.filter(tier => tier.discount_percent > 0);
  }, [product]);

  // Design charge amount
  const designChargeAmount = useMemo(() => {
    const isEnabled = product?.order_config?.design_charge?.enabled ?? false;
    return (isEnabled && isDesignChargeAdded) ? Number(product.order_config?.design_charge?.amount ?? 0) : 0;
  }, [product, isDesignChargeAdded]);

  // Total price calculations
  const subtotal = unitPrice * quantity;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const finalTotal = subtotal - discountAmount + designChargeAmount;

  // Live stock evaluation (always treat stock as unlimited)
  const stockAvailable = 999999;

  // Dynamic price range calculation for display
  const priceRange = useMemo(() => {
    if (!product) return '';
    let minMod = 0;
    let maxMod = 0;

    // Check variants modifier range
    if (variants.length > 0) {
      const modifiers = variants.map(v => Number(v.price_modifier || 0));
      minMod += Math.min(...modifiers);
      maxMod += Math.max(...modifiers);
    }

    // Check dynamic specs steps option modifiers
    if (product.order_config?.specification_steps) {
      product.order_config.specification_steps.forEach((step: any) => {
        if (!step.active) return;
        const prices = [Number(step.additional_price || 0)];
        if (step.options && step.options.length > 0) {
          step.options.forEach((opt: any) => {
            prices.push(Number(step.additional_price || 0) + Number(opt.price_modifier || 0));
          });
        }
        minMod += Math.min(...prices);
        maxMod += Math.max(...prices);
      });
    }

    const minPrice = basePrice + minMod;
    const maxPrice = basePrice + maxMod;

    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  }, [product, basePrice, variants]);

  // Product tags
  const tagsList = useMemo(() => {
    if (!product?.perfect_for) return [];
    if (Array.isArray(product.perfect_for)) return product.perfect_for;
    return product.perfect_for.split(',').map((s: string) => s.trim()).filter(Boolean);
  }, [product]);

  // Callback when a review is submitted (either guest or db)
  const handleReviewSubmitted = (newReview: any) => {
    // 1. Add to reviews state (at the top of the list)
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);

    // 2. Save local reviews to localStorage so they persist for this user
    if (newReview.id.startsWith('local-')) {
      try {
        const stored = localStorage.getItem(`local_reviews_${id}`);
        const localRevs = stored ? JSON.parse(stored) : [];
        localRevs.unshift(newReview);
        localStorage.setItem(`local_reviews_${id}`, JSON.stringify(localRevs));
      } catch (e) {
        console.error('Failed to save local review', e);
      }
    }

    // 3. Recalculate stats
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    updatedReviews.forEach((r: any) => {
      const star = r.rating as 5|4|3|2|1;
      if (dist[star] !== undefined) {
        dist[star]++;
      }
      sum += r.rating;
    });

    setReviewStats({
      average: updatedReviews.length ? Math.round((sum / updatedReviews.length) * 10) / 10 : 0,
      total: updatedReviews.length,
      distribution: dist
    });
  };

  const renderDescriptionAndPerfectFor = () => {
    if (!product) return null;
    return (
      <div className="space-y-6 bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-sm text-left">
        <div className="prose prose-slate max-w-none">
          <h3 className="text-xl font-bold font-display text-slate-900 mb-3">Product Story</h3>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-light italic">
            {product.description || 'No description has been recorded for this product.'}
          </p>
        </div>

        {tagsList.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recommended Alignments:</h4>
            <div className="flex flex-wrap gap-2">
              {tagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-slate-50 border border-slate-150 text-slate-650 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" /> {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewsSection = () => {
    if (!product) return null;
    return (
      <div id="reviews-section" className="space-y-8 animate-in fade-in-50 duration-300 text-left">
        <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <h3 className="text-2xl font-bold font-display text-slate-900 mb-6">Customer Reviews</h3>
          
          <div className="flex flex-col gap-8">
            {/* Stats Block */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Curator Ratings</h4>
                {reviewStats.total === 0 ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-black text-slate-300 leading-none">—</span>
                      <div className="space-y-1 pb-1">
                        <StarDisplay rating={0} size="md" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No reviews yet</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Be the first to leave a review below!</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black text-slate-900 leading-none">{reviewStats.average.toFixed(1)}</span>
                    <div className="space-y-1 pb-1">
                      <StarDisplay rating={reviewStats.average} size="md" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Based on {reviewStats.total} review{reviewStats.total === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 max-w-md space-y-2 md:pl-6 md:border-l border-slate-200">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewStats.distribution[star] || 0;
                  const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 w-10 shrink-0 font-bold text-slate-600">
                        <span>{star}</span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-slate-400 font-mono w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List & Write Review Block */}
            <div className="w-full space-y-8">
              {/* Review items list */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                    <Star className="h-10 w-10 text-slate-400 stroke-1 mb-3" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-650">No Reviews Yet</h4>
                    <p className="text-xs text-slate-450 max-w-sm mt-1">
                      Be the first to review this handcrafted masterpiece.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </div>

              {/* Leave review form */}
              <LeaveReviewForm 
                productId={product.id}
                productName={product.name}
                slug={product.slug || ''}
                reviewableOrders={reviewableOrders}
                onReviewSubmitted={handleReviewSubmitted}
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Image zoom handler on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate size and color selection
    const uniqueSizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean)));
    const uniqueColors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean)));
    if (uniqueSizes.length > 0 && !selectedSize) {
      errors['size'] = 'Please select a size.';
    }
    if (uniqueColors.length > 0 && !selectedColor) {
      errors['color'] = 'Please select a color/finish.';
    }

    // Validate dynamic steps
    if (product?.order_config?.specification_steps) {
      product.order_config.specification_steps.forEach((step: any) => {
        if (step.active && step.required) {
          const value = selectedSpecs[step.id];
          if (!value || value.trim() === '') {
            errors[step.id] = `${step.name} is required.`;
          }
        }
      });
    }

    // Check quantity constraints
    const minQty = product?.order_config?.pricing_config?.min_order_qty ?? 1;
    const maxQty = product?.order_config?.pricing_config?.max_order_qty;

    if (quantity < minQty) {
      toast.error(`Minimum order quantity is ${minQty} PCS.`);
      return false;
    }
    if (maxQty && quantity > maxQty) {
      toast.error(`Maximum order quantity is ${maxQty} PCS.`);
      return false;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!validateForm()) {
      toast.error('Please complete all required variants and specifications.');
      return;
    }

    // Collect configured choices
    const choices: Record<string, string> = {};
    if (selectedSize) choices['Size'] = selectedSize;
    if (selectedColor) choices['Finish/Color'] = selectedColor;
    
    if (product.order_config?.specification_steps) {
      product.order_config.specification_steps.forEach((step: any) => {
        const val = selectedSpecs[step.id];
        if (val) choices[step.name] = val;
      });
    }

    const choicesStr = Object.values(choices).filter(Boolean).join(', ');
    const configuredProduct = {
      ...product,
      name: choicesStr ? `${product.name} (${choicesStr})` : product.name,
      price: unitPrice,
      discountPrice: unitPrice * (1 - discountPercent / 100),
      selectedOptions: choices,
      customPrice: finalTotal / quantity
    } as any;

    addToCart(configuredProduct, quantity);
  };

  const handleSendOrderRequestClick = () => {
    if (!product) return;
    if (!validateForm()) {
      toast.error('Please complete all required variants and specifications.');
      return;
    }

    requireAuth(() => {
      // Gather all choices and custom inputs
      const choices: Record<string, string> = {};
      if (selectedSize) choices['Size'] = selectedSize;
      if (selectedColor) choices['Finish/Color'] = selectedColor;
      
      if (product.order_config?.specification_steps) {
        product.order_config.specification_steps.forEach((step: any) => {
          const val = selectedSpecs[step.id];
          if (val) choices[step.name] = val;
        });
      }

      // Add other custom specs
      Object.entries(selectedSpecs).forEach(([key, val]) => {
        if (val && !choices[key]) {
          // If it's a step ID, find step name
          const step = product.order_config?.specification_steps?.find((s: any) => s.id === key);
          const name = step ? step.name : key;
          choices[name] = val as string;
        }
      });

      // Prepare the item for checkout
      const checkoutItem = {
        id: product.id.toString(),
        name: product.name,
        price: finalTotal / quantity, // average unit price including discounts + design charges
        image: product.image || (product.images && product.images[0]) || '/placeholder.png',
        quantity: quantity,
        // Custom fields for order request details:
        selectedSpecs: choices,
        designCharge: designChargeAmount,
        customerNotes: customerNotes,
        originalPrice: unitPrice,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        finalTotal: finalTotal
      };

      // Save to sessionStorage
      saveCheckoutItems([checkoutItem]);

      // Redirect to checkout
      router.push('/checkout');
    }, 'Please log in to submit an order request.');
  };

  const handleConfirmOrderRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast.error('Please fill in all contact information.');
      return;
    }

    setSubmitting(true);
    try {
      // Package configured choices
      const choices: Record<string, string> = {};
      if (selectedSize) choices['Size'] = selectedSize;
      if (selectedColor) choices['Finish/Color'] = selectedColor;
      
      if (product.order_config?.specification_steps) {
        product.order_config.specification_steps.forEach((step: any) => {
          const val = selectedSpecs[step.id];
          if (val) choices[step.name] = val;
        });
      }

      const { error } = await supabase.from('order_requests').insert({
        product_id: product.id,
        product_name: product.name,
        user_id: user?.id || null,
        customer_info: { name: customerName, email: customerEmail, phone: customerPhone },
        selected_specifications: { ...choices, ...selectedSpecs },
        quantity,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        design_charge: designChargeAmount,
        customer_notes: customerNotes,
        final_total_price: finalTotal,
        status: 'pending'
      });

      if (error) throw error;
      toast.success('Order request sent successfully!');
      setShowOrderModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order request');
    } finally {
      setSubmitting(false);
    }
  };

  const isWishlisted = product ? isInWishlist(product.id) : false;

  if (loading) {
    return (
      <div className="pt-40 pb-24 text-center space-y-6">
        <div className="h-12 w-12 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[#1B4332] font-display">Crafting product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-24 text-center space-y-6">
        <h2 className="text-4xl font-display font-bold">Product not found</h2>
        <Link href="/products">
          <Button variant="outline" className="rounded-full px-8">Back to Gallery</Button>
        </Link>
      </div>
    );
  }

  const uniqueSizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];
  const uniqueColors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[];

  // WhatsApp discount request URL
  const whatsappDiscountUrl = `https://wa.me/8801958253962?text=${encodeURIComponent(`Hi DPM Sign! আমি "${product?.name}" পণ্যটিতে Discount চাই। পরিমাণ: ${quantity} PCS। দয়া করে আমাকে সেরা মূল্য জানান।`)}`;

  return (
    <div className="pt-24 md:pt-32 pb-16 md:pb-24 px-4 md:px-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* Breadcrumbs */}
      <nav className="hidden sm:flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-505 uppercase tracking-[0.2em] mb-8 md:mb-12">
        <Link href="/" className="hover:text-[#2D6A4F] transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-[#2D6A4F] transition-colors">Shop</Link>
        <ChevronRight className="h-3 w-3" />
        {product.categories?.name && (
          <>
            <Link href={`/category/${product.categories.slug}`} className="hover:text-[#2D6A4F] transition-colors">
              {product.categories.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-slate-950 truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Left Side: Product Gallery (7 columns on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative">
            {/* Main Interactive Zoom Card */}
            <div 
              className="aspect-[4/5] sm:aspect-square rounded-[2rem] md:rounded-[40px] overflow-hidden bg-slate-50 border border-slate-200/50 shadow-sm relative group cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
            >
              <motion.img
                src={product.images && product.images[activeImage] ? product.images[activeImage] : '/images/about.jpg'}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-200 ease-out"
                style={{
                  transformOrigin: zoomOrigin,
                  transform: isZoomed ? 'scale(2.2)' : 'scale(1)'
                }}
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Zoom Magnifier Lens Overlay Hint */}
              <div className="absolute bottom-4 right-4 bg-white/85 backdrop-blur-md text-[10px] text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-250 opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Globe className="w-3.5 h-3.5 text-[#2D6A4F] animate-spin" /> Hover image to zoom
              </div>
            </div>

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.is_new_arrival && (
                <Badge className="bg-[#1A3320] text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md">
                  New Arrival
                </Badge>
              )}
              {product.is_best_selling && (
                <Badge className="bg-amber-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md">
                  Best Seller
                </Badge>
              )}
              {product.is_product_of_the_day && (
                <Badge className="bg-red-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Spotlight
                </Badge>
              )}
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all snap-start shadow-sm relative ${
                    activeImage === idx
                      ? 'border-[#2D6A4F] ring-4 ring-[#2D6A4F]/10 scale-95'
                      : 'border-slate-200 opacity-70 hover:opacity-100 hover:scale-95'
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* ===== MOBILE ONLY: Right Panel inserted here ===== */}
          <div className="lg:hidden space-y-6">
            {/* Discount Breakdown */}
            {showDiscountTable && discountTiers.length > 0 && (
              <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm space-y-3 text-left">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Discount Breakdown
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 font-medium text-slate-500">Quantity</td>
                        {discountTiers.map((tier, idx) => (
                          <td key={idx} className="py-2 text-right font-black text-slate-800">
                            {tier.quantity}+
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 font-medium text-slate-500">Discount</td>
                        {discountTiers.map((tier, idx) => (
                          <td key={idx} className="py-2 text-right font-black text-emerald-600">
                            {tier.discount_percent}%
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                  Minimum Order Quantity {product.order_config?.pricing_config?.min_order_qty || 1} pieces
                </div>
              </div>
            )}

            {/* Main Purchase Panel */}
            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-6">
              {/* Header Metadata */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" className="px-3 py-1 text-[10px] bg-[#E6F0EB] text-[#1B4332] font-bold border-none uppercase tracking-wider">
                      {product.category}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-emerald-200 text-emerald-600 bg-emerald-50/30">
                      Stock: Unlimited
                    </Badge>
                  </div>
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={cn(
                      "p-2.5 rounded-full border border-slate-200/80 transition-all hover:bg-slate-50",
                      isWishlisted ? "text-red-500 border-red-100 bg-red-50/30" : "text-slate-404"
                    )}
                  >
                    <Heart className={cn("w-4.5 h-4.5", isWishlisted && "fill-current")} />
                  </button>
                </div>

                <h1 className="text-2xl font-display font-bold text-[#1A3320] leading-tight">
                  {product.name}
                </h1>

                {/* Rating row */}
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  {reviewStats.total > 0 ? (
                    <>
                      <StarDisplay rating={reviewStats.average} size="sm" />
                      <span className="text-sm font-black text-slate-800">{reviewStats.average.toFixed(1)}</span>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => { document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="text-xs text-slate-500 hover:text-[#2D6A4F] hover:underline font-bold"
                      >
                        {reviewStats.total} Review{reviewStats.total === 1 ? '' : 's'}
                      </button>
                    </>
                  ) : (
                    <>
                      <StarDisplay rating={0} size="sm" />
                      <span className="text-xs text-slate-400 font-bold">No reviews yet</span>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => { document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="text-xs text-slate-400 hover:text-[#2D6A4F] hover:underline font-bold"
                      >
                        Be the first to review
                      </button>
                    </>
                  )}
                  {product.sku && (
                    <span className="ml-auto text-[10px] text-slate-400 font-mono font-bold">SKU: {product.sku}</span>
                  )}
                </div>
              </div>

              {/* Price Range Display */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Price Range</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#1B4332]">{priceRange}</span>
                  {comparePrice && comparePrice > basePrice && (
                    <span className="text-sm text-slate-400 line-through font-light">
                      {formatPrice(comparePrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Step-by-Step Selection */}
              <div className="space-y-4">
                {uniqueSizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Step 1: Select Dimensions / Size</span>
                      {validationErrors.size && <span className="text-red-500 normal-case font-bold">{validationErrors.size}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSizes.map(size => {
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSize(null);
                              } else {
                                setSelectedSize(size);
                                setValidationErrors(prev => ({ ...prev, size: '' }));
                              }
                            }}
                            className={cn(
                              "px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                              isSelected
                                ? "border-[#2D6A4F] bg-[#2D6A4F] text-white shadow-sm"
                                : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {uniqueColors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-550">
                      <span>Step {uniqueSizes.length > 0 ? 2 : 1}: Choose Finish / Color</span>
                      {validationErrors.color && <span className="text-red-500 normal-case font-bold">{validationErrors.color}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map(color => {
                        const isSelected = selectedColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedColor(null);
                              } else {
                                setSelectedColor(color);
                                setValidationErrors(prev => ({ ...prev, color: '' }));
                              }
                            }}
                            className={cn(
                              "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                              isSelected
                                ? "border-[#2D6A4F] bg-[#2D6A4F] text-white shadow-sm"
                                : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showSpecifications && product.order_config?.specification_steps && product.order_config.specification_steps.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    {product.order_config.specification_steps
                      .filter((step: any) => step.active)
                      .map((step: any, idx: number) => {
                        const error = validationErrors[step.id];
                        const selectedVal = selectedSpecs[step.id];
                        const stepNum = (uniqueSizes.length > 0 ? 1 : 0) + (uniqueColors.length > 0 ? 1 : 0) + idx + 1;
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              "bg-white border border-slate-200 rounded-2xl p-4 space-y-3 transition-all",
                              error && "border-red-200 bg-red-50/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Step {stepNum}: {step.name}
                                {step.required && <span className="text-red-505 ml-0.5">*</span>}
                              </span>
                              {selectedVal && <Check className="h-4 w-4 text-[#2D6A4F]" />}
                            </div>
                            {step.description && <p className="text-[10px] text-slate-400 leading-normal">{step.description}</p>}
                            {step.type === 'select' && step.options && (
                              <div className="relative">
                                <select
                                  value={selectedVal || ''}
                                  onChange={(e) => {
                                    setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.value }));
                                    setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                  }}
                                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#2D6A4F] transition-all text-slate-800"
                                >
                                  <option value="">Choose Options...</option>
                                  {step.options.map((opt: any, oIdx: number) => (
                                    <option key={oIdx} value={opt.name}>
                                      {opt.name} {opt.price_modifier > 0 ? `(+${formatPrice(opt.price_modifier)})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {step.type === 'radio' && step.options && (
                              <div className="grid grid-cols-2 gap-2">
                                {step.options.map((opt: any, oIdx: number) => {
                                  const isSelected = selectedVal === opt.name;
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedSpecs(prev => { const copy = { ...prev }; delete copy[step.id]; return copy; });
                                        } else {
                                          setSelectedSpecs(prev => ({ ...prev, [step.id]: opt.name }));
                                          setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                        }
                                      }}
                                      className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all",
                                        isSelected ? "border-[#2D6A4F] bg-[#2D6A4F] text-white font-bold" : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                                      )}
                                    >
                                      <span className="text-xs">{opt.name}</span>
                                      {opt.price_modifier > 0 && (
                                        <span className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-white/80" : "text-slate-500")}>
                                          +{formatPrice(opt.price_modifier)}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {step.type === 'text' && (
                              <input
                                type="text"
                                value={selectedVal || ''}
                                onChange={(e) => {
                                  setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.value }));
                                  setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                }}
                                placeholder="Provide requirements input..."
                                className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#2D6A4F] transition-all text-slate-800"
                              />
                            )}
                            {step.type === 'file' && (
                              <label className="flex items-center gap-2 justify-center border border-dashed border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                  type="file"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.files![0].name }));
                                      setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                    }
                                  }}
                                  className="hidden"
                                />
                                <Upload className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">
                                  {selectedVal || 'Upload reference layout PDF/Image'}
                                </span>
                              </label>
                            )}
                            {error && (
                              <div className="flex items-center gap-1 text-red-555 text-[10px] font-bold mt-1 animate-pulse">
                                <AlertCircle className="h-3 w-3" />
                                <span>{error}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Custom Design Fee */}
              {showDesignCharge && product.order_config?.design_charge?.enabled && (
                <div className="bg-white border border-slate-150 rounded-2xl p-4 space-y-2 text-left">
                  <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest block">Design Fee Add-on</span>
                  <button
                    type="button"
                    onClick={() => setIsDesignChargeAdded(prev => !prev)}
                    className={cn(
                      "w-full bg-white border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all hover:bg-slate-50 text-left",
                      isDesignChargeAdded ? "border-[#2D6A4F] ring-2 ring-[#2D6A4F]/10" : "border-slate-200"
                    )}
                  >
                    <div className="space-y-0.5 pr-2">
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Custom Design Assistance
                      </h5>
                      <p className="text-[10px] text-slate-450 leading-tight">
                        {product.order_config.design_charge.description || 'Add custom layouts setup to order requests.'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="block text-xs font-black text-[#1B4332]">+{formatPrice(product.order_config.design_charge.amount)}</span>
                        <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-450">Add-on</span>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                        isDesignChargeAdded ? "bg-[#2D6A4F] border-[#2D6A4F] text-white" : "border-slate-300"
                      )}>
                        {isDesignChargeAdded && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </button>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">Discount Rate:</span>
                    <span className="font-black text-emerald-600">{discountPercent}%</span>
                  </div>
                </div>
              )}

              {(!showDesignCharge || !product.order_config?.design_charge?.enabled) && (
                <div className="bg-white border border-slate-150 rounded-2xl p-4 flex justify-between items-center text-xs text-left">
                  <span className="font-bold text-slate-700">Discount Rate:</span>
                  <span className="font-black text-emerald-600 text-sm">{discountPercent}%</span>
                </div>
              )}

              {showCustomerNotes && product.order_config?.customer_notes_settings?.enabled && (
                <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest block">
                    {product.order_config.customer_notes_settings.title || 'Specification Need Details'}
                  </span>
                  <textarea
                    rows={3}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder={product.order_config.customer_notes_settings.placeholder || 'Write details instructions...'}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#2D6A4F] bg-white text-xs text-slate-800 resize-none transition-all shadow-inner"
                  />
                </div>
              )}

              {product.order_config?.pricing_config && (
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-450 uppercase py-1 border-t border-slate-100">
                  <span>Min Qty: {product.order_config.pricing_config.min_order_qty || 1} PCS</span>
                  {product.order_config.pricing_config.max_order_qty && (
                    <>
                      <span>•</span>
                      <span>Max Limit: {product.order_config.pricing_config.max_order_qty} PCS</span>
                    </>
                  )}
                </div>
              )}

              {showTotalPrice && (
                <div className="bg-[#1A3320] text-[#F0F4F0] rounded-2xl p-4 space-y-2.5 shadow-md shadow-[#1A3320]/10 text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Price Calculator</span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between opacity-90">
                      <span>Base Unit Cost:</span>
                      <span className="font-mono">{formatPrice(unitPrice)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-emerald-355 font-bold">
                        <span>Volume Discount ({discountPercent}%):</span>
                        <span className="font-mono">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    {showDesignCharge && designChargeAmount > 0 && (
                      <div className="flex justify-between opacity-90">
                        <span>Design Fee Add-on:</span>
                        <span className="font-mono">+{formatPrice(designChargeAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between opacity-90">
                      <span>Order Quantity:</span>
                      <span className="font-mono">{quantity} PCS</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-white/10 pt-2.5 mt-1 items-baseline">
                    <span className="uppercase tracking-widest text-[10px] opacity-90">Grand Estimated Total</span>
                    <span className="text-xl text-white font-mono">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  {showQuantitySelector && (
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-14 w-full sm:w-36 shrink-0 justify-between">
                      <button
                        onClick={() => setQuantity(prev => {
                          const min = product?.order_config?.pricing_config?.min_order_qty ?? 1;
                          return Math.max(min, prev - 1);
                        })}
                        className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-[#2D6A4F] transition-colors bg-white rounded-xl shadow-sm border border-slate-150"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const min = product?.order_config?.pricing_config?.min_order_qty ?? 1;
                          const max = product?.order_config?.pricing_config?.max_order_qty;
                          let v = parseInt(e.target.value);
                          if (Number.isNaN(v)) v = min;
                          if (v < min) v = min;
                          if (max && v > max) v = max;
                          setQuantity(v);
                        }}
                        className="w-12 text-center font-black text-base text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setQuantity(prev => {
                          const max = product?.order_config?.pricing_config?.max_order_qty;
                          if (max && prev >= max) return prev;
                          return prev + 1;
                        })}
                        className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-[#2D6A4F] transition-colors bg-white rounded-xl shadow-sm border border-slate-150"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-2">
                    {showAddToCart && (
                      <Button
                        variant="primary"
                        onClick={handleAddToCart}
                        disabled={stockAvailable <= 0}
                        className="w-full h-14 text-xs font-black rounded-2xl bg-[#1A3320] hover:bg-[#2D6A4F] text-white transition-all shadow-md shadow-[#1A3320]/10 uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="h-4.5 w-4.5" /> Add to Cart
                      </Button>
                    )}
                  </div>
                </div>

                {showSendRequest && product.order_config?.order_request_settings?.enable_order_requests !== false && (
                  <Button
                    variant="outline"
                    onClick={handleSendOrderRequestClick}
                    disabled={submitting}
                    className="w-full h-13 text-xs font-black rounded-2xl border-[#1B4332] text-[#1B4332] hover:bg-green-800 transition-all uppercase tracking-widest"
                  >
                    Send Order Request
                  </Button>
                )}
              </div>

              {/* Secure Checkout / Global Delivery */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#2D6A4F] shrink-0" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#2D6A4F] shrink-0" />
                  <span>Global Delivery</span>
                </div>
              </div>

              {/* Help & Contact + Send Discount Request (WhatsApp) */}
              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 space-y-3 mt-4 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="text-base">👨‍💼</span>
                  <span>Need Help? Contact Us.</span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href="mailto:info@dpmsign.com" className="hover:underline font-semibold">info@dpmsign.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">8801958253962 || 8801958253965</span>
                  </div>
                </div>
                <a
                  href={whatsappDiscountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 text-xs font-bold rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all shadow-sm uppercase tracking-wider mt-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Discount Request!
                </a>
              </div>
            </div>
          </div>
          {/* ===== END MOBILE ONLY PANEL ===== */}

          {/* Perfect For Section (Under Image / Mobile panel) */}
          {tagsList.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100 text-left">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Perfect For:</h4>
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-slate-50 border border-slate-150 text-slate-650 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100 text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-light italic">
              {product.description || 'No description has been recorded for this product.'}
            </p>
          </div>

          {/* Brand Partner Info */}
          {product.brandName && (
            <div className="bg-[#F9F7F2] rounded-3xl p-6 border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-[#2D6A4F] tracking-widest block">Brand Partner</span>
                <h4 className="text-xl font-bold font-display text-slate-800">{product.brandName}</h4>
                <p className="text-xs text-slate-450">Handcrafted design collaboration</p>
              </div>
              {product.brandLogo && (
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-205 flex items-center justify-center p-2 shadow-inner">
                  <img src={product.brandLogo} alt={product.brandName} className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          )}

          {/* Flash Sale Countdown Widget */}
          {timeLeft && (
            <div className="bg-gradient-to-r from-red-600 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-red-955/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Flash Sale
                </div>
                <h4 className="text-lg font-bold">Limited Time Discount Ends In:</h4>
              </div>
              <div className="flex gap-3 text-center">
                {[
                  { value: timeLeft.days, label: 'Days' },
                  { value: timeLeft.hours, label: 'Hrs' },
                  { value: timeLeft.minutes, label: 'Min' },
                  { value: timeLeft.seconds, label: 'Sec' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/10 rounded-2xl px-4 py-2.5 min-w-[64px] border border-white/10 backdrop-blur-sm">
                    <span className="block text-xl font-black font-mono leading-none">{String(item.value).padStart(2, '0')}</span>
                    <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 opacity-80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Sticky Purchase & Customization Panel (5 columns) — DESKTOP ONLY */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-28 space-y-6">
          {/* Discount Breakdown - Very Top of Right Column */}
          {showDiscountTable && discountTiers.length > 0 && (
            <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm space-y-3 text-left">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Discount Breakdown
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-500">Quantity</td>
                      {discountTiers.map((tier, idx) => (
                        <td key={idx} className="py-2 text-right font-black text-slate-800">
                          {tier.quantity}+
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-500">Discount</td>
                      {discountTiers.map((tier, idx) => (
                        <td key={idx} className="py-2 text-right font-black text-emerald-600">
                          {tier.discount_percent}%
                        </td>
                      ))}
                    </tr>
                    
                  </tbody>
                </table>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                Minimum Order Quantity {product.order_config?.pricing_config?.min_order_qty || 1} pieces
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
            {/* Header Metadata */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="px-3 py-1 text-[10px] md:text-xs bg-[#E6F0EB] text-[#1B4332] font-bold border-none uppercase tracking-wider">
                    {product.category}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider border-emerald-200 text-emerald-600 bg-emerald-50/30">
                    Stock: Unlimited
                  </Badge>
                </div>
                <button
                  onClick={() => toggleWishlist(product)}
                  className={cn(
                    "p-2.5 rounded-full border border-slate-200/80 transition-all hover:bg-slate-50",
                    isWishlisted ? "text-red-500 border-red-100 bg-red-50/30" : "text-slate-404"
                  )}
                >
                  <Heart className={cn("w-4.5 h-4.5", isWishlisted && "fill-current")} />
                </button>
              </div>

              <h1 className="text-2xl md:text-3xl font-display font-bold text-[#1A3320] leading-tight">
                {product.name}
              </h1>

              {/* Rating row */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                {reviewStats.total > 0 ? (
                  <>
                    <StarDisplay rating={reviewStats.average} size="sm" />
                    <span className="text-sm font-black text-slate-800">{reviewStats.average.toFixed(1)}</span>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={() => { document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="text-xs text-slate-500 hover:text-[#2D6A4F] hover:underline font-bold"
                    >
                      {reviewStats.total} Review{reviewStats.total === 1 ? '' : 's'}
                    </button>
                  </>
                ) : (
                  <>
                    <StarDisplay rating={0} size="sm" />
                    <span className="text-xs text-slate-400 font-bold">No reviews yet</span>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={() => { document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="text-xs text-slate-400 hover:text-[#2D6A4F] hover:underline font-bold"
                    >
                      Be the first to review
                    </button>
                  </>
                )}
                {product.sku && (
                  <span className="ml-auto text-[10px] text-slate-400 font-mono font-bold">SKU: {product.sku}</span>
                )}
              </div>
            </div>

            {/* Price Range Display */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Price Range</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1B4332]">{priceRange}</span>
                {comparePrice && comparePrice > basePrice && (
                  <span className="text-sm text-slate-400 line-through font-light">
                    {formatPrice(comparePrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Step-by-Step Selection */}
            <div className="space-y-4">
              {/* Step 1: Dimensions / Size */}
              {uniqueSizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Step 1: Select Dimensions / Size</span>
                    {validationErrors.size && <span className="text-red-500 normal-case font-bold">{validationErrors.size}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSizes.map(size => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSize(null);
                            } else {
                              setSelectedSize(size);
                              setValidationErrors(prev => ({ ...prev, size: '' }));
                            }
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                            isSelected
                              ? "border-[#2D6A4F] bg-[#2D6A4F] text-white shadow-sm"
                              : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Color / Finish */}
              {uniqueColors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-550">
                    <span>Step {uniqueSizes.length > 0 ? 2 : 1}: Choose Finish / Color</span>
                    {validationErrors.color && <span className="text-red-500 normal-case font-bold">{validationErrors.color}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map(color => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedColor(null);
                            } else {
                              setSelectedColor(color);
                              setValidationErrors(prev => ({ ...prev, color: '' }));
                            }
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                            isSelected
                              ? "border-[#2D6A4F] bg-[#2D6A4F] text-white shadow-sm"
                              : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic steps from specification_steps */}
              {showSpecifications && product.order_config?.specification_steps && product.order_config.specification_steps.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {product.order_config.specification_steps
                    .filter((step: any) => step.active)
                    .map((step: any, idx: number) => {
                      const error = validationErrors[step.id];
                      const selectedVal = selectedSpecs[step.id];
                      const stepNum = (uniqueSizes.length > 0 ? 1 : 0) + (uniqueColors.length > 0 ? 1 : 0) + idx + 1;

                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "bg-white border border-slate-200 rounded-2xl p-4 space-y-3 transition-all",
                            error && "border-red-200 bg-red-50/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Step {stepNum}: {step.name}
                              {step.required && <span className="text-red-505 ml-0.5">*</span>}
                            </span>
                            {selectedVal && <Check className="h-4 w-4 text-[#2D6A4F]" />}
                          </div>

                          {step.description && <p className="text-[10px] text-slate-400 leading-normal">{step.description}</p>}

                          {/* Select type */}
                          {step.type === 'select' && step.options && (
                            <div className="relative">
                              <select
                                value={selectedVal || ''}
                                onChange={(e) => {
                                  setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.value }));
                                  setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                }}
                                className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#2D6A4F] transition-all text-slate-800"
                              >
                                <option value="">Choose Options...</option>
                                {step.options.map((opt: any, oIdx: number) => (
                                  <option key={oIdx} value={opt.name}>
                                    {opt.name} {opt.price_modifier > 0 ? `(+${formatPrice(opt.price_modifier)})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Radio type */}
                          {step.type === 'radio' && step.options && (
                            <div className="grid grid-cols-2 gap-2">
                              {step.options.map((opt: any, oIdx: number) => {
                                const isSelected = selectedVal === opt.name;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedSpecs(prev => {
                                          const copy = { ...prev };
                                          delete copy[step.id];
                                          return copy;
                                        });
                                      } else {
                                        setSelectedSpecs(prev => ({ ...prev, [step.id]: opt.name }));
                                        setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                      }
                                    }}
                                    className={cn(
                                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all",
                                      isSelected
                                        ? "border-[#2D6A4F] bg-[#2D6A4F] text-white font-bold"
                                        : "border-slate-400 bg-white text-slate-700 hover:border-[#2D6A4F]"
                                    )}
                                  >
                                    <span className="text-xs">{opt.name}</span>
                                    {opt.price_modifier > 0 && (
                                      <span className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-white/80" : "text-slate-500")}>
                                        +{formatPrice(opt.price_modifier)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Text input type */}
                          {step.type === 'text' && (
                            <input
                              type="text"
                              value={selectedVal || ''}
                              onChange={(e) => {
                                  setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.value }));
                                  setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                              }}
                              placeholder="Provide requirements input..."
                              className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#2D6A4F] transition-all text-slate-800"
                            />
                          )}

                          {/* File upload type */}
                          {step.type === 'file' && (
                            <label className="flex items-center gap-2 justify-center border border-dashed border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                              <input
                                type="file"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setSelectedSpecs(prev => ({ ...prev, [step.id]: e.target.files![0].name }));
                                    setValidationErrors(prev => ({ ...prev, [step.id]: '' }));
                                  }
                                }}
                                className="hidden"
                              />
                              <Upload className="h-4 w-4 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">
                                {selectedVal || 'Upload reference layout PDF/Image'}
                              </span>
                            </label>
                          )}

                          {error && (
                            <div className="flex items-center gap-1 text-red-555 text-[10px] font-bold mt-1 animate-pulse">
                              <AlertCircle className="h-3 w-3" />
                              <span>{error}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Custom Design Fee Service Option */}
            {showDesignCharge && product.order_config?.design_charge?.enabled && (
              <div className="bg-white border border-slate-150 rounded-2xl p-4 space-y-2 text-left">
                <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest block">Design Fee Add-on</span>
                <button
                  type="button"
                  onClick={() => setIsDesignChargeAdded(prev => !prev)}
                  className={cn(
                    "w-full bg-white border rounded-xl p-3 flex items-center justify-between shadow-sm transition-all hover:bg-slate-50 text-left",
                    isDesignChargeAdded ? "border-[#2D6A4F] ring-2 ring-[#2D6A4F]/10" : "border-slate-200"
                  )}
                >
                  <div className="space-y-0.5 pr-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Custom Design Assistance
                    </h5>
                    <p className="text-[10px] text-slate-450 leading-tight">
                      {product.order_config.design_charge.description || 'Add custom layouts setup to order requests.'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="block text-xs font-black text-[#1B4332]">+{formatPrice(product.order_config.design_charge.amount)}</span>
                      <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-450">Add-on</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      isDesignChargeAdded ? "bg-[#2D6A4F] border-[#2D6A4F] text-white" : "border-slate-300"
                    )}>
                      {isDesignChargeAdded && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </button>
                {/* Discount Rate display under Design Fee Add-on */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Discount Rate:</span>
                  <span className="font-black text-emerald-600">{discountPercent}%</span>
                </div>
              </div>
            )}

            {/* If Design Fee Add-on doesn't exist, show Discount Rate anyway */}
            {(!showDesignCharge || !product.order_config?.design_charge?.enabled) && (
              <div className="bg-white border border-slate-150 rounded-2xl p-4 flex justify-between items-center text-xs text-left">
                <span className="font-bold text-slate-700">Discount Rate:</span>
                <span className="font-black text-emerald-600 text-sm">{discountPercent}%</span>
              </div>
            )}

            {/* Customer Requirements Instructions Box */}
            {showCustomerNotes && product.order_config?.customer_notes_settings?.enabled && (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest block">
                  {product.order_config.customer_notes_settings.title || 'Specification Need Details'}
                </span>
                <textarea
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder={product.order_config.customer_notes_settings.placeholder || 'Write details instructions...'}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#2D6A4F] bg-white text-xs text-slate-800 resize-none transition-all shadow-inner"
                />
              </div>
            )}

            {/* Advanced Limits Notice Badge */}
            {product.order_config?.pricing_config && (
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-450 uppercase py-1 border-t border-slate-100">
                <span>Min Qty: {product.order_config.pricing_config.min_order_qty || 1} PCS</span>
                {product.order_config.pricing_config.max_order_qty && (
                  <>
                    <span>•</span>
                    <span>Max Limit: {product.order_config.pricing_config.max_order_qty} PCS</span>
                  </>
                )}
              </div>
            )}

            {/* Calculator Breakdown Card */}
            {showTotalPrice && (
              <div className="bg-[#1A3320] text-[#F0F4F0] rounded-2xl p-4 space-y-2.5 shadow-md shadow-[#1A3320]/10 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">Price Calculator</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between opacity-90">
                    <span>Base Unit Cost:</span>
                    <span className="font-mono">{formatPrice(unitPrice)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-355 font-bold">
                      <span>Volume Discount ({discountPercent}%):</span>
                      <span className="font-mono">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {showDesignCharge && designChargeAmount > 0 && (
                    <div className="flex justify-between opacity-90">
                      <span>Design Fee Add-on:</span>
                      <span className="font-mono">+{formatPrice(designChargeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between opacity-90">
                    <span>Order Quantity:</span>
                    <span className="font-mono">{quantity} PCS</span>
                  </div>
                </div>
                <div className="flex justify-between text-base font-black border-t border-white/10 pt-2.5 mt-1 items-baseline">
                  <span className="uppercase tracking-widest text-[10px] opacity-90">Grand Estimated Total</span>
                  <span className="text-xl text-white font-mono">{formatPrice(finalTotal)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons & Quantity */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                {showQuantitySelector && (
                  <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-14 w-full sm:w-36 shrink-0 justify-between">
                    <button
                      onClick={() => setQuantity(prev => {
                        const min = product?.order_config?.pricing_config?.min_order_qty ?? 1;
                        return Math.max(min, prev - 1);
                      })}
                      className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-[#2D6A4F] transition-colors bg-white rounded-xl shadow-sm border border-slate-150"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const min = product?.order_config?.pricing_config?.min_order_qty ?? 1;
                        const max = product?.order_config?.pricing_config?.max_order_qty;
                        let v = parseInt(e.target.value);
                        if (Number.isNaN(v)) v = min;
                        if (v < min) v = min;
                        if (max && v > max) v = max;
                        setQuantity(v);
                      }}
                      className="w-12 text-center font-black text-base text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQuantity(prev => {
                        const max = product?.order_config?.pricing_config?.max_order_qty;
                        if (max && prev >= max) return prev;
                        return prev + 1;
                      })}
                      className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-[#2D6A4F] transition-colors bg-white rounded-xl shadow-sm border border-slate-150"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 flex flex-col gap-2">
                  {showAddToCart && (
                    <Button
                      variant="primary"
                      onClick={handleAddToCart}
                      disabled={stockAvailable <= 0}
                      className="w-full h-14 text-xs font-black rounded-2xl bg-[#1A3320] hover:bg-[#2D6A4F] text-white transition-all shadow-md shadow-[#1A3320]/10 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4.5 w-4.5" /> Add to Cart
                    </Button>
                  )}
                </div>
              </div>

              {showSendRequest && product.order_config?.order_request_settings?.enable_order_requests !== false && (
                <Button
                  variant="outline"
                  onClick={handleSendOrderRequestClick}
                  disabled={submitting}
                  className="w-full h-13 text-xs font-black rounded-2xl border-[#1B4332] text-[#1B4332] hover:bg-green-800 transition-all uppercase tracking-widest"
                >
                  Send Order Request
                </Button>
              )}
            </div>

            {/* Secure Checkout / Global Delivery */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#2D6A4F] shrink-0" />
                <span>Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#2D6A4F] shrink-0" />
                <span>Global Delivery</span>
              </div>
            </div>

            {/* Help & Contact Section (Need Help? Contact Us. info@dpmsign.com 8801958253962 || 8801958253965 Send Discount Request!) */}
            <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 space-y-3 mt-4 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="text-base">👨💼</span>
                <span>Need Help? Contact Us.</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href="mailto:info@dpmsign.com" className="hover:underline font-semibold">info@dpmsign.com</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">8801958253962 || 8801958253965</span>
                </div>
              </div>
              <a
                href={whatsappDiscountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 text-xs font-bold rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all shadow-sm uppercase tracking-wider mt-2"
              >
                <MessageSquare className="w-4 h-4" />
                Send Discount Request!
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        {renderReviewsSection()}
      </div>

      {/* Designer Support & Contact Assistance Card */}
      <div className="mt-20 bg-gradient-to-br from-[#1A3320] to-[#2D6A4F] rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-355" /> Bespoke Craftsmanship
          </div>
          <h3 className="text-3xl md:text-4xl font-display  text-white font-bold leading-tight">
            Need Custom Dimensions or Corporate Gifting?
          </h3>
          <p className="text-sm text-emerald-100 leading-relaxed">
            Collaborate directly with our Lead Design Specialists. We offer customized sizing, bulk corporate rates, and custom engraving setups to match your branding perfectly.
          </p>
          <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 text-xs font-bold uppercase tracking-widest text-emerald-200 pt-2">
            <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-amber-350" /> SanJid, Lead Craftsman</span>
            <span>•</span>
            <span>Response Time: &lt; 2 hours</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
          <a
            href={`https://wa.me/+8801700000000?text=Hi%20Forest%20Craft,%20I'm%20interested%20in%20customizing%20your%20"${encodeURIComponent(product.name)}"%20(SKU:%20${product.sku || 'N/A'}).`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#20ba5a] px-6 h-14 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all shadow-md"
          >
            <MessageSquare className="w-4.5 h-4.5" /> Discuss on WhatsApp <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="tel:+8801700000000"
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 h-14 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all"
          >
            <Phone className="w-4.5 h-4.5" /> Call Design Desk
          </a>
        </div>
      </div>

      {/* Confirmation Order Request Modal Dialog */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Confirm Quote Request</h3>
                <p className="text-xs text-slate-500 mt-1">Please confirm your contact details to submit this order request.</p>
              </div>

              <form onSubmit={handleConfirmOrderRequest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#2D6A4F] text-sm text-slate-900 font-semibold shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#2D6A4F] text-sm text-slate-900 font-semibold shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Phone Number *</label>
                  <input
                    required
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#2D6A4F] text-sm text-slate-900 font-semibold shadow-inner"
                  />
                </div>

                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-slate-100 space-y-2 mt-2">
                  <div className="flex justify-between text-xs text-slate-550">
                    <span>Product Name:</span>
                    <span className="font-bold text-slate-800">{product.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-555">
                    <span>Configured Specs:</span>
                    <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                      {[selectedSize, selectedColor, ...Object.values(selectedSpecs)].filter(Boolean).join(', ') || 'Default'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-550">
                    <span>Order Quantity:</span>
                    <span className="font-bold text-slate-800">{quantity} PCS</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                      <span>Applied discount ({discountPercent}%):</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {showDesignCharge && designChargeAmount > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Custom Design Fee:</span>
                      <span className="font-bold text-slate-850">+{formatPrice(designChargeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200/60 pt-2.5 mt-2 items-baseline">
                    <span>Total Quote:</span>
                    <span className="text-[#1B4332] text-base">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 rounded-xl h-11 border-slate-200 font-bold text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="flex-1 rounded-xl h-11 bg-[#1B4332] text-white hover:bg-[#2D6A4F] font-bold"
                  >
                    {submitting ? 'Sending Request...' : 'Confirm'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Related Products Slider Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-20 sm:mt-24 md:mt-32 pt-12 md:pt-16 border-t border-slate-150">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div className="space-y-1.5">
              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-3 py-1 uppercase tracking-widest font-black border-amber-500 text-amber-600 bg-amber-50/20">
                Recommended Curations
              </Badge>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-900">Complete the Collection</h2>
            </div>
            <Link href="/products" className="hidden sm:block">
              <Button variant="outline" className="rounded-full px-6 h-10 text-[9px] uppercase font-bold tracking-widest hover:bg-slate-50 transition-colors">See All Gallery</Button>
            </Link>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 sm:pb-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 scrollbar-hide snap-x">
            {relatedProducts.map((p) => (
              <div key={p.id} className="w-[200px] sm:w-auto flex-shrink-0 snap-start">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
