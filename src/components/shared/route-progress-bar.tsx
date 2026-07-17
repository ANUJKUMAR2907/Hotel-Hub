'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Whenever pathname or search params change, complete the progress bar
    if (progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startProgress = () => {
      setVisible(true);
      setProgress(10);
      
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          // Increment slower as it gets closer to 90%
          const increment = Math.max(1, (90 - prev) * 0.15);
          return prev + increment;
        });
      }, 150);
    };

    const handleAnchorClick = (event: MouseEvent) => {
      const anchor = event.currentTarget as HTMLAnchorElement;
      
      // Ignore modified clicks (ctrl, shift, etc.) or target="_blank"
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === '_blank'
      ) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip hash links, mailto, tel, and external links
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Check if it's local
      const isLocal = href.startsWith('/') || (!href.startsWith('http') && !href.includes(':'));
      const isSamePage = href.split('#')[0] === window.location.pathname;

      if (isLocal && !isSamePage) {
        startProgress();
      }
    };

    const handleMutation = () => {
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach((anchor) => {
        anchor.removeEventListener('click', handleAnchorClick as any);
        anchor.addEventListener('click', handleAnchorClick as any);
      });
    };

    // Listen for DOM changes to attach to new links
    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, { childList: true, subtree: true });

    handleMutation();

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [progress]);

  if (!visible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] h-[3px] w-full bg-transparent pointer-events-none transition-opacity duration-300"
      style={{ opacity: progress === 100 ? 0 : 1 }}
    >
      <div 
        className="h-full bg-gradient-to-r from-amber-500 via-primary to-yellow-400 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(194,159,93,0.8)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
