'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { Input, TextArea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/AuthModalContext';
import { submitContactMessage } from '@/lib/actions/contact';

export default function ContactPage() {
  const { requireAuth } = useRequireAuth();
  const { isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to handle submission logic
  const submitForm = async (data: { name: string; email: string; subject: string; message: string }) => {
    setIsSubmitting(true);
    try {
      const result = await submitContactMessage(data);
      if (result.success) {
        toast.success("Message sent! We'll get back to you shortly.");
        // Clear local states
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        toast.error(result.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual submit trigger
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Store transient form data in localStorage before executing requireAuth.
    // This allows recovery if the user gets redirected to a dedicated login page.
    localStorage.setItem(
      'horof_pending_contact_message',
      JSON.stringify({ name, email, subject, message })
    );

    requireAuth(() => {
      // Clear localStorage on direct execution so it doesn't trigger again on reload
      localStorage.removeItem('horof_pending_contact_message');
      submitForm({ name, email, subject, message });
    }, "Please login first to send a message.");
  };

  // Restore and auto-submit if redirected from dedicated login page
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      const savedPending = localStorage.getItem('horof_pending_contact_message');
      if (savedPending) {
        try {
          const parsed = JSON.parse(savedPending);
          // Populate state so user sees what was submitted
          setName(parsed.name || '');
          setEmail(parsed.email || '');
          setSubject(parsed.subject || '');
          setMessage(parsed.message || '');
          
          // Clear storage immediately to prevent loop
          localStorage.removeItem('horof_pending_contact_message');
          
          // Trigger submission
          submitForm(parsed);
        } catch (err) {
          console.error('Failed to parse pending contact message', err);
        }
      }
    }
  }, [isAuthenticated, isLoading]);

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
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d824.1325765028048!2d90.40538057487808!3d24.750255134907835!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbd!4v1778946357471!5m2!1sen!2sbd"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-2xl md:rounded-3xl"
              />
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
              <Input 
                label="Your Name" 
                placeholder="Full Name" 
                required 
                className="rounded-lg text-sm" 
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
              />
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="Youremail@gmail.com" 
                required 
                className="rounded-lg text-sm" 
                value={email || ''}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Input 
              label="Subject" 
              placeholder="How can we help?" 
              required 
              className="rounded-lg text-sm" 
              value={subject || ''}
              onChange={(e) => setSubject(e.target.value)}
            />
            <TextArea 
              label="Your Message" 
              placeholder="Enter your detailed message here..." 
              required
              className="min-h-[140px] sm:min-h-[180px] rounded-lg text-sm"
              value={message || ''}
              onChange={(e) => setMessage(e.target.value)}
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
