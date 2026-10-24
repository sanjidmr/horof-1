'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export const FAQSection: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    async function fetchFaqs() {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) setFaqs(data);
    }
    fetchFaqs();
  }, [supabase]);

  if (faqs.length === 0) return null;

  return (
    <section className="py-6 md:py-12 bg-bg-secondary/30 rounded-2xl md:rounded-[3rem] border border-border-forest/50">
      <div className="max-w-3xl mx-auto px-3 md:px-6">

        {/* Header */}
        <div className="text-center space-y-2 md:space-y-3 mb-8 md:mb-16">
          <span className="text-gold text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center justify-center gap-2 md:gap-3">
            <div className="h-px w-5 md:w-8 bg-gold" /> Knowledge Base
          </span>

          <h2 className="text-xl md:text-5xl font-display font-medium leading-tight text-accent-primary">
            Frequently Asked <span className="text-accent-light italic">Questions</span>
          </h2>
        </div>

        {/* FAQ List */}
        <div className="space-y-2 md:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.id}
                className={cn(
                  "border border-border-forest rounded-lg md:rounded-2xl overflow-hidden transition-all duration-300",
                  isOpen
                    ? "bg-white shadow-md md:shadow-xl shadow-accent-primary/5 border-accent-primary/10"
                    : "bg-transparent hover:bg-white/50"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-3 py-3 md:px-6 md:py-5 flex items-center justify-between text-left group gap-3"
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1">

                    {/* Icon */}
                    <div
                      className={cn(
                        "h-6 w-6 md:h-8 md:w-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                        isOpen
                          ? "bg-accent-primary text-white"
                          : "bg-accent-primary/5 text-accent-primary"
                      )}
                    >
                      <HelpCircle className="h-3 w-3 md:h-4 md:w-4" />
                    </div>

                    {/* Question */}
                    <span
                      className={cn(
                        "text-sm md:text-lg font-medium leading-snug transition-colors",
                        isOpen
                          ? "text-accent-primary"
                          : "text-text-primary group-hover:text-accent-primary"
                      )}
                    >
                      {faq.question}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 md:h-5 md:w-5 text-accent-primary shrink-0",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 pb-4 md:px-6 md:pb-6 ml-8 md:ml-12">
                    <p className="text-xs md:text-base font-light leading-relaxed border-l-2 border-gold/30 pl-3 italic">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 md:mt-16 text-center">
          <p className="text-[10px] md:text-sm text-text-muted">
            Still have questions?{" "}
            <a
              href="/contact"
              className="text-accent-primary font-bold hover:text-gold transition-colors underline underline-offset-4 tracking-widest uppercase text-[9px] md:text-[10px]"
            >
              Reach out
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
