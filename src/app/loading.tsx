'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 transition-all duration-300">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(194,159,93,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Animated Loading Core */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        {/* Outer Pulsing Glow */}
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-30" />
        
        {/* Spinning Outer Ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary border-r-transparent animate-spin duration-1000" />
        
        {/* Innermost Ring spinning backwards */}
        <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-primary/40 border-l-transparent animate-spin duration-1500" style={{ animationDirection: 'reverse' }} />
        
        {/* Luxury Center Icon */}
        <div className="relative text-primary z-10 animate-pulse">
          <Sparkles className="h-8 w-8" />
        </div>
      </div>
      
      {/* Branding and Subtext */}
      <div className="text-center select-none z-10">
        <h2 className="font-serif text-2xl tracking-[0.15em] text-foreground mb-2">
          Hotel-Hub
        </h2>
        <div className="h-[1px] w-12 bg-primary/40 mx-auto mb-3" />
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground animate-pulse">
          Preparing your sanctuary
        </p>
      </div>
    </div>
  );
}
