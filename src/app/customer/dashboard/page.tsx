'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ShoppingBag, CreditCard, Clock, PackageOpen, ArrowRight,
  Heart, MapPin, Sparkles, User, ShieldCheck, Calendar,
  Truck, CheckCircle2, AlertCircle, ShoppingCart, Eye,
  Plus, Edit2, Trash2, X, Upload, Lock, EyeOff, Star, AlertTriangle,
  History, Loader2
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cancelOrderAction } from '@/lib/actions/orders';
import { extractProductImages } from '@/lib/store/extract-images';

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    deliveredOrders: 0
  });

  // State arrays
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'confirmed' | 'received' | 'cancelled'>('confirmed');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    id: '',
    name: '',
    phone: '',
    city: '',
    address: ''
  });
  const [submittingAddress, setSubmittingAddress] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Recently Viewed Products
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Order Cancellation Dialog State
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  const supabase = createSupabaseBrowserClient();
  const { addToCart } = useCart();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?next=/customer/dashboard';
        return;
      }
      setUserAuth(user);

      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const loadedProfile = profileData || { full_name: user.email?.split('@')[0], email: user.email };
      setProfile(loadedProfile);
      setProfileForm({
        full_name: loadedProfile.full_name || '',
        phone: loadedProfile.phone || '',
        avatar_url: loadedProfile.avatar_url || ''
      });

      // 2. Fetch orders, then eagerly fetch order_items & products separately to join in-memory.
      // (This bypasses the missing foreign key constraint between order_items & products in Postgres).
      const [ordersRes, requestsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('order_requests')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false })
      ]);

      if (ordersRes.error) throw ordersRes.error;
      const ordersData = ordersRes.data || [];
      const requestsData = requestsRes.data || [];

      let enrichedOrders: any[] = [];

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        
        // Fetch order items
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('id, order_id, product_id, quantity, price, unit_price')
          .in('order_id', orderIds);

        if (!itemsErr && itemsData) {
          const productIds = [...new Set(itemsData.map(i => i.product_id).filter(Boolean))];
          
          let productsById = new Map<any, any>();
          if (productIds.length > 0) {
            const { data: prodData, error: prodErr } = await supabase
              .from('products')
              .select('id, name, price, compare_price, product_images(url,sort_order)')
              .in('id', productIds);

            if (!prodErr && prodData) {
              productsById = new Map(prodData.map(p => [p.id, p]));
            }
          }

          // Group items by order_id
          const itemsByOrder = new Map<any, any[]>();
          for (const item of itemsData) {
            const product = productsById.get(item.product_id) || null;
            const enrichedItem = {
              ...item,
              products: product
            };
            
            const list = itemsByOrder.get(item.order_id) || [];
            list.push(enrichedItem);
            itemsByOrder.set(item.order_id, list);
          }

          enrichedOrders = ordersData.map(o => ({
            ...o,
            amount: Number(o.total ?? o.total_price ?? o.amount ?? 0),
            order_items: itemsByOrder.get(o.id) || [],
            is_request: false
          }));
        } else {
          enrichedOrders = ordersData.map(o => ({
            ...o,
            amount: Number(o.total ?? o.total_price ?? o.amount ?? 0),
            order_items: [],
            is_request: false
          }));
        }
      }

      // Merge order requests into enrichedOrders
      const enrichedRequests = requestsData.map(r => {
        const items = r.customer_info?.items?.map((item: any, idx: number) => ({
          id: `req-item-${r.id}-${idx}`,
          order_id: r.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price || item.unit_price,
          unit_price: item.price || item.unit_price,
          products: {
            id: item.product_id,
            name: item.name,
            price: item.price || item.unit_price,
            compare_price: item.compare_price || null,
            images: item.images || null
          }
        })) || [{
          id: `req-item-${r.id}-default`,
          order_id: r.id,
          product_id: r.product_id,
          quantity: r.quantity,
          price: r.final_total_price / r.quantity,
          unit_price: r.final_total_price / r.quantity,
          products: {
            id: r.product_id,
            name: r.product_name,
            price: r.final_total_price / r.quantity,
            compare_price: null,
            images: null
          }
        }];

        return {
          id: r.id,
          created_at: r.created_at,
          user_id: r.user_id,
          amount: Number(r.final_total_price),
          status: r.status === 'pending' ? 'pending_approval' : r.status,
          customer_name: r.customer_info?.name || '',
          customer_email: r.customer_info?.email || '',
          customer_phone: r.customer_info?.phone || '',
          customer_address: r.customer_info?.address || '',
          delivery_charge: r.customer_info?.delivery_charge || 0,
          delivery_type: r.customer_info?.delivery_type || '',
          payment_status: 'pending',
          payment_method: 'cod',
          order_items: items,
          is_request: true
        };
      });

      const combinedOrders = [...enrichedOrders, ...enrichedRequests];
      // Sort combined by created_at desc
      combinedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(combinedOrders);

      // Calculate Stats
      const totalOrders = combinedOrders.length;
      const totalSpent = combinedOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.amount, 0);
      const pendingOrders = combinedOrders.filter(o => 
        ['pending', 'pending_approval', 'processing', 'shipped'].includes(o.status)
      ).length;
      const deliveredOrders = combinedOrders.filter(o => o.status === 'delivered').length;

      setStats({
        totalOrders,
        totalSpent,
        pendingOrders,
        deliveredOrders
      });

      // 3. Fetch wishlist with product details (using compare_price instead of non-existent offer_price)
      const { data: wishlistData, error: wishlistErr } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products (
            id,
            name,
            price,
            compare_price,
            slug,
            stock,
            product_images(url,sort_order)
          )
        `)
        .eq('user_id', user.id);

      if (!wishlistErr && wishlistData) {
        setWishlist(wishlistData.filter(item => item.products));
      }

      // 4.5 Fetch recently viewed products
      try {
        const stored = localStorage.getItem('recently_viewed');
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          if (ids.length > 0) {
            const { data: recentData } = await supabase
              .from('products')
              .select('id, name, price, compare_price, slug, stock, product_images(url,sort_order)')
              .in('id', ids.slice(0, 8));
            if (recentData) {
              // Sort by the order in localStorage
              const ordered = ids
                .map(id => recentData.find(p => String(p.id) === id))
                .filter(Boolean)
                .slice(0, 6);
              setRecentlyViewed(ordered);
            }
          }
        }
      } catch (e) {
        // localStorage not available
      }

      // 4. Fetch addresses
      const { data: addressesData, error: addressesErr } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (!addressesErr && addressesData) {
        setAddresses(addressesData);
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription setup - Fixed to prevent cached callback errors
  useEffect(() => {
    fetchData();

    let channel: any;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unique channel name with random component to prevent post-subscription errors
      const channelName = `customer-orders-${user.id}-${Math.floor(Math.random() * 1000000)}`;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_requests',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchData();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Filter orders by active status tab
  const getFilteredOrders = () => {
    if (activeTab === 'confirmed') {
      return orders.filter(o => ['pending', 'pending_approval', 'processing', 'shipped'].includes(o.status));
    }
    if (activeTab === 'received') {
      return orders.filter(o => o.status === 'delivered');
    }
    if (activeTab === 'cancelled') {
      return orders.filter(o => ['cancelled', 'rejected', 'returned'].includes(o.status));
    }
    return [];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-800 border-amber-200/50',
      pending_approval: 'bg-amber-50 text-amber-800 border-amber-200/50',
      processing: 'bg-blue-50 text-blue-800 border-blue-200/50',
      shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200/50',
      delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200/50',
      cancelled: 'bg-rose-50 text-rose-800 border-rose-200/50',
      rejected: 'bg-rose-50 text-rose-800 border-rose-200/50',
      returned: 'bg-slate-100 text-slate-800 border-slate-300/50'
    };

    const displayText = status === 'pending_approval' ? 'pending approval' : status;

    return (
      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border tracking-wide uppercase ${styles[status] || 'bg-slate-50 text-slate-700'}`}>
        {displayText}
      </span>
    );
  };

  // Order Cancellation handler
  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    setCancellingOrder(true);
    try {
      await cancelOrderAction(orderToCancel.id, undefined, 'customer');
      toast.success(`Order #${String(orderToCancel.id).slice(0, 8).toUpperCase()} cancelled successfully`);
      setOrderToCancel(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Wishlist actions
  const handleRemoveWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      toast.success('Removed from wishlist');
      setWishlist(prev => prev.filter(item => item.id !== wishlistId));
    } catch (err: any) {
      toast.error('Failed to remove item.');
    }
  };

  const handleAddWishlistToCart = (item: any) => {
    const product = item.products;
    if (!product) return;

    const hasOffer = !!product.compare_price && Number(product.compare_price) > Number(product.price);

    // Map database product row to Product context type
    const productImages = extractProductImages((product as any).product_images);
    const productToAdd = {
      id: String(product.id),
      name: product.name,
      price: hasOffer ? Number(product.compare_price) : Number(product.price),
      discountPrice: hasOffer ? Number(product.price) : undefined,
      images: productImages.length > 0 ? productImages : ['/images/about.jpg'],
      stock: product.stock ?? 10,
      category: 'General'
    };

    addToCart(productToAdd as any, 1);
  };

  // Address CRUD Handlers
  const openAddressModal = (addr: any = null) => {
    if (addr) {
      setAddressForm({
        id: addr.id,
        name: addr.name || '',
        phone: addr.phone || '',
        city: addr.city || '',
        address: addr.address || ''
      });
    } else {
      setAddressForm({
        id: '',
        name: '',
        phone: '',
        city: '',
        address: ''
      });
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAuth) return;
    setSubmittingAddress(true);

    const payload = {
      name: addressForm.name.trim(),
      phone: addressForm.phone.trim(),
      city: addressForm.city.trim(),
      address: addressForm.address.trim(),
      user_id: userAuth.id,
      is_default: addresses.length === 0
    };

    try {
      if (addressForm.id) {
        // Edit existing
        const { error } = await supabase
          .from('addresses')
          .update(payload)
          .eq('id', addressForm.id)
          .eq('user_id', userAuth.id);
        if (error) throw error;
        toast.success('Address updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('addresses')
          .insert([payload]);
        if (error) throw error;
        toast.success('New address added');
      }
      setIsAddressModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address.');
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userAuth.id);
      if (error) throw error;
      toast.success('Address deleted');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to delete address.');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      // 1. Reset all addresses to not default
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userAuth.id);

      // 2. Set chosen address as default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', userAuth.id);

      if (error) throw error;
      toast.success('Default address updated');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to update default address.');
    }
  };

  // Profile actions
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userAuth) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userAuth.id}-${Math.floor(Math.random() * 100000)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      // Update local form state
      setProfileForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success('Avatar uploaded! Click Save Changes below to apply.');
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAuth) return;
    setUpdatingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          avatar_url: profileForm.avatar_url
        })
        .eq('id', userAuth.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-4 md:p-8">
        <div className="h-44 bg-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-28 bg-slate-200/80 rounded-2xl" />
          <div className="h-28 bg-slate-200/80 rounded-2xl" />
          <div className="h-28 bg-slate-200/80 rounded-2xl" />
          <div className="h-28 bg-slate-200/80 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-200/80 rounded-3xl" />
      </div>
    );
  }

  const joinDate = profile?.created_at || userAuth?.created_at;
  const formattedJoinDate = joinDate 
    ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20 p-2 md:p-4 text-slate-800">
      
      {/* 1. Header Profile Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#1b4332]/5 bg-gradient-to-tr from-[#1B4332] via-[#24543d] to-[#2D6A4F] p-6 md:p-10 text-white">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
            <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl font-semibold shadow-2xl overflow-hidden shrink-0 group relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                (profile?.full_name?.[0] || userAuth?.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            
            <div className="space-y-2 mt-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profile?.full_name || 'Valued Customer'}</h1>
                <span className="flex items-center gap-1 px-3 py-0.5 bg-emerald-400/25 border border-emerald-300/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> {profile?.role || 'Customer'}
                </span>
              </div>
              <p className="text-white/80 text-sm font-medium">{profile?.email || userAuth?.email}</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/70 text-xs mt-3 bg-black/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl w-fit">
                <Calendar className="w-4 h-4 text-emerald-300" />
                <span>Member Since: <strong className="text-white">{formattedJoinDate}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center lg:justify-end gap-3.5 border-t border-white/15 lg:border-none pt-6 lg:pt-0">
            <a href="#profile-section" className="px-5 py-3 bg-white text-[#1B4332] hover:bg-slate-100 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md flex items-center gap-2">
              <User className="w-4 h-4" /> Manage Account
            </a>
            <Link href="/products" className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Browse Store
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center shrink-0 shadow-inner">
            <ShoppingBag className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Orders</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <CreditCard className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Spent</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">৳{stats.totalSpent.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-inner">
            <Clock className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{stats.pendingOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivered</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{stats.deliveredOrders}</p>
          </div>
        </div>
      </div>

      {/* 3. My Orders & Tab Navigation */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Orders Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PackageOpen className="h-6 w-6 text-[#1B4332]" />
              My Orders
            </h2>
            <p className="text-xs text-slate-400 font-medium">Dynamically track, expand, and manage your custom purchases.</p>
          </div>

          {/* Status Tabs */}
          <div className="flex border border-slate-100 p-1 bg-slate-50/50 rounded-2xl w-fit">
            {[
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'received', label: 'Received' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setExpandedOrderId(null);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-[#1B4332] shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {getFilteredOrders().length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No orders found</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                There are no orders inside the <strong className="capitalize text-[#1B4332]">{activeTab}</strong> tab at the moment.
              </p>
              <Link href="/products" className="inline-flex mt-6 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#1B4332] hover:bg-slate-100 transition-colors uppercase tracking-wider">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {getFilteredOrders().map(order => {
                const isExpanded = expandedOrderId === String(order.id);
                const itemsList = order.order_items || [];
                const firstItem = itemsList[0] || {};
                const firstProduct = firstItem.products || {};
                const imageCover = Array.isArray(firstProduct.images) && firstProduct.images.length > 0 
                  ? firstProduct.images[0] 
                  : null;

                const itemsCount = itemsList.length;

                return (
                  <div key={order.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isExpanded 
                      ? 'border-[#1b4332]/25 shadow-md shadow-slate-100/50 bg-[#fafdfb]/30' 
                      : 'border-slate-100 shadow-sm hover:border-slate-200'
                  }`}>
                    {/* Order summary bar */}
                    <div 
                      onClick={() => setExpandedOrderId(isExpanded ? null : String(order.id))}
                      className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-16 w-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-[#1B4332]">
                          {imageCover ? (
                            <img src={imageCover} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-6 h-6 opacity-40" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-xs text-slate-400 tracking-wider">ORDER ID: #{String(order.id).slice(0, 10).toUpperCase()}</p>
                          <h4 className="font-bold text-sm text-slate-800 truncate">
                            {firstProduct.name || 'Custom Order Item'}
                            {itemsCount > 1 && <span className="text-xs text-slate-400 font-medium ml-1"> (+{itemsCount - 1} more items)</span>}
                          </h4>
                          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 border-t border-slate-50 md:border-none pt-4 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Price</p>
                          <p className="font-bold text-[#1B4332]">৳{order.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.status)}
                          <div className={`p-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180 text-[#1B4332]' : ''
                          }`}>
                            <ArrowRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order expanded detailed body */}
                    {isExpanded && (
                      <div className="px-5 pb-6 pt-2 border-t border-slate-100/50 space-y-6">
                        {/* Nested Items checklist */}
                        <div>
                          <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3.5">Ordered Artifacts</h5>
                          <div className="space-y-3">
                            {itemsList.map((item: any) => {
                              const prod = item.products || {};
                              const img = Array.isArray(prod.images) && prod.images.length > 0 
                                ? prod.images[0] 
                                : null;

                              return (
                                <div key={item.id} className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="h-11 w-11 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                                    {img ? (
                                      <img src={img} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <ShoppingBag className="w-5 h-5 opacity-40" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h6 className="text-xs font-bold text-slate-800 truncate">{prod.name || 'Premium Item'}</h6>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quantity: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-slate-900">৳{Number(item.price ?? item.unit_price ?? 0).toLocaleString()}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order Address & Receipt Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="bg-white p-5 rounded-xl border border-slate-100/60 shadow-inner-sm">
                            <h6 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Address
                            </h6>
                            <div className="text-xs font-semibold text-slate-600 space-y-1">
                              {order.customer_name && <p className="font-bold text-slate-800">{order.customer_name}</p>}
                              {order.customer_address ? (
                                <p className="leading-relaxed">{order.customer_address}</p>
                              ) : order.shipping_address ? (
                                typeof order.shipping_address === 'string' ? (
                                  <p className="leading-relaxed">{order.shipping_address}</p>
                                ) : (
                                  <p className="leading-relaxed">
                                    {order.shipping_address.street || order.shipping_address.address_line || ''}<br/>
                                    {order.shipping_address.city || ''}
                                  </p>
                                )
                              ) : (
                                <p className="text-slate-400 italic font-normal">No physical delivery waypoint captured.</p>
                              )}
                              {order.customer_phone && <p className="text-[10px] text-slate-400 font-bold mt-2">Phone: {order.customer_phone}</p>}
                            </div>
                          </div>

                          <div className="bg-white p-5 rounded-xl border border-slate-100/60 shadow-inner-sm space-y-3.5">
                            <h6 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Financial Breakdown</h6>
                            <div className="space-y-2 text-xs font-semibold text-slate-500">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="text-slate-800">৳{Number(order.amount - (order.delivery_charge ?? 0)).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Delivery Fee</span>
                                <span className="text-slate-800">৳{Number(order.delivery_charge ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Payment Status</span>
                                <span className="uppercase text-[9px] bg-slate-50 px-2 py-0.5 border border-slate-100 text-slate-600 font-bold rounded">
                                  {order.payment_status || 'Unpaid'}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-2.5 text-sm mt-1">
                                <span>Total Sum</span>
                                <span className="text-[#1B4332]">৳{order.amount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cancellations action trigger */}
                        {['pending', 'processing'].includes(order.status) && (
                          <div className="flex justify-end pt-3 border-t border-slate-100/40">
                            <button
                              onClick={() => setOrderToCancel(order)}
                              className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <X className="w-4 h-4" /> Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Wishlist Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            My Wishlist
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Keep track of your favorite premium designs and add them to cart seamlessly.</p>
        </div>

        {wishlist.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-100 rounded-2xl text-center max-w-sm mx-auto">
            <div className="h-12 w-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-300">
              <Heart className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Your wishlist is currently empty.</p>
            <Link href="/products" className="inline-block mt-3 text-xs font-bold text-[#1B4332] hover:underline uppercase tracking-wider">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map(item => {
              const product = item.products;
              const hasOffer = !!product.compare_price && Number(product.compare_price) > Number(product.price);
              const displayPrice = product.price;
              const productImgs = extractProductImages((product as any).product_images);
              const img = productImgs[0] || null;

              return (
                <div key={item.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-200 transition-all duration-300">
                  <div className="relative aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden shrink-0">
                    {img ? (
                      <img src={img} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-10 h-10 opacity-30" />
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveWishlist(item.id)}
                      className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 backdrop-blur-md rounded-full shadow border border-black/5 transition-all"
                      title="Remove from wishlist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#1B4332] transition-colors">{product.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#1B4332]">৳{Number(displayPrice).toLocaleString()}</span>
                        {hasOffer && (
                          <span className="text-[10px] text-slate-400 line-through font-semibold">৳{Number(product.compare_price).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddWishlistToCart(item)}
                      className="w-full py-2 bg-[#E6F0EB] hover:bg-[#1B4332] text-[#1B4332] hover:text-white border border-[#1b4332]/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add To Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-600" />
              Recently Viewed
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Products you've checked out recently.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentlyViewed.map((product: any) => {
              const hasOffer = !!product.compare_price && Number(product.compare_price) > Number(product.price);
              const productImgs = extractProductImages(product.product_images);
              const img = productImgs[0] || null;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-300"
                >
                  <div className="relative aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden">
                    {img ? (
                      <img src={img} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-8 h-8 opacity-30" />
                      </div>
                    )}
                    {hasOffer && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-md">
                        -{Math.round((1 - Number(product.price) / Number(product.compare_price)) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#1B4332] transition-colors">{product.name}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-[#1B4332]">৳{Number(product.price).toLocaleString()}</span>
                      {hasOffer && (
                        <span className="text-[9px] text-slate-400 line-through font-semibold">৳{Number(product.compare_price).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Address Management */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-emerald-700" />
              Delivery Waypoints
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Save and edit shipping locations to make your checkout frictionless.</p>
          </div>
          
          <button
            onClick={() => openAddressModal()}
            className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl shadow transition-all uppercase tracking-wider flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-100 rounded-2xl text-center max-w-sm mx-auto">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No saved addresses found.</p>
            <p className="text-[10px] text-slate-400 mt-1">Add your shipping destination above to enable one-click purchases.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map(addr => (
              <div 
                key={addr.id} 
                className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                  addr.is_default 
                    ? 'border-[#1b4332]/35 bg-[#fafdfb]/50 shadow shadow-emerald-50' 
                    : 'border-slate-100 shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-800 truncate">{addr.name}</h4>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0">
                        <Star className="w-2.5 h-2.5 fill-emerald-800" /> Default
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{addr.phone}</p>
                  
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    <strong className="text-[#1B4332] font-extrabold">{addr.city}</strong> · {addr.address}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddressModal(addr)}
                      className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100"
                      title="Edit address"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors border border-slate-100"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-950 uppercase tracking-wider hover:underline"
                    >
                      Set As Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Profile & Security Updates Section */}
      <div id="profile-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Profile Card settings */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="h-6 w-6 text-[#1B4332]" />
              Account Settings
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Keep your contact coordinates and profile representation up to date.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            
            {/* Avatar upload workflow */}
            <div className="flex items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 w-fit">
              <div className="relative h-20 w-20 rounded-xl bg-white overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center text-slate-300">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-9 w-9" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Representative Image</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingAvatar}
                  />
                  <button
                    type="button"
                    className="px-4 py-2 border border-slate-200 hover:bg-white bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Avatar
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={profileForm.full_name} 
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none font-semibold text-xs text-slate-700 bg-slate-50 focus:bg-white focus:border-[#1B4332] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phone</label>
                <input 
                  type="tel" 
                  value={profileForm.phone} 
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} 
                  placeholder="No phone saved"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none font-semibold text-xs text-slate-700 bg-slate-50 focus:bg-white focus:border-[#1B4332] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Locked Email Address</label>
              <input 
                disabled 
                type="email" 
                value={profile?.email || userAuth?.email} 
                className="w-full border border-slate-100 rounded-xl p-3 text-xs font-semibold text-slate-400 bg-slate-50/50 cursor-not-allowed border-dashed"
              />
            </div>

            <button 
              type="submit" 
              disabled={updatingProfile} 
              className="px-6 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl shadow transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              {updatingProfile ? 'Saving Changes...' : <><CheckCircle2 className="w-4 h-4" /> Save Profile</>}
            </button>
          </form>
        </div>

        {/* Security Password management */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Lock className="h-6 w-6 text-[#1B4332]" />
              Security Settings
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Keep your vault credentials refreshed to secure order history.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-2 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Secure Password</label>
              <input 
                required
                type={showPassword ? 'text' : 'password'} 
                value={passwordForm.newPassword} 
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="At least 6 characters"
                className="w-full border border-slate-200 rounded-xl p-3 outline-none font-semibold text-xs text-slate-700 bg-slate-50 focus:bg-white focus:border-[#1B4332] transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 bottom-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
              <input 
                required
                type={showPassword ? 'text' : 'password'} 
                value={passwordForm.confirmPassword} 
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl p-3 outline-none font-semibold text-xs text-slate-700 bg-slate-50 focus:bg-white focus:border-[#1B4332] transition-colors"
              />
            </div>

            <button 
              type="submit" 
              disabled={updatingPassword} 
              className="px-6 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl shadow transition-all uppercase tracking-wider flex items-center gap-1.5 w-full justify-center"
            >
              {updatingPassword ? 'Updating Password...' : <><Lock className="w-4 h-4" /> Reset Password</>}
            </button>
          </form>
        </div>
      </div>

      {/* Address Form Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddressModalOpen(false)} />
          
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full relative overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                {addressForm.id ? 'Refine Shipping Destination' : 'Anchor New Waypoint'}
              </h3>
              <button 
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={addressForm.name} 
                  onChange={e => setAddressForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-xs text-slate-700 focus:border-[#1B4332] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</label>
                <input 
                  required 
                  type="tel" 
                  value={addressForm.phone} 
                  onChange={e => setAddressForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-xs text-slate-700 focus:border-[#1B4332] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">City / Region</label>
                <input 
                  required 
                  type="text" 
                  value={addressForm.city} 
                  onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Dhaka, Chittagong"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-xs text-slate-700 focus:border-[#1B4332] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street Address & Details</label>
                <textarea 
                  required 
                  rows={3}
                  value={addressForm.address} 
                  onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Apartment, building details, street description"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-xs text-slate-700 focus:border-[#1B4332] transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAddress}
                  className="flex-1 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
                >
                  {submittingAddress ? 'Saving...' : 'Save Waypoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Cancellation Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOrderToCancel(null)} />
          
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full relative overflow-hidden z-10 animate-in fade-in zoom-in duration-200 p-6 space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Cancel Purchase?</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ORDER #{String(orderToCancel.id).slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to cancel this order? This action is permanent, and funds will be processed back in accordance with our return guidelines.
            </p>

            <div className="flex gap-3 border-t border-slate-50 pt-4">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
              >
                No, Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancellingOrder}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow shadow-rose-200"
              >
                {cancellingOrder ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
