'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: "What kind of wood do you use?",
    answer: "We primarily use sustainably sourced hardwoods such as Teak, Mahogany, and Oak. Every piece of timber is verified for ethical harvesting or reclaimed from naturally fallen trees."
  },
  {
    question: "Do you offer international shipping?",
    answer: "Currently, we ship across Bangladesh. We are working on establishing international shipping routes to bring our woodcraft to the global market soon."
  },
  {
    question: "Can I request a custom design?",
    answer: "Yes! We love creating bespoke pieces. Please contact our studio through the contact form or via phone to discuss your vision."
  },
  {
    question: "How should I care for my wood products?",
    answer: "Wood is a living material. Avoid direct sunlight and extreme humidity. We recommend occasional oiling with food-grade mineral oil or beeswax to maintain its natural luster."
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 7-day return policy for unused items in their original packaging. Custom-made pieces are generally non-refundable unless there is a structural defect."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900">Frequently Asked Questions</h1>
          <p className="text-slate-500 max-w-xl mx-auto">Everything you need to know about our craftsmanship and services.</p>
        </div>

        <div className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggleFAQ(i)}
                className="w-full text-left font-bold text-slate-900 py-6 px-6 flex justify-between items-center hover:bg-slate-50 transition-colors"
              >
                {faq.question}
                <ChevronDown 
                  className={cn("w-5 h-5 transition-transform duration-300", openIndex === i ? "rotate-180" : "")} 
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="text-slate-600 leading-relaxed pb-6 px-6 pt-2">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
