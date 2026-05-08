'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Product, CartItem } from '../lib/types';
import toast from 'react-hot-toast';

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

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
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

    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
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
