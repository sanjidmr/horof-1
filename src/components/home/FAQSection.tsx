import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const faqs = [
  {
    question: "What makes your wood crafts unique?",
    answer: "Every piece is handcrafted by master artisans using premium, sustainably sourced wood. We combine ancestral carving techniques with modern precision to create heirlooms that tell a story."
  },
  {
    question: "Do you accept custom design requests?",
    answer: "Yes! We specialize in bespoke craftsmanship. You can contact us through our 'Custom Design' section to discuss your unique vision and our artisans will bring it to life."
  },
  {
    question: "Where do you source your timber?",
    answer: "We are committed to the environment. All our wood is sourced either from naturally fallen trees or from verified sustainable timber plantations in local communities."
  },
  {
    question: "Do you offer international shipping?",
    answer: "No, we only delever your product on bangladesh we dont have interntionl shipping "
  },
  {
    question: "How should I care for my wooden items?",
    answer: "We recommend keeping them away from direct sunlight and extreme moisture. Regular cleaning with a soft, dry cloth and occasional application of food-safe mineral oil will maintain their beauty for generations."
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-12 md:py-20 bg-bg-secondary/30 rounded-3xl md:rounded-[3rem] border border-border-forest/50">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className="text-center space-y-3 mb-10 md:mb-16">
          <span className="text-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-3">
            <div className="h-px w-6 md:w-8 bg-gold" /> Knowledge Base
          </span>
          <h2 className="text-2xl md:text-5xl font-display font-medium leading-tight text-accent-primary">
            Frequently Asked <span className="text-accent-light italic">Questions</span>
          </h2>

        </div>

        <div className="space-y-3 md:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={false}
                className={cn(
                  "border border-border-forest rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300",
                  isOpen ? "bg-white shadow-xl shadow-accent-primary/5 border-accent-primary/10" : "bg-transparent hover:bg-white/50"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-4 py-4 md:px-6 md:py-5 flex items-center justify-between text-left group gap-4"
                >
                  <div className="flex items-center gap-3 md:gap-4 flex-1">
                    <div className={cn(
                      "h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                      isOpen ? "bg-accent-primary text-white" : "bg-accent-primary/5 text-accent-primary"
                    )}>
                      <HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </div>
                    <span className={cn(
                      "text-base md:text-lg font-medium transition-colors leading-snug",
                      isOpen ? "text-accent-primary" : "text-text-primary group-hover:text-accent-primary"
                    )}>
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 md:h-5 md:w-5 text-accent-primary transition-transform duration-500 shrink-0",
                    isOpen && "rotate-180"
                  )} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-4 pb-5 md:px-6 md:pb-6 pt-0 ml-10 md:ml-12 pr-4">
                        <p className="text-text-secondary text-sm md:text-base font-light leading-relaxed border-l-2 border-gold/30 pl-3 md:pl-4 italic">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 md:mt-16 text-center">
          <p className="text-xs md:text-sm text-text-muted">
            Still have questions? <a href="/contact" className="text-accent-primary font-bold hover:text-gold transition-colors underline underline-offset-4 tracking-widest uppercase text-[9px] md:text-[10px]">Reach out to our studio</a>
          </p>
        </div>
      </div>
    </section>
  );
};
