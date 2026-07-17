'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingContextType {
  loading: boolean;
  message: string;
  showLoader: (msg?: string) => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Please wait...');

  const showLoader = (msg?: string) => {
    if (msg) setMessage(msg);
    else setMessage('Please wait...');
    setLoading(true);
  };

  const hideLoader = () => {
    setLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ loading, message, showLoader, hideLoader }}>
      {children}
      {loading && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(194,159,93,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary border-r-transparent animate-spin duration-1000" />
            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-primary/40 border-l-transparent animate-spin duration-1500" style={{ animationDirection: 'reverse' }} />
            <div className="relative text-primary z-10 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          
          <div className="text-center px-4 max-w-sm">
            <h3 className="font-serif text-lg tracking-[0.1em] text-foreground mb-1">
              Hotel-Hub
            </h3>
            <div className="h-[1px] w-8 bg-primary/40 mx-auto mb-3" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
              {message}
            </p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoader must be used within a LoadingProvider');
  }
  return context;
}
