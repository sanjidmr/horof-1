import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export const DecorShowcase: React.FC = () => {
  const [items, setItems] = React.useState([
    {
      id: 1,
      title: 'The Eternal Root',
      subtitle: 'Signature Sculpture',
      desc: 'Hand-carved from century-old walnut, this piece captures the fluid motion of growing roots. A testament to time and artisanal patience.',
      image: '/images/hero1.jpg',
      path: '/products',
      isLarge: true
    },
    {
      id: 2,
      title: 'Horizon Wall Art',
      subtitle: 'Heritage Edition',
      desc: 'Abstract topography carved into solid oak, finished with organic oils to reveal the hidden soul of the wood.',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1000',
      path: '/products'
    },
    {
      id: 3,
      title: 'Minimalist Vessel',
      subtitle: 'Sculpted Form',
      desc: 'A seamless blend of hollowed space and solid silhouette, perfect for bringing a piece of nature into your workspace.',
      image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1000',
      path: '/products'
    }
  ]);
  const supabase = createSupabaseBrowserClient();

  React.useEffect(() => {
    async function fetchShowcase() {
      const { data } = await supabase
        .from('site_images')
        .select('*')
        .filter('section', 'like', 'decor-%');
      
      if (data && data.length > 0) {
        setItems(prev => prev.map(item => {
          const match = data.find(d => d.section === `decor-${item.id}`);
          return match ? { ...item, image: match.image_url } : item;
        }));
      }
    }
    fetchShowcase();
  }, [supabase]);

  return (
    <section className="max-w-6xl mx-auto px-6 py-10 sm:py-16">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 sm:mb-16 gap-6 md:gap-8 text-left">
        <div className="space-y-4 sm:space-y-5 max-w-xl">
          <span className="text-accent-hover text-[10px] md:text-sm font-bold md:ml-5 uppercase tracking-[0.5em] block">
            Artisanal showcase
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-7xl font-display font-medium text-accent-primary leading-tight tracking-tight">
            Elevate Your <br />
            <span className="italic text-accent-hover">Living Space</span>
          </h2>
        </div>

        <p className="text-text-secondary text-sm md:text-xl max-w-xs leading-relaxed font-light">
          Curated woodcrafts designed to bridge the gap between ancient heritage and modern minimalism.
        </p>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-10 min-h-[400px] md:min-h-[650px]">

        {/* LEFT: BIG IMAGE (FULL SHOW) */}
        
          <Link
            href={items[0].path}
            className="block h-full relative overflow-hidden rounded-xl md:rounded-2xl bg-bg-secondary"
          >
            <img
              src={items[0].image}
              alt={items[0].title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Overlay Content */}
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-16 sm:pt-32">
              <div className="space-y-3 sm:space-y-4 transition-all duration-500">
                <div className="flex items-center gap-2 text-accent-light">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {items[0].subtitle}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-5xl font-display font-medium text-white">
                  {items[0].title}
                </h3>

                <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-md line-clamp-2 md:line-clamp-3 font-light leading-relaxed">
                  {items[0].desc}
                </p>

               
              </div>
            </div>
          </Link>
        {/* RIGHT SIDE */}
        <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-3 md:gap-6 h-[220px] md:h-full">
          {items.slice(1).map((item) => (
           
           <div
           key={item.id}
           className="block h-full relative overflow-hidden rounded-xl md:rounded-2xl bg-bg-secondary group"
         >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition" />

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <span className="text-accent-light text-[9px] font-bold uppercase tracking-widest block">
                    {item.subtitle}
                  </span>

                  <h3 className="text-lg sm:text-xl md:text-2xl text-white">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 text-white opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[10px] uppercase">Discover</span>
                    <ArrowRight className="h-3 w-3 text-accent-light" />
                  </div>
                </div>
              </div>
           
          ))}
        </div>
      </div>
    </section>
  );
};
