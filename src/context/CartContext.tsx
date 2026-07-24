'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Product, CartItem } from '../lib/types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const cartRef = useRef<CartItem[]>([]);
  const pendingToastRef = useRef<
    | { type: 'added' | 'updated' | 'removed'; productName: string }
    | null
  >(null);

  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // load cart after mount
  useEffect(() => {
    const savedCart = localStorage.getItem('forestcraft_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  // Sync Supabase cart to state on login / load
  useEffect(() => {
    if (!isLoaded) return;

    const syncDBCart = async () => {
      if (!user) return;

      // Guard: ensure user.id is a valid UUID before querying.
      // If user.id is undefined or not a valid UUID string, Supabase will
      // throw a postgres error that logs as an empty object {}.
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!user.id || !UUID_REGEX.test(user.id)) {
        console.warn('[CartContext] Skipping DB cart sync: user.id is not a valid UUID:', user.id);
        return;
      }

      try {
        // Fetch cart items IDs and quantities from Supabase (separate queries to avoid FK join issues)
        const { data: cartRows, error: cartError } = await supabase
          .from('cart_items')
          .select('product_id, quantity')
          .eq('user_id', user.id);

        if (cartError) {
          const msg = cartError?.message || cartError?.error_description || cartError?.code || 'cart_items table may not exist';
          console.warn('[CartContext] Could not fetch cart from DB:', msg);
          return;
        }

        if (cartRows && cartRows.length > 0) {
          // Aggregate quantities for duplicate product_ids
          const qtyMap = new Map<string, number>();
          cartRows.forEach(r => {
            const pid = String(r.product_id);
            qtyMap.set(pid, (qtyMap.get(pid) || 0) + r.quantity);
          });

          const uniqueIds = [...qtyMap.keys()].filter(id => id != null && !isNaN(Number(id)));

          const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, description, price, compare_price, stock, perfect_for')
            .in('id', uniqueIds) as unknown as { data: any[] | null; error: any };

          if (prodError) {
            console.warn('[CartContext] Could not fetch product details:', prodError?.message || prodError);
            return;
          }

          const productMap = new Map((products || []).map(p => [String(p.id), p]));

          const dbCart: CartItem[] = [...qtyMap.entries()].map(([productId, qty]) => {
            const prod = productMap.get(productId);
            if (!prod) return null;

            return {
              id: String(productId),
              name: prod.name || 'Unknown Product',
              description: prod.description || '',
              price: Number(prod.price),
              discountPrice: prod.compare_price ? Number(prod.compare_price) : undefined,
              images: ['/images/about.jpg'],
              category: 'General',
              rating: 0,
              reviewCount: 0,
              stock: prod.stock || 0,
              tags: prod.perfect_for || [],
              quantity: qty
            };
          }).filter(Boolean) as CartItem[];

          // Merge local cart with database cart
          setCart((prevCart) => {
            const merged = [...dbCart];
            prevCart.forEach((localItem) => {
              const exists = merged.find((item) => item.id === localItem.id);
              if (!exists) {
                merged.push(localItem);
                supabase.from('cart_items').insert({
                  user_id: user.id,
                  product_id: Number(localItem.id),
                  quantity: localItem.quantity
                }).then(({ error: err }) => {
                  if (err) console.warn('[CartContext] Error syncing local item to DB:', err?.message || err);
                });
              } else if (exists.quantity < localItem.quantity) {
                exists.quantity = localItem.quantity;
                supabase.from('cart_items').update({ quantity: localItem.quantity })
                  .eq('user_id', user.id)
                  .eq('product_id', Number(localItem.id))
                  .then(({ error: err }) => {
                    if (err) console.warn('[CartContext] Error updating DB quantity:', err?.message || err);
                  });
              }
            });
            return merged;
          });
        } else {
          setCart((prevCart) => {
            if (prevCart.length > 0) {
              const itemsToSync = prevCart.map(item => ({
                user_id: user.id,
                product_id: Number(item.id),
                quantity: item.quantity
              }));
              supabase.from('cart_items').insert(itemsToSync).then(({ error: err }) => {
                if (err) console.warn('[CartContext] Error syncing local cart to DB:', err?.message || err);
              });
            }
            return prevCart;
          });
        }
      } catch (err: any) {
        console.warn('[CartContext] Failed to sync DB cart:', err?.message || err);
      }
    };

    syncDBCart();
  }, [user, isLoaded, supabase]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('forestcraft_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Run user-facing notifications after state commits (never during render/state updaters).
  useEffect(() => {
    const pending = pendingToastRef.current;
    if (!pending) return;

    pendingToastRef.current = null;

    if (pending.type === 'removed') {
      toast.error(`Removed ${pending.productName} from cart`);
      return;
    }

    toast.success(
      pending.type === 'updated'
        ? `Updated ${pending.productName} quantity`
        : `Added ${pending.productName} to cart`
    );
  }, [cart]);

  const addToCart = (product: Product, quantity = 1) => {
    const snapshot = cartRef.current;
    const exists = snapshot.some((item) => item.id === product.id);

    pendingToastRef.current = {
      type: exists ? 'updated' : 'added',
      productName: product.name,
    };

    // Analytics tracking
    try {
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'AddToCart', {
            content_name: product.name,
            content_ids: [product.id],
            content_type: 'product',
            value: product.discountPrice || product.price,
            currency: 'BDT',
          });
        }
        if ((window as any).gtag) {
          (window as any).gtag('event', 'add_to_cart', {
            currency: 'BDT',
            value: (product.discountPrice || product.price) * quantity,
            items: [{ item_id: product.id, item_name: product.name, quantity }],
          });
        }
      }
    } catch (_) {}

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (user) {
          supabase
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('user_id', user.id)
            .eq('product_id', parseInt(product.id))
            .then(({ error }) => {
              if (error) console.error('Error updating cart quantity in Supabase:', error);
            });
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }

      if (user) {
        supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: parseInt(product.id),
            quantity
          })
          .then(({ error }) => {
            if (error) console.error('Error adding to cart in Supabase:', error);
          });
      }
      return [...prevCart, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    const snapshot = cartRef.current;
    const itemToRemove = snapshot.find((item) => item.id === productId);

    if (itemToRemove) {
      pendingToastRef.current = { type: 'removed', productName: itemToRemove.name };
    }

    if (user) {
      supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', parseInt(productId))
        .then(({ error }) => {
          if (error) console.error('Error removing from cart in Supabase:', error);
        });
    }

    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;

    if (user) {
      supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', parseInt(productId))
        .then(({ error }) => {
          if (error) console.error('Error updating quantity in Supabase:', error);
        });
    }

    setCart(prevCart =>
      prevCart.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    if (user) {
      supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error clearing cart in Supabase:', error);
        });
    }
    setCart([]);
  };

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + (item.discountPrice || item.price) * item.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(() => cart.reduce((count, item) => count + item.quantity, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
