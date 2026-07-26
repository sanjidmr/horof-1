'use client';

import { useState } from 'react';
import { subscribe } from '@/lib/actions/subscribers';
import { Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return toast.error('Please enter a valid email');
    setLoading(true);
    const result = await subscribe(email, 'newsletter');
    setLoading(false);
    if (result.ok) {
      setSubmitted(true);
      setEmail('');
      toast.success('Subscribed successfully!');
    } else {
      toast.error(result.error || 'Subscription failed');
    }
  };

  if (submitted) {
    return (
      <section className="py-20 bg-[#1a4731]">
        <div className="max-w-2xl mx-auto text-center px-6">
          <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white mb-3">You&apos;re Subscribed!</h2>
          <p className="text-emerald-100 text-lg">Thank you for joining our community. Expect exclusive offers and craft inspiration.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-[#1a4731]">
      <div className="max-w-2xl mx-auto text-center px-6">
        <h2 className="text-3xl font-display font-bold text-white mb-3">Join Our Craft Community</h2>
        <p className="text-emerald-100 text-lg mb-8">Get exclusive offers, DIY tips, and new product alerts delivered to your inbox.</p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-5 py-3.5 rounded-xl text-sm font-medium bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/50 transition"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 bg-white text-[#1a4731] rounded-xl text-sm font-bold hover:bg-emerald-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Subscribe
              </>
            )}
          </button>
        </form>
        <p className="text-emerald-200/50 text-xs mt-4">No spam, unsubscribe anytime. We respect your privacy.</p>
      </div>
    </section>
  );
}
