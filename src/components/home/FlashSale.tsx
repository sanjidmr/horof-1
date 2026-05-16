import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export const FlashSale: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [flashSale, setFlashSale] = useState<any>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchFlashSale() {
      const { data } = await supabase.from('flash_sales').select('*').limit(1).maybeSingle();
      if (data) setFlashSale(data);
    }
    fetchFlashSale();
  }, [supabase]);

  useEffect(() => {
    if (!flashSale?.end_time) return;

    const timer = setInterval(() => {
      const difference = new Date(flashSale.end_time).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSale]);

  const TimeUnit = ({
    label,
    value,
  }: {
    label: string;
    value: number;
  }) => (
    <div className="flex flex-col items-center flex-1">
      <div className="w-full aspect-square bg-white shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-accent-primary group-hover:text-white transition-all duration-500">
        <span className="text-2xl sm:text-4xl md:text-5xl font-display font-medium">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[8px] sm:text-[10px] font-bold text-accent-primary/50 uppercase tracking-[0.3em]">
        {label}
      </span>
    </div>
  );

  if (!flashSale) return null;

  return (
    <section className="relative w-full overflow-hidden bg-white py-12 sm:py-20">
      {/* Background */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-bg-secondary opacity-40 -skew-x-12 translate-x-1/4 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20 items-center">

          {/* IMAGE */}
          <div className="lg:col-span-6 relative">
            <Link href={flashSale.product_id ? `/products/${flashSale.product_id}` : '#'}>
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden group shadow-[0_30px_80px_rgba(0,0,0,0.15)] cursor-pointer"
              >
                <img
                  src={flashSale.image_url}
                  alt={flashSale.title}
                  className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
                />
              </motion.div>
            </Link>

            {/* PRICE CARD */}
            <div className="absolute -bottom-2 -right-1 sm:-bottom-10 sm:right-6 bg-white p-3 sm:p-8 rounded-lg sm:rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-accent-primary/5 z-20">
              <div className="space-y-1 sm:space-y-3">
                <div className="flex flex-col">
                  <span className="text-[7px] sm:text-[10px] text-accent-primary/40 uppercase font-bold tracking-[0.25em] mb-0.5">
                    Seasonal Selection
                  </span>
                  <span className="text-lg sm:text-3xl font-display font-medium text-accent-primary">
                    ৳{flashSale.offer_price.toLocaleString()}
                  </span>
                </div>

                <div className="h-px w-full bg-accent-primary/10" />

                <p className="text-[7px] sm:text-[10px] text-accent-primary/60 flex items-center gap-1">
                  <span className="line-through">৳{flashSale.main_price.toLocaleString()}</span>
                  <span className="w-1 h-1 rounded-full bg-accent-hover" />
                  <span>Save ৳{(flashSale.main_price - flashSale.offer_price).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="lg:col-span-6 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-accent-hover fill-accent-hover" />
                <span className="text-accent-hover text-[10px] font-bold uppercase tracking-[0.4em]">
                  Limited Time Offer
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-medium text-accent-primary leading-tight">
                {flashSale.title}
              </h2>

              <p className="text-text-secondary text-sm sm:text-lg font-light max-w-md">
                For a short time, access premium handcrafted pieces at exclusive pricing.
              </p>
            </div>

            {/* TIMER */}
            <div className="flex gap-3 sm:gap-5 group">
              <TimeUnit label="Days" value={timeLeft.days} />
              <TimeUnit label="Hours" value={timeLeft.hours} />
              <TimeUnit label="Mins" value={timeLeft.minutes} />
              <TimeUnit label="Secs" value={timeLeft.seconds} />
            </div>

            {/* BUTTON */}
            <div>
              <Link href={flashSale.product_id ? `/products/${flashSale.product_id}` : '/products'}>
                <Button className="h-12 sm:h-14 px-8 sm:px-10 bg-accent-primary text-white hover:bg-accent-hover rounded-lg sm:rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all shadow-xl hover:-translate-y-1">
                  Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};