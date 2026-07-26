'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, Send, MessageSquare, Clock,
  User, ChevronDown, Paperclip, X, CheckCircle2, Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/AuthModalContext';
import { submitContactMessage, uploadContactFile } from '@/lib/actions/contact';

const INQUIRY_TYPES = [
  'General Inquiry',
  'Custom Order Request',
  'Wholesale / Bulk Order',
  'Product Feedback',
  'Shipping & Delivery',
  'Return & Refund',
  'Partnership / Collaboration',
  'Other',
];

const inputBase =
  'w-full px-4 py-3.5 bg-bg-card border border-border-forest rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/60 transition-all';

export default function ContactPage() {
  const { requireAuth } = useRequireAuth();
  const { isAuthenticated, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitForm = async (data: { name: string; email: string; phone: string; inquiryType: string; message: string; fileName?: string; fileObj?: File }) => {
    setIsSubmitting(true);
    try {
      let fileInfo = data.fileName ? `\nAttached File: ${data.fileName}` : '';

      if (data.fileObj) {
        const fd = new FormData();
        fd.append('file', data.fileObj);
        const uploadResult = await uploadContactFile(fd);
        if (uploadResult?.url) {
          fileInfo = `\nAttached File: ${data.fileName} (${uploadResult.url})`;
        }
      }

      const fullMessage = `${data.message}${data.phone ? `\n\nPhone: ${data.phone}` : ''}${data.inquiryType ? `\nInquiry Type: ${data.inquiryType}` : ''}${fileInfo}`;

      const result = await submitContactMessage({
        name: data.name,
        email: data.email,
        subject: data.inquiryType || 'General Inquiry',
        message: fullMessage,
      });

      if (result.success) {
        setSubmitted(true);
        setName(''); setEmail(''); setPhone(''); setInquiryType(''); setMessage(''); setUploadedFile(null);
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryType) { toast.error('Please select an inquiry type'); return; }

    const formData = { name, email, phone, inquiryType, message, fileName: uploadedFile?.name, fileObj: uploadedFile || undefined };
    localStorage.setItem('horof_pending_contact_message', JSON.stringify(formData));

    requireAuth(() => {
      localStorage.removeItem('horof_pending_contact_message');
      submitForm(formData);
    }, 'Please login first to send a message.');
  };

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      const saved = localStorage.getItem('horof_pending_contact_message');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setName(parsed.name || ''); setEmail(parsed.email || '');
          setPhone(parsed.phone || ''); setInquiryType(parsed.inquiryType || '');
          setMessage(parsed.message || '');
          localStorage.removeItem('horof_pending_contact_message');
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

        {/* ── Left: Contact Info ── */}
        <div className="space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <span className="text-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">Communication</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-text-primary">
              Let's <span className="text-gold italic">Connect</span>
            </h1>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
              Have a custom request or just want to talk shop? We love hearing from fellow artisans and craft enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {[
              { icon: Mail,   title: 'Email Us',       lines: ['hello@Horof.com', 'support@horof.com'] },
              { icon: Phone,  title: 'Call Us',        lines: ['+880 1723 8900', '+880 1938 4948'] },
              { icon: MapPin, title: 'Our Studio',     lines: ['Dhopakhola more', 'Mymensingh'] },
              { icon: Clock,  title: 'Opening Hours',  lines: ['Sat – Fri: 9am – 6pm', 'Thur: 10am – 4pm'] },
            ].map(({ icon: Icon, title, lines }) => (
              <div key={title} className="flex gap-4">
                <div className="h-12 w-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-forest shrink-0">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-text-primary">{title}</h4>
                  {lines.map((l) => <p key={l} className="text-sm text-text-secondary">{l}</p>)}
                </div>
              </div>
            ))}
          </div>

          <div className="h-48 md:h-64 bg-bg-card border border-border-forest rounded-2xl md:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-accent-primary/10 flex items-center justify-center">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d824.1325765028048!2d90.40538057487808!3d24.750255134907835!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbd!4v1778946357471!5m2!1sen!2sbd"
                width="100%" height="100%"
                style={{ border: 0 }}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-2xl md:rounded-3xl"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Premium Form ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-bg-card border border-border-forest p-6 sm:p-8 md:p-10 rounded-2xl relative shadow-[0_20px_60px_rgba(26,51,32,0.12)] glass-card"
        >
          {/* Decorative badge */}
          <div className="absolute -top-4 right-5 sm:-top-5 sm:-right-5 h-12 w-12 sm:h-14 sm:w-14 bg-accent-primary rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>

          {submitted ? (
            /* ── Success State ── */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center py-16 gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-accent-primary/10 flex items-center justify-center border border-accent-primary/20 relative">
                <div className="absolute inset-0 rounded-full bg-accent-primary/10 animate-ping opacity-60" />
                <CheckCircle2 className="w-10 h-10 text-accent-primary fill-accent-primary/20 relative z-10" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-primary/10 text-accent-primary text-[10px] uppercase font-bold tracking-widest rounded-full">
                  <Sparkles className="w-3 h-3" /> Message Sent
                </div>
                <h3 className="text-2xl font-display font-bold text-text-primary">We got your message!</h3>
                <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
                  Thank you for reaching out. Our team will get back to you within 24 hours.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs uppercase tracking-widest font-bold text-accent-primary hover:text-gold transition-colors"
              >
                Send Another Message
              </button>
            </motion.div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-display font-bold text-text-primary">Send a Message</h2>
                <p className="text-xs text-text-muted mt-1">Fill in the details below and we'll respond shortly.</p>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="name"
                    className={inputBase}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Phone & Inquiry Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className={inputBase}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <ChevronDown className="w-3.5 h-3.5" /> Inquiry Type <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required value={inquiryType} onChange={(e) => setInquiryType(e.target.value)}
                      className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                    >
                      <option value="">Select a topic...</option>
                      {INQUIRY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Upload a File <span className="text-text-muted font-normal lowercase">(optional, max 5 MB)</span>
                </label>
                {!uploadedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border-forest rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-primary/60 hover:bg-accent-primary/5 transition-all cursor-pointer group"
                  >
                    <Paperclip className="w-6 h-6 group-hover:text-accent-primary transition-colors" />
                    <span className="text-xs font-semibold group-hover:text-accent-primary transition-colors">Click to browse or drag & drop</span>
                    <span className="text-[10px]">PNG, JPG, PDF, DOCX supported</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
                      <Paperclip className="w-5 h-5 text-accent-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{uploadedFile.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button" onClick={removeFile}
                      className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef} type="file" className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.docx,.doc"
                  onChange={handleFileChange}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Your Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your detailed message here — feel free to include any specifics about your request, custom design ideas, or questions..."
                  className={`${inputBase} resize-none leading-relaxed`}
                />
                <p className="text-[10px] text-text-muted text-right">{message.length}/1000 chars</p>
              </div>

              {/* Submit */}
              <Button
                variant="primary"
                className="w-full h-13 rounded-full group transition-all duration-300 hover:shadow-2xl hover:shadow-accent-primary/20 text-xs sm:text-sm"
                isLoading={isSubmitting}
              >
                <span className="flex items-center justify-center gap-2">
                  Send Message
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </Button>

              <p className="text-[10px] text-center text-text-muted uppercase tracking-[0.2em] font-medium">
                By submitting, you agree to our{' '}
                <a href="/privacy-policy" className="text-accent-primary hover:text-gold transition-colors">Privacy Policy</a>
                {' '}and{' '}
                <a href="/terms" className="text-accent-primary hover:text-gold transition-colors">Terms</a>.
              </p>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  );
};
