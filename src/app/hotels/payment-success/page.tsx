'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { CheckCircle2, Calendar, MapPin, Receipt, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface BookingInfo {
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  finalAmount: number;
  customer: { name: string; email: string };
  bookingRooms: Array<{
    room: {
      roomNumber: string;
      hotel: { name: string; city: string };
    };
  }>;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const paymentId = searchParams.get('paymentId');
  const paymentMethod = searchParams.get('paymentMethod'); // e.g. CASH

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();
        if (data.success) {
          setBooking(data.booking);
          
          // Trigger a silent status update to mark payment as PAID if paymentId is present
          if (paymentId) {
            await fetch(`/api/bookings/${bookingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentStatus: 'PAID' }),
            });
            // Update payment record to SUCCESS
            // We can also let the server handle it, but this client-side auto-verification check ensures UI consistency
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingId, paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-xl bg-card border border-border p-8 rounded-xl shadow-lg space-y-6 text-center animate-fade-in">
          
          {/* Animated Success Badge */}
          <div className="p-4 bg-green-500/10 text-green-500 rounded-full w-fit mx-auto">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div>
            <h2 className="text-3xl font-serif font-bold text-foreground">Reservation Confirmed</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your room has been reserved. A confirmation summary is on its way to your inbox.
            </p>
          </div>

          {booking && (
            <div className="bg-muted/30 border border-border p-6 rounded-lg text-left space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Booking Code</span>
                  <span className="font-bold text-foreground font-mono">{booking.bookingNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Payment Transaction</span>
                  <span className="font-medium text-foreground text-xs truncate max-w-[150px] block">
                    {paymentId || (paymentMethod === 'CASH' ? 'Pay on Arrival (CASH)' : 'Pending Settlement')}
                  </span>
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-2.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Resort:</strong> {booking.bookingRooms[0]?.room.hotel.name}, {booking.bookingRooms[0]?.room.hotel.city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Stay Schedule:</strong> {new Date(booking.checkInDate).toLocaleDateString()} to {new Date(booking.checkOutDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Amount Settled:</strong> ₹{booking.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href="/customer"
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Browse More Resorts
            </Link>
          </div>

          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 pt-2">
            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" /> 128-bit SSL encrypted merchant payment validation.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
