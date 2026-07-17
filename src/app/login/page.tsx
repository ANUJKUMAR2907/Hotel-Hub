'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useGlobalLoader } from '@/context/loading-context';
import { Mail, Lock, Key, ArrowRight, ShieldCheck, MailWarning } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { success, error, info } = useToast();
  const { showLoader } = useGlobalLoader();
  const router = useRouter();
  
  const [loginMode, setLoginMode] = useState<'credentials' | 'otp'>('credentials');
  const [loading, setLoading] = useState(false);

  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        success('Welcome back, ' + data.user.name);
        login(data.user);
        
        showLoader('Accessing your dashboard...');
        // Redirect based on role
        if (data.user.role === 'SUPER_ADMIN') router.push('/admin');
        else if (data.user.role === 'RECEPTIONIST') router.push('/reception');
        else router.push('/customer');
        router.refresh();
      } else {
        error(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      error('Network error during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) {
      error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });

      const data = await res.json();
      if (data.success) {
        success(data.message || 'OTP code sent');
        setOtpSent(true);
      } else {
        error(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error(err);
      error('Error sending OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      error('Please enter a 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode }),
      });

      const data = await res.json();
      if (data.success) {
        success('Verification successful. Welcome!');
        login(data.user);

        showLoader('Accessing your dashboard...');
        if (data.user.role === 'SUPER_ADMIN') router.push('/admin');
        else if (data.user.role === 'RECEPTIONIST') router.push('/reception');
        else router.push('/customer');
        router.refresh();
      } else {
        error(data.message || 'OTP verification failed');
      }
    } catch (err) {
      console.error(err);
      error('Error verifying OTP code');
    } finally {
      setLoading(false);
    }
  };

  // Simulated Google OAuth login
  const handleGoogleLogin = () => {
    info('Redirecting to Google Account services...');
    setLoading(true);
    setTimeout(async () => {
      // Auto logging in as default Customer for testing ease
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'customer@hotel.com', password: 'Password123' }),
        });
        const data = await res.json();
        if (data.success) {
          success('Google OAuth successful! Logged in as Rohan Gupta');
          login(data.user);
          showLoader('Redirecting to your account...');
          router.push('/customer');
          router.refresh();
        } else {
          error('Google Login Simulation Failed');
        }
      } catch (err) {
        error('Simulated auth error');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-foreground font-semibold">Welcome Back</h2>
            <p className="text-xs text-muted-foreground mt-1">Authenticate to access reservations dashboard</p>
          </div>

          {/* Login Mode Toggle Buttons */}
          <div className="flex bg-muted p-1 rounded-md mb-6 text-sm">
            <button
              onClick={() => { setLoginMode('credentials'); setOtpSent(false); }}
              className={`flex-1 py-1.5 rounded text-center font-medium transition cursor-pointer ${
                loginMode === 'credentials' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Password Login
            </button>
            <button
              onClick={() => setLoginMode('otp')}
              className={`flex-1 py-1.5 rounded text-center font-medium transition cursor-pointer ${
                loginMode === 'otp' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OTP Login
            </button>
          </div>

          {/* Credentials Mode */}
          {loginMode === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. admin@hotel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer pt-2.5 pb-2.5"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {/* OTP Mode */}
          {loginMode === 'otp' && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Registered Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter registered email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer pt-2.5 pb-2.5"
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP Code'}
                    {!loading && <Key className="h-4 w-4" />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded p-3 text-xs flex gap-2 items-start mb-4">
                    <MailWarning className="h-4 w-4 shrink-0" />
                    <div>
                      An OTP has been dispatched to <strong>{otpEmail}</strong>. If SMTP is not active, verify the server log!
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground text-center tracking-[0.4em] font-mono focus:border-primary focus:outline-none transition w-full"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="flex-1 rounded-md border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow"
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-border" />
            <span className="mx-3 text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">or sign in with</span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Social Logins */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full border border-border bg-background hover:bg-muted py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            disabled={loading}
          >
            {/* Google Logo SVG */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.516 0 2.899.54 3.982 1.425l3.033-3.033C19.145 2.502 15.93 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.74-4.257 10.74-10.74 0-.648-.057-1.14-.17-1.455h-10.57z"
              />
            </svg>
            Google Identity
          </button>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Register now
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
