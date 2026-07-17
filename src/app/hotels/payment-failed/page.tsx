'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { AlertTriangle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg space-y-6 text-center animate-fade-in">
          
          {/* Animated Warning Badge */}
          <div className="p-4 bg-red-500/10 text-red-500 rounded-full w-fit mx-auto">
            <AlertTriangle className="h-12 w-12" />
          </div>

          <div>
            <h2 className="text-3xl font-serif font-bold text-foreground">Transaction Declined</h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              We were unable to authorize your card transaction. The bank reported an authentication error or insufficient funds.
            </p>
          </div>

          <div className="bg-muted/30 border border-border p-4 rounded-lg text-left space-y-2 text-xs text-muted-foreground leading-relaxed">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-primary shrink-0" /> Suggested troubleshooting:
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your payment credentials and card expiration date.</li>
              <li>Verify that your bank card is active for online domestic/international usage.</li>
              <li>Try UPI or Net Banking options instead of direct Card settlement.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Checkout
            </button>
            <Link
              href="/"
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
