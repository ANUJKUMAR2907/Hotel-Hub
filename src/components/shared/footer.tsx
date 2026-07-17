'use client';

import React from 'react';
import Link from 'next/link';
import { Hotel, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-border/20 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Hotel className="h-6 w-6 text-primary" />
              <span className="font-serif text-xl font-bold tracking-wide">GRAND LUXURY</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Experience the pinnacle of fine dining, luxury hospitality, and bespoke coastal resorts. Your five-star sanctuary awaits.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link href="#" className="p-2 rounded-full bg-muted/10 hover:bg-primary/20 text-muted-foreground hover:text-primary transition" aria-label="Facebook">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </Link>
              <Link href="#" className="p-2 rounded-full bg-muted/10 hover:bg-primary/20 text-muted-foreground hover:text-primary transition" aria-label="Instagram">
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </Link>
              <Link href="#" className="p-2 rounded-full bg-muted/10 hover:bg-primary/20 text-muted-foreground hover:text-primary transition" aria-label="Twitter">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground mb-4 uppercase">Quick Navigation</h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition">
                  Browse Hotels
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition">
                  About Our Brand
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground mb-4 uppercase">Contact Info</h3>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>101, Marine Drive, Netaji Subhash Road, Mumbai, MH, 400020, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>+91 22 2282 1234</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>reservations@grandluxuryhotel.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter signup */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground mb-4 uppercase">Club Member Registry</h3>
            <p className="text-xs text-muted-foreground leading-normal mb-3">
              Subscribe to unlock seasonal suites, member rates, and gourmet events.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-md border border-border/20 bg-muted/5 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow"
              >
                Join Registry
              </button>
            </form>
          </div>
        </div>

        <hr className="border-border/10 my-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; 2026 Grand Luxury Hotels Group. All rights reserved.</p>
          <p>Designed for B.Tech Final Year Project Demonstration.</p>
        </div>
      </div>
    </footer>
  );
}
