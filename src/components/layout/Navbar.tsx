import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, User, Search, Menu, X, Heart, MessageCircle, ArrowRight, Home, Info, Phone } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { IoLogoWhatsapp } from "react-icons/io";
import toast from 'react-hot-toast';

interface NavbarProps {
  onOpenCart: () => void;
  isCartOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart, isCartOpen = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const lastScrollY = useRef(0);
  const { itemCount } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Scroll logic for background and hide/show behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Update background state
      setIsScrolled(currentScrollY > 50);

      // Mobile: Hide on scroll down, show on scroll up
      if (window.innerWidth < 1024) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setIsVisible(false); // Scrolling down
        } else {
          setIsVisible(true); // Scrolling up
        }
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync scroll lock when search or mobile menu is open
  useEffect(() => {
    if (isSearchOpen || isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSearchOpen, isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchValue.trim())}`);
      setIsSearchOpen(false);
      setSearchValue('');
    }
  };

  const isTransparentPage = pathname === '/' || pathname === '/about';

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const mobileBottomLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/products', icon: ShoppingCart },
    { name: 'About', path: '/about', icon: Info },
    { name: 'WhatsApp', path: 'https://wa.me/yournumber', icon: IoLogoWhatsapp, external: true },
    { name: 'Contact', path: '/contact', icon: Phone },
  ];

  const categories = ["Wall Art", "Sculptures", "Handmade Decor", "Wood Supplies", "Limited Editions", "Heritage Collection"];

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.refresh();
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      toast.error(message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out',
          // Hide logic: hide if scrolled down on mobile OR if cart is open
          (!isVisible || isCartOpen) && !isMobileMenuOpen ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100',
          // Scrolled vs Transparent logic
          (isScrolled || !isTransparentPage)
            ? 'bg-white/80 backdrop-blur-md border-b border-black/5 py-3'
            : 'bg-transparent py-5'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between relative">
          {/* Left: Desktop Links */}
          <div className="hidden lg:flex items-center gap-8 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={cn(
                  "text-[13px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:text-accent-light",
                  (isScrolled || !isTransparentPage) ? "text-slate-800" : "text-white drop-shadow-sm"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Left: Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center flex-1">
            <button
              className={cn(
                "p-2 transition-colors",
                (isScrolled || !isTransparentPage) ? "text-slate-800" : "text-white"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center items-center">
            <Link href="/" className="relative block group">
              <div className="relative h-15 md:h-20 w-[140px] md:w-[160px] px-2 flex items-center justify-center">
                <Image
                  src="/images/horof.svg"
                  alt="Horof Logo"
                  fill
                  priority
                  className={cn(
                    "object-contain transition-all duration-500",
                    (isScrolled || !isTransparentPage)
                      ? "brightness-0 saturate-0 opacity-100"
                      : "brightness-0 invert saturate-0 opacity-100 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]"
                  )}
                />
              </div>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 md:gap-5 flex-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "p-2 transition-all hover:scale-110",
                (isScrolled || !isTransparentPage) ? "text-slate-600" : "text-white/90 hover:text-white"
              )}
            >
              <Search size={20} />
            </button>

            <button
              onClick={onOpenCart}
              className={cn(
                "p-2 relative transition-all hover:scale-110",
                (isScrolled || !isTransparentPage) ? "text-slate-600" : "text-white/90 hover:text-white"
              )}
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            <div className={cn(
              "hidden md:block h-5 w-[1px]",
              (isScrolled || !isTransparentPage) ? "bg-slate-200" : "bg-white/20"
            )} />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/orders"
                  className={cn(
                    "hidden sm:flex h-9 w-9 rounded-full items-center justify-center transition-all",
                    (isScrolled || !isTransparentPage) ? "bg-slate-100 text-slate-800" : "bg-white/10 text-white backdrop-blur-sm"
                  )}
                >
                  <User size={18} />
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={cn(
                    "hidden sm:block text-[11px] uppercase font-bold tracking-widest px-4 py-2 rounded-full transition-all",
                    (isScrolled || !isTransparentPage) ? "text-slate-600 hover:text-red-500" : "text-white/80 hover:text-white bg-white/10"
                  )}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button
                  size="sm"
                  variant={(isScrolled || !isTransparentPage) ? "primary" : "secondary"}
                  className={cn(
                    "h-9 px-5 rounded-full text-[11px] uppercase font-bold tracking-widest",
                    (!isScrolled && isTransparentPage) && "bg-white text-slate-900 hover:bg-slate-100 border-none"
                  )}
                >
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Global Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/98 backdrop-blur-2xl z-[200] flex items-center justify-center p-6"
          >
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-black rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Search Products</span>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-black hover:text-white rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSearch} className="relative group">
                <input
                  autoFocus
                  type="text"
                  placeholder="What are you looking for?"
                  className="w-full text-3xl md:text-5xl font-light bg-transparent border-b border-slate-200 pb-6 outline-none focus:border-black transition-colors"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-slate-400 group-focus-within:text-black">
                  <Search size={32} />
                </button>
              </form>

              <div className="mt-10 flex flex-wrap gap-3">
                {["Heritage", "Limited Edition", "Wall Art", "Woodcraft"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchValue(tag);
                      router.push(`/products?search=${tag}`);
                      setIsSearchOpen(false);
                    }}
                    className="text-[10px] font-bold px-5 py-2.5 bg-slate-50 rounded-full hover:bg-black hover:text-white transition-all uppercase tracking-widest border border-slate-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white p-8 pt-24 shadow-2xl overflow-y-auto"
            >
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-8 right-8 p-2 rounded-full bg-slate-50 text-slate-400 hover:text-black"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Collections</p>
                  <div className="grid grid-cols-1 gap-4">
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        href={`/products?category=${encodeURIComponent(cat)}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-2xl font-medium tracking-tight text-slate-800 hover:text-slate-500 transition-colors flex items-center justify-between"
                      >
                        {cat} <ArrowRight size={18} className="opacity-20" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  {!isAuthenticated && (
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full h-12 rounded-xl bg-[#1A3320] text-white hover:bg-[#1A3320]/90 text-sm font-bold tracking-[0.2em] uppercase">
                        Login / Register
                      </Button>
                    </Link>
                  )}
                  {isAuthenticated && (
                    <div className="space-y-4">
                      <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full h-12 rounded-xl border border-[#1A3320] text-[#1A3320] hover:bg-slate-50 text-sm font-bold tracking-[0.2em] uppercase">
                          View My Orders
                        </Button>
                      </Link>
                      <Button 
                        onClick={async () => {
                          await handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        disabled={isLoggingOut}
                        className="w-full h-12 rounded-xl border border-red-500 text-red-500 hover:bg-red-50 text-sm font-bold tracking-[0.2em] uppercase"
                      >
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-[120] lg:hidden px-4 pb-6 transition-all duration-500",
        (isMobileMenuOpen || isCartOpen || !isVisible) ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="max-w-md mx-auto bg-[#1A3320] backdrop-blur-xl border border-white/10 rounded-full h-16 flex items-center justify-around px-2 shadow-2xl shadow-black/40">
          {mobileBottomLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.name}
                href={link.path}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 transition-all",
                  isActive ? "text-white" : "text-white/50 hover:text-white"
                )}
              >
                <Icon size={22} className={cn(isActive && "stroke-[2.5px]")} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

