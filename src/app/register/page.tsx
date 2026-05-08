'use client';


import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, TreePine, Github, Mail, User, Lock, Phone } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext'; // ✅ import করো

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup } = useAuth(); // ✅ signup নাও
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signup(email, password); // ✅ আসল Supabase signup
      toast.success('Account created!');
      router.push('/'); // ✅ সরাসরি main page এ
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden bg-bg-secondary">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-accent-primary/5 rounded-full blur-[80px] md:blur-[100px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-gold/5 rounded-full blur-[80px] md:blur-[100px] -translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8 md:space-y-10 relative z-10"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <Link href="/" className="inline-flex items-center justify-center p-2.5 md:p-3 bg-accent-primary rounded-xl md:rounded-2xl border border-accent-primary mb-1 md:mb-2 shadow-lg">
            <TreePine className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-accent-primary">Create Your Account</h1>
          <p className="text-sm md:text-base text-text-secondary">Join the <span className="text-gold font-bold italic">Horof</span> community today.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white border border-border-forest rounded-3xl md:rounded-[40px] p-6 md:p-10 space-y-5 md:space-y-6 shadow-xl shadow-accent-primary/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <Input label="First Name" placeholder="John" required icon={<User className="h-4 w-4" />} className="rounded-xl" />
            <Input label="Last Name" placeholder="Doe" required className="rounded-xl" />
          </div>

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)} // ✅
            placeholder="john@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // ✅
            placeholder="••••••••"
            required
          />

         
          <div className="flex items-start gap-3 py-1">
            <input type="checkbox" className="mt-1 h-3.5 w-3.5 md:h-4 md:w-4 accent-accent-primary" id="terms" required />
            <label htmlFor="terms" className="text-[10px] md:text-xs text-text-secondary leading-tight">
              I agree to the <span className="text-accent-primary font-bold underline cursor-pointer">Terms of Service</span> and <span className="text-accent-primary font-bold underline cursor-pointer">Privacy Policy</span>.
            </label>
          </div>

          <Button variant="primary" className="w-full h-12 md:h-14 rounded-full uppercase tracking-widest text-[10px] md:text-xs font-bold shadow-lg shadow-accent-primary/20" isLoading={isLoading}>
            <span>Create Account</span>
            <UserPlus className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-forest"></div></div>
            <div className="relative flex justify-center text-[9px] md:text-[10px] uppercase tracking-widest font-bold"><span className="bg-white px-4 text-text-muted">Or join with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Button variant="secondary" className="h-11 md:h-12 w-full flex items-center justify-center gap-2 border-border-forest rounded-xl text-[10px] md:text-xs tracking-widest uppercase">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Google
            </Button>
            <Button variant="secondary" className="h-11 md:h-12 w-full flex items-center justify-center gap-2 border-border-forest rounded-xl text-[10px] md:text-xs tracking-widest uppercase">
              <Github className="h-3.5 w-3.5 md:h-4 md:w-4" />
              GitHub
            </Button>
          </div>
        </form>

        <p className="text-center text-xs md:text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-primary font-bold hover:underline">Sign In Instead</Link>
        </p>
      </motion.div>
    </div>
  );
};
