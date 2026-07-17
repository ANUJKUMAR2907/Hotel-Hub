'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useToast } from '@/context/toast-context';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        success('Password reset email dispatched!');
        setSubmitted(true);
      } else {
        error(data.message || 'Error processing request');
      }
    } catch (err) {
      console.error(err);
      error('Network error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-foreground font-semibold">Recover Password</h2>
            <p className="text-xs text-muted-foreground mt-1">We will send a temporary password code to your email</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Registered Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer mt-6"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Request Temporary Password'}
                {!loading && <KeyRound className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-3.5 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto">
                <Mail className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Dispatched Successfully</h3>
              <p className="text-sm text-muted-foreground leading-normal">
                If the email address matches an active account in our registry, a temporary password has been sent. Check the server console if SMTP credentials are mock.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold pt-4"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          )}

          {!submitted && (
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
