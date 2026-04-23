'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { Input, TextArea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Message sent! We\'ll get back to you shortly.');
    }, 1500);
  };

  return (
    <div className="pt-24 md:pt-32 pb-16 md:pb-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
        {/* Contact Info */}
        <div className="space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <span className="text-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">Communication</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-text-primary">Let's <span className="text-gold italic">Connect</span></h1>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
              Have a custom request or just want to talk shop? We love hearing from fellow artisans and craft enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            <div className="flex gap-4">
              <div className="h-12 w-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-forest shrink-0">
                <Mail className="h-6 w-6 text-gold" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-text-primary">Email Us</h4>
                <p className="text-sm text-text-secondary">hello@Horof.com</p>
                <p className="text-sm text-text-secondary">support@horof.com</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-forest shrink-0">
                <Phone className="h-6 w-6 text-gold" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-text-primary">Call Us</h4>
                <p className="text-sm text-text-secondary">+880 1723 8900</p>
                <p className="text-sm text-text-secondary">+880 1938 4948</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-forest shrink-0">
                <MapPin className="h-6 w-6 text-gold" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-text-primary">Our Studio</h4>
                <p className="text-sm text-text-secondary">Dhopakhola more<br />Mymensingh</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-forest shrink-0">
                <Clock className="h-6 w-6 text-gold" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-text-primary">Opening Hours</h4>
                <p className="text-sm text-text-secondary">Sat - Fri: 9am - 6pm</p>
                <p className="text-sm text-text-secondary">thur: 10am - 4pm</p>
              </div>
            </div>
          </div>

          <div className="h-48 md:h-64 bg-bg-card border border-border-forest rounded-2xl md:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-accent-primary/10 flex items-center justify-center">
              <p className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest font-bold">Interactive Map Placeholder</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-bg-card border border-border-forest p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl relative shadow-[0_20px_50px_rgba(26,51,32,0.1)] glass-card"
        >
          <div className="absolute -top-4 right-4 sm:-top-6 sm:-right-6 h-12 w-12 sm:h-16 sm:w-16 bg-accent-primary rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg z-10">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Input label="Your Name" placeholder="Full Name" required className="rounded-lg text-sm" />
              <Input label="Email Address" type="email" placeholder="Youremail@gmail.com" required className="rounded-lg text-sm" />
            </div>
            <Input label="Subject" placeholder="How can we help?" required className="rounded-lg text-sm" />
            <TextArea label="Your Message" placeholder="Enter your detailed message here..." required
              className="min-h-[140px] sm:min-h-[180px] rounded-lg text-sm"
            />
            <Button variant="primary" className="w-full h-12 sm:h-14 rounded-full group transition-all duration-300 hover:shadow-2xl hover:shadow-accent-primary/20 text-xs sm:text-sm" isLoading={isSubmitting}>
              <span className="flex items-center justify-center gap-2">
                Send Message
                <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
            </Button>
            <p className="text-[10px] text-center text-text-muted uppercase tracking-[0.2em] font-medium">
              By submitting this form, you agree to our privacy policy and terms.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
