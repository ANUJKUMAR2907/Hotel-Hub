import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/context/theme-context";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { LoadingProvider } from "@/context/loading-context";
import RouteProgressBar from "@/components/shared/route-progress-bar";

export const metadata: Metadata = {
  title: "Grand Luxury Hotel | Five-Star Reserving Experience",
  description: "Book fine suites, penthouses, and resort rooms. Complete check-in and check-out management system for staff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LoadingProvider>
              <ToastProvider>
                <RouteProgressBar />
                {children}
              </ToastProvider>
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
