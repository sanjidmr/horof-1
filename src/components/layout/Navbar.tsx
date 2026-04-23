import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, User, Search, Menu, X, Heart, TreePine, Home, Info, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { IoLogoWhatsapp } from "react-icons/io";

interface NavbarProps {
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { itemCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // Hide navbar on mobile scroll down, show on up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Search toggle with body scroll lock
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

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'WhatsApp', path: 'https://wa.me/yournumber', external: true, icon: MessageCircle },
  ];

  // Mobile Bottom Tab Links
  const mobileBottomLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/products', icon: ShoppingCart },
    { name: 'About', path: '/about', icon: Info },
    { name: 'WhatsApp', path: 'https://wa.me/yournumber', icon: IoLogoWhatsapp, external: true },
    { name: 'Contact', path: '/contact', icon: Phone },
  ];

  // Mock Categories for Sidebar
  const categories = [
    "Wall Art",
    "Sculptures",
    "Handmade Decor",
    "Wood Supplies",
    "Limited Editions",
    "Heritage Collection"
  ];

  const isTransparentPage = pathname === '/' || pathname === '/about';

  const scrollToTop = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4',
        !isVisible && !isMobileMenuOpen && '-translate-y-full opacity-0',
        (isScrolled || !isTransparentPage)
          ? 'bg-white/90 backdrop-blur-lg border-b border-border-forest py-3 shadow-sm'
          : 'bg-transparent py-6'
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Left: Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6 flex-1">
            {navLinks.filter(l => l.name !== 'WhatsApp').map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  onClick={link.path === '/' ? scrollToTop : undefined}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 text-[15px] lg:text-[14px] font-bold transition-all duration-300 uppercase tracking-[0.2em] hover:text-accent-light",
                    (isScrolled || !isTransparentPage) ? "text-accent-primary" : "text-white hover:text-accent-light drop-shadow-sm"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Left: Mobile Menu Toggle Placeholder */}
          <div className="lg:hidden flex items-center flex-1">
            <button
              className={cn(
                "p-2 transition-colors duration-300",
                (isScrolled || !isTransparentPage) ? "text-accent-primary" : "text-white"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Center: Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center">
            <Link href="/" onClick={scrollToTop} className="flex flex-col items-center group shrink-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative flex flex-col items-center"
              >
                <span className={cn(
                  "text-xl md:text-4xl font-display font-medium tracking-[0.25em] transition-all duration-500 uppercase leading-none",
                  (isScrolled || !isTransparentPage)
                    ? "text-accent-primary"
                    : "text-white text-shadow-lg"
                )}>
                  Horof
                </span>
                <div className={cn(
                  "h-[1.5px] w-0 group-hover:w-full transition-all duration-700 mt-1",
                  (isScrolled || !isTransparentPage) ? "bg-accent-primary" : "bg-white"
                )} />

              </motion.div>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1 md:gap-4 flex-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "p-2 transition-colors duration-300 hover:text-accent-light",
                (isScrolled || !isTransparentPage) ? "text-text-secondary" : "text-white/80 hover:text-white"
              )}
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              href="/wishlist"
              className={cn(
                "p-2 transition-colors duration-300 block hover:text-accent-light hidden sm:block",
                (isScrolled || !isTransparentPage) ? "text-text-secondary" : "text-white/80 hover:text-white"
              )}
            >
              <Heart className="h-5 w-5" />
            </Link>

            <button
              onClick={onOpenCart}
              className={cn(
                "p-2 transition-colors duration-300 relative hover:text-accent-light",
                (isScrolled || !isTransparentPage) ? "text-text-secondary" : "text-white/80 hover:text-white"
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-primary text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            <div className={cn(
              "hidden md:block h-6 w-[1px] ml-2 transition-colors duration-300",
              (isScrolled || !isTransparentPage) ? "bg-border-forest" : "bg-white/20"
            )} />

            {isAuthenticated ? (
              <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/profile'} className="hidden sm:flex items-center gap-2 text-sm transition-colors ml-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                  (isScrolled || !isTransparentPage) ? "bg-accent-primary text-white" : "bg-white/20 text-white backdrop-blur-md"
                )}>
                  <User className="h-4 w-4" />
                </div>
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:block ml-2">
                <Button
                  size="sm"
                  variant={(isScrolled || !isTransparentPage) ? "primary" : "secondary"}
                  className={cn(
                    "h-10 px-6 rounded-full text-[10px] uppercase font-bold tracking-widest",
                    (!isScrolled && isTransparentPage) && "bg-white text-accent-primary hover:bg-accent-hover hover:text-white border-none"
                  )}
                >
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Global Modals (Outside nav to prevent hiding) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[150] px-4 md:px-6 flex items-center justify-center p-6 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 md:gap-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-gold rounded-full" />
                  <span className="text-accent-primary text-[10px] md:text-xs font-bold uppercase tracking-[0.4em]">Global Search</span>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-3 bg-bg-secondary hover:bg-gold hover:text-white rounded-full transition-all group"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:rotate-90" />
                </button>
              </div>

              <div className="flex items-center gap-4 md:gap-8 border-b-2 border-accent-primary/20 focus-within:border-accent-primary transition-colors pb-4 md:pb-6">
                <Search className="h-6 w-6 md:h-10 md:w-10 text-accent-primary shrink-0 opacity-50" />
                <form onSubmit={handleSearch} className="flex-1">
                  <input
                    autoFocus
                    type="text"
                    placeholder="What are you looking for?"
                    className="w-full text-xl md:text-4xl lg:text-5xl font-display font-medium bg-transparent border-none outline-none text-accent-primary placeholder:text-text-muted/20"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </form>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mr-2">Top Collections:</span>
                {["Heritage", "Limited Edition", "Wall Art", "Woodcraft"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchValue(tag);
                      router.push(`/products?search=${tag}`);
                      setIsSearchOpen(false);
                    }}
                    className="text-[9px] md:text-[10px] font-bold px-4 py-2 bg-bg-secondary text-accent-primary rounded-xl hover:bg-accent-primary hover:text-white transition-all border border-border-forest"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="pt-8 md:pt-12 border-t border-border-forest text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium italic">Discover handmade excellence. Each piece tells a story.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay (Only Categories) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[140] lg:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-accent-primary/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Animated Drawer from LEFT */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="absolute left-0 top-0 bottom-0 w-[80%] max-w-sm bg-accent-primary/90 backdrop-blur-xl p-6 pt-20 shadow-2xl overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-10">

                {/* Categories */}
                <div className="space-y-3">
                  <h2 className="text-accent-light text-[9px] font-semibold uppercase tracking-[0.35em]">
                    Browse Collections
                  </h2>

                  <div className="flex flex-col gap-4">
                    {categories.map((cat, index) => (
                      <motion.div
                        key={cat}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <Link
                          href={`/products?category=${encodeURIComponent(cat)}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between text-lg font-display font-medium text-white/90 hover:text-accent-light transition-all group"
                        >
                          <span className="tracking-tight">{cat}</span>

                          {/* Arrow */}
                          <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-accent-light group-hover:translate-x-1 transition-all" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* View All */}
                <div className="pt-8 border-t border-white/10">
                  <Link
                    href="/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[11px] text-white/60 hover:text-white transition-colors flex items-center gap-2 uppercase tracking-[0.3em]"
                  >
                    View All Products <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Account Section */}
                <div className="pt-8 border-t border-white/10 flex flex-col gap-6">
                  {isAuthenticated ? (
                    <Link
                      href={user?.role === 'admin' ? '/admin/dashboard' : '/profile'}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-white group"
                    >
                      <div className="h-10 w-10 rounded-full bg-gold text-accent-primary flex items-center justify-center font-semibold text-lg">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold">
                          Account
                        </p>
                        <p className="text-sm font-display font-medium">
                          {user?.name || 'User Profile'}
                        </p>
                      </div>

                      <ArrowRight className="ml-auto h-4 w-4 text-white/30 group-hover:text-accent-light transition" />
                    </Link>
                  ) : (
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full h-12 rounded-xl  text-sm font-bold tracking-[0.25em] uppercase">
                        Login
                      </Button>
                    </Link>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-white/20 text-[9px] uppercase tracking-[0.3em] font-light italic">
                      Handcrafted Heritage
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navbar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-[160] lg:hidden px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pointer-events-none transition-all duration-500",
        isMobileMenuOpen ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="max-w-md mx-auto bg-accent-primary/90 backdrop-blur-2xl border border-white/10 rounded-full h-16 flex items-center justify-around px-2 pointer-events-auto shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]">
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
                  "flex flex-col items-center justify-center transition-all duration-300 gap-1.5 flex-1 min-w-0",
                  isActive ? "text-accent-light" : "text-white/60 hover:text-white"
                )}
                onClick={link.external ? undefined : (link.path === '/' ? scrollToTop : () => setIsMobileMenuOpen(false))}
              >
                <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate w-full text-center">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};
