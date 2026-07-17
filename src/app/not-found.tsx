import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-lg text-center space-y-6 animate-fade-in">
          
          <div className="p-4 bg-primary/10 text-primary rounded-full w-fit mx-auto animate-bounce">
            <Compass className="h-12 w-12" />
          </div>

          <div>
            <span className="text-primary font-mono text-sm font-semibold tracking-widest uppercase">Error Code 404</span>
            <h2 className="text-3xl font-serif font-bold text-foreground mt-1.5">Destination Uncharted</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-light">
              The page you are looking for has been moved, renamed, or is currently undergoing maintenance. Let us guide you back.
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/"
              className="w-full rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Resort Search
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
