'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useGlobalLoader } from '@/context/loading-context';
import { Calendar, Users, Percent, CreditCard, Shield, MapPin, Receipt, Hotel } from 'lucide-react';

interface HotelDetails {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface CategoryDetails {
  id: string;
  name: string;
  pricePerNight: number;
}

export default function CheckoutPage() {
  const { id: hotelId, categoryId } = useParams() as { id: string; categoryId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { success, error, info } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();

  const checkInDate = searchParams.get('checkIn') || '';
  const checkOutDate = searchParams.get('checkOut') || '';
  const guestsCount = parseInt(searchParams.get('guests') || '1', 10);

  const [hotel, setHotel] = useState<HotelDetails | null>(null);
  const [category, setCategory] = useState<CategoryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Billing states
  const [nights, setNights] = useState(1);
  const [roomCharges, setRoomCharges] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE');
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState('');
  const [pendingRazorpayOrder, setPendingRazorpayOrder] = useState<any>(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      info('Please sign in to reserve a room');
      router.push(`/login?redirect=/hotels/${hotelId}/book/${categoryId}`);
      return;
    }

    const fetchData = async () => {
      try {
        const hotelRes = await fetch(`/api/hotels/${hotelId}`);
        const hotelData = await hotelRes.json();

        const catRes = await fetch(`/api/categories/${categoryId}`);
        const catData = await catRes.json();

        if (hotelData.success && catData.success) {
          setHotel(hotelData.hotel);
          setCategory(catData.category);

          // Calculate nights
          const inDate = new Date(checkInDate);
          const outDate = new Date(checkOutDate);
          const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
          const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setNights(calculatedNights);

          const charges = catData.category.pricePerNight * calculatedNights;
          setRoomCharges(charges);

          // Default Taxes (CGST 9% + SGST 9% + Luxury 2% = 20%)
          const defaultTax = charges * 0.2;
          setTaxAmount(defaultTax);
          setFinalAmount(charges + defaultTax);
        } else {
          error('Failed to load reservation data');
        }
      } catch (err) {
        console.error(err);
        error('Error loading checkout page');
      } finally {
        setLoading(false);
      }
    };

    if (user && hotelId && categoryId) {
      fetchData();
    }
  }, [user, authLoading, hotelId, categoryId, checkInDate, checkOutDate, router, info, error]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;

    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, amount: roomCharges }),
      });

      const data = await res.json();
      if (data.success) {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
        });

        // Recalculate bill
        const discountedCharges = roomCharges - data.discountAmount;
        const recalculatedTax = discountedCharges * 0.2; // 20% tax
        setTaxAmount(recalculatedTax);
        setFinalAmount(discountedCharges + recalculatedTax);
        success('Coupon applied: saved ₹' + data.discountAmount);
      } else {
        error(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      console.error(err);
      error('Error verifying coupon');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    const defaultTax = roomCharges * 0.2;
    setTaxAmount(defaultTax);
    setFinalAmount(roomCharges + defaultTax);
    info('Coupon code removed');
  };

  const handleCheckoutSubmit = async () => {
    setSubmitting(true);
    showLoader('Processing reservation details...');
    try {
      const bookingPayload = {
        hotelId,
        categoryId,
        checkInDate,
        checkOutDate,
        adults: guestsCount,
        children: 0,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const data = await res.json();

      if (data.success) {
        if (paymentMethod === 'ONLINE') {
          setPendingBookingId(data.booking.id);
          setPendingRazorpayOrder(data.razorpayOrder);
          
          hideLoader();
          // Trigger Razorpay UI or Mock
          if (data.razorpayOrder.isMock) {
            setShowMockPaymentModal(true);
          } else {
            // Load Razorpay Checkout SDK
            const options = {
              key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockkeyid12345',
              amount: data.razorpayOrder.amount,
              currency: 'INR',
              name: 'Grand Luxury Hotel',
              description: 'Suite Booking Payment',
              order_id: data.razorpayOrder.id,
              handler: function (response: any) {
                // Payment success callback from Razorpay
                success('Online Payment Captured!');
                showLoader('Redirecting to confirmation...');
                router.push(`/hotels/payment-success?bookingId=${data.booking.id}&paymentId=${response.razorpay_payment_id}`);
              },
              prefill: {
                name: user?.name,
                email: user?.email,
                contact: user?.phone || '',
              },
              theme: {
                color: '#c29f5d',
              },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          }
        } else {
          // Cash checkouts route directly to success screen
          success('Reservation confirmed successfully (Pay on Arrival)');
          showLoader('Confirming reservation...');
          router.push(`/hotels/payment-success?bookingId=${data.booking.id}&paymentMethod=CASH`);
        }
      } else {
        error(data.message || 'Checkout failed');
        hideLoader();
      }
    } catch (err) {
      console.error(err);
      error('Network error during checkout submission');
      hideLoader();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateMockPayment = () => {
    setShowMockPaymentModal(false);
    showLoader('Authorizing payment...');
    success('Mock Payment Authorized successfully!');
    router.push(`/hotels/payment-success?bookingId=${pendingBookingId}&paymentId=pay_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  };

  if (loading || authLoading) {
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

      {/* Embed Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>

      <main className="flex-grow py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-serif text-foreground font-semibold mb-8 border-b border-border pb-4">Room Booking Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Left side: Reservation Form & Payments */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hotel & Guest Details Summary */}
              <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-primary" /> Reservation Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Hotel:</span> {hotel?.name}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">City:</span> {hotel?.city}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Room Type:</span> {category?.name}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Capacity:</span> {guestsCount} Guest(s)
                  </div>
                </div>
              </div>

              {/* Guest Profile Card */}
              <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-serif font-semibold text-foreground">Guest Information</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Guest Name:</span> {user?.name}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Email Profile:</span> {user?.email}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Contact Phone:</span> {user?.phone || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Payment Selectors */}
              <div className="bg-card border border-border p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-foreground">Payment Settlement Option</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select your preferred check-out billing method</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('ONLINE')}
                    className={`p-4 border rounded-lg text-left flex items-start gap-3 transition cursor-pointer ${
                      paymentMethod === 'ONLINE' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <CreditCard className={`h-5 w-5 mt-0.5 shrink-0 ${paymentMethod === 'ONLINE' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Pay Securely Online</span>
                      <span className="text-xs text-muted-foreground">Settlement via cards, UPI, net banking or wallets via Razorpay.</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-4 border rounded-lg text-left flex items-start gap-3 transition cursor-pointer ${
                      paymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Receipt className={`h-5 w-5 mt-0.5 shrink-0 ${paymentMethod === 'CASH' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Pay on Arrival (CASH)</span>
                      <span className="text-xs text-muted-foreground">Settle payment in Cash / Card directly at the reception counter.</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Invoice bill & Coupon code */}
            <div className="space-y-8">
              {/* Bill Details */}
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
                <h3 className="text-lg font-serif font-semibold text-foreground border-b border-border pb-2.5">Price Summary</h3>
                
                <div className="space-y-3.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base rate (₹{category?.pricePerNight.toFixed(0)} x {nights} nights)</span>
                    <span className="font-semibold text-foreground">₹{roomCharges.toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-500 font-semibold">
                      <span>Discount (Coupon: {appliedCoupon.code})</span>
                      <span>-₹{appliedCoupon.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Taxes (GST & Luxury Tax 20%)</span>
                    <span className="font-semibold text-foreground">₹{taxAmount.toFixed(2)}</span>
                  </div>

                  <hr className="border-border" />
                  <div className="flex justify-between text-base font-bold text-foreground">
                    <span>Final Amount</span>
                    <span>₹{finalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutSubmit}
                  disabled={submitting}
                  className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {submitting ? 'Creating reservation...' : paymentMethod === 'ONLINE' ? 'Pay & Confirm' : 'Confirm Booking'}
                </button>
              </div>

              {/* Coupon Form */}
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-primary" /> Promotional Coupon
                </h3>
                
                {!appliedCoupon ? (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground uppercase placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition w-full"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-secondary text-secondary-foreground border border-border/20 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/90 transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-md text-xs">
                    <div>
                      Code <span className="font-bold">{appliedCoupon.code}</span> applied!
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-[10px] underline font-bold uppercase tracking-wider">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simulated Mock Payment Modal */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border p-6 rounded-xl shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="p-4 bg-primary/10 text-primary rounded-full w-fit mx-auto">
              <CreditCard className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Razorpay Sandbox</h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Simulating secure payment gateway transaction of <strong>₹{finalAmount.toFixed(2)}</strong> for booking reference.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSimulateMockPayment}
                className="w-full rounded-md bg-green-600 text-white py-2 text-sm font-semibold hover:bg-green-700 transition cursor-pointer"
              >
                Authorize Mock Charge
              </button>
              <button
                onClick={() => { setShowMockPaymentModal(false); error('Payment cancelled by user'); }}
                className="w-full rounded-md border border-border py-2 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer"
              >
                Decline Charge
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="h-3 w-3 text-green-500" /> Fully simulated secure sandbox checkout.
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
