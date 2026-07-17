'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useToast } from '@/context/toast-context';
import { useGlobalLoader } from '@/context/loading-context';
import { User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { success, error } = useToast();
  const { showLoader } = useGlobalLoader();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !password || !confirmPassword) {
      error('Please fill in all details');
      return;
    }

    if (password.length < 6) {
      error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();
      if (data.success) {
        success('Account created successfully! Please sign in.');
        showLoader('Redirecting to login...');
        router.push('/login');
      } else {
        error(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      error('Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-foreground font-semibold">Join Hotel Hub</h2>
            <p className="text-xs text-muted-foreground mt-1">Register today to secure exclusive member rates</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rohan Gupta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. rohan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-primary" /> Contact Number
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-primary" /> Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-primary" /> Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer mt-6"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
