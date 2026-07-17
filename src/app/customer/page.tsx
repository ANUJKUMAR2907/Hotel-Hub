'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { 
  User, Calendar, Compass, Star, FileText, Send, XCircle, 
  Loader2, Sparkles, LogOut, CheckCircle, BellRing, Utensils, QrCode
} from 'lucide-react';

interface Booking {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  status: string;
  paymentStatus: string;
  finalAmount: number;
  bookingRooms: Array<{
    room: {
      roomNumber: string;
      hotel: { id: string; name: string; city: string };
    };
  }>;
}

interface ServiceRequest {
  id: string;
  bookingNumber: string;
  roomNumber: string;
  serviceType: string;
  description: string;
  quantity: number;
  price: number;
  status: string;
  createdAt: string;
}

export default function CustomerDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'profile' | 'review'>('bookings');
  const [loading, setLoading] = useState(true);

  // Data lists
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<ServiceRequest[]>([]);

  // Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileDocType, setProfileDocType] = useState('Aadhaar');
  const [profileDocNum, setProfileDocNum] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Review Form States
  const [reviewHotelId, setReviewHotelId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Service Order Form States
  const [serviceBookingId, setServiceBookingId] = useState('');
  const [serviceType, setServiceType] = useState<'FOOD' | 'LAUNDRY'>('FOOD');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceQty, setServiceQty] = useState(1);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // Invoice display modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch bookings
      const bookingsRes = await fetch('/api/bookings');
      const bookingsData = await bookingsRes.json();
      if (bookingsData.success) {
        setBookings(bookingsData.bookings);
      }

      // 2. Fetch service requests
      const servicesRes = await fetch('/api/services');
      const servicesData = await servicesRes.json();
      if (servicesData.success) {
        setServices(servicesData.services);
      }
    } catch (err) {
      console.error(err);
      error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Initialize profile forms
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      // @ts-ignore
      setProfileAddress(user.customer?.address || '');
      // @ts-ignore
      setProfileDocType(user.customer?.documentType || 'Aadhaar');
      // @ts-ignore
      setProfileDocNum(user.customer?.documentNumber || '');

      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  // Profile Update handler
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          address: profileAddress,
          documentType: profileDocType,
          documentNumber: profileDocNum,
          password: profilePassword || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Profile updated successfully');
        setProfilePassword('');
      } else {
        error(data.message || 'Profile update failed');
      }
    } catch (err) {
      console.error(err);
      error('Error updating profile settings');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Review Submit handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewHotelId || !reviewComment) {
      error('Please select a hotel and enter comments.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: reviewHotelId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success(data.message || 'Review submitted for approval!');
        setReviewComment('');
        setActiveTab('bookings');
      } else {
        error(data.message || 'Review submission failed');
      }
    } catch (err) {
      console.error(err);
      error('Error submitting review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Service Request submit handler
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceBookingId || !serviceDesc) {
      error('Please select an active booking and specify service description');
      return;
    }

    setServiceSubmitting(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: serviceBookingId,
          serviceType,
          description: serviceDesc,
          quantity: serviceQty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Room Service request placed successfully!');
        setServiceDesc('');
        setServiceQty(1);
        fetchDashboardData(); // Reload list
      } else {
        error(data.message || 'Service request failed');
      }
    } catch (err) {
      console.error(err);
      error('Error placing service order');
    } finally {
      setServiceSubmitting(false);
    }
  };

  // Cancel reservation handler
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will restore the room to available list.')) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const data = await res.json();
      if (data.success) {
        success('Booking cancelled and room released.');
        fetchDashboardData(); // reload
      } else {
        error(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      console.error(err);
      error('Error cancelling reservation');
    }
  };

  // Fetch and display Invoice
  const handleViewInvoice = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      if (data.success && data.booking.invoices && data.booking.invoices.length > 0) {
        setSelectedInvoice({
          ...data.booking.invoices[0],
          bookingNumber: data.booking.bookingNumber,
          customerName: data.booking.customer.name,
          checkIn: new Date(data.booking.checkInDate).toLocaleDateString(),
          checkOut: new Date(data.booking.checkOutDate).toLocaleDateString(),
        });
        setShowInvoiceModal(true);
      } else {
        info('No invoice generated. Invoice is compiled during checkout at reception.');
      }
    } catch (err) {
      console.error(err);
      error('Error reading invoice details');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sidebar Nav */}
          <div className="bg-card border border-border p-6 rounded-xl space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <div className="p-3.5 bg-primary/10 text-primary rounded-full w-fit mx-auto mb-3">
                <User className="h-6 w-6" />
              </div>
              <h3 className="font-serif font-semibold text-foreground text-md leading-tight">{user?.name}</h3>
              <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-2 inline-block">
                Registered Guest
              </span>
            </div>

            <nav className="flex flex-col gap-1 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`w-full py-2.5 px-4 rounded-md text-left flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'bookings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Reservations
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`w-full py-2.5 px-4 rounded-md text-left flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'services' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Utensils className="h-4 w-4" />
                In-Room Orders
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full py-2.5 px-4 rounded-md text-left flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <User className="h-4 w-4" />
                Profile Settings
              </button>

              <button
                onClick={() => setActiveTab('review')}
                className={`w-full py-2.5 px-4 rounded-md text-left flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'review' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Star className="h-4 w-4" />
                Submit Review
              </button>

              <hr className="border-border my-2" />

              <button
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-md text-left flex items-center gap-2.5 text-red-500 hover:text-red-700 hover:bg-red-500/5 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </nav>
          </div>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-3 bg-card border border-border p-8 rounded-xl min-h-[500px]">
            
            {/* Bookings / Reservations Tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Your Reservations</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage details of bookings and checkout invoice records</p>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Calendar className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">You have not booked any rooms yet.</p>
                    <button
                      onClick={() => router.push('/')}
                      className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer"
                    >
                      Browse Resorts
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const roomObj = booking.bookingRooms[0]?.room;
                      const isCancellable = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
                      return (
                        <div key={booking.id} className="border border-border p-5 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm hover:shadow transition">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground font-mono">{booking.bookingNumber}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN'
                                  ? 'bg-green-500/10 text-green-500'
                                  : booking.status === 'PENDING'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : booking.status === 'CANCELLED'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong>Hotel:</strong> {roomObj?.hotel.name || 'TBD'} ({roomObj?.hotel.city || 'TBD'})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Schedule:</strong> {new Date(booking.checkInDate).toLocaleDateString()} to {new Date(booking.checkOutDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Price paid:</strong> ₹{booking.finalAmount.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex sm:flex-col gap-2 shrink-0">
                            {booking.status === 'CHECKED_OUT' && (
                              <button
                                onClick={() => handleViewInvoice(booking.id)}
                                className="flex items-center justify-center gap-1.5 rounded-md bg-secondary text-secondary-foreground border border-border/20 py-2 px-3 text-xs font-semibold hover:bg-secondary/90 transition shadow-sm cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View Invoice
                              </button>
                            )}
                            {isCancellable && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="flex items-center justify-center gap-1.5 rounded-md border border-red-500/20 text-red-500 hover:bg-red-500/5 py-2 px-3 text-xs font-semibold transition cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel Stay
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* In-Room Orders Tab */}
            {activeTab === 'services' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">In-Room Food & Laundry Orders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Order hotel room services and monitor delivery logistics</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Order Form */}
                  <div className="md:col-span-1 border border-border p-5 rounded-lg space-y-4 h-fit">
                    <h3 className="font-serif font-semibold text-foreground">Place Service Request</h3>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                      
                      {/* Select Booking */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Stay Booking</label>
                        <select
                          value={serviceBookingId}
                          onChange={(e) => setServiceBookingId(e.target.value)}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition w-full"
                        >
                          <option value="">-- Select Active Booking --</option>
                          {bookings.filter(b => b.status === 'CHECKED_IN').map(b => (
                            <option key={b.id} value={b.id}>{b.bookingNumber} - Room {b.bookingRooms[0]?.room.roomNumber}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Service Type */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Category</label>
                        <select
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value as 'FOOD' | 'LAUNDRY')}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition w-full"
                        >
                          <option value="FOOD">Food Ordering (₹250/item)</option>
                          <option value="LAUNDRY">Laundry Service (₹120/item)</option>
                        </select>
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item Details</label>
                        <textarea
                          placeholder="e.g. 2 Paneer Butter Masala, 4 Rotis, or 3 Shirts wash"
                          value={serviceDesc}
                          onChange={(e) => setServiceDesc(e.target.value)}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition w-full h-20 resize-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={serviceQty}
                          onChange={(e) => setServiceQty(parseInt(e.target.value, 10))}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition w-full"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={serviceSubmitting}
                        className="w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer"
                      >
                        {serviceSubmitting ? 'Submitting...' : 'Place Order'}
                      </button>
                    </form>
                  </div>

                  {/* Orders List */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-serif font-semibold text-foreground border-b border-border pb-2.5">In-Room Request Status</h3>
                    
                    {services.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-8">No room service requests placed yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {services.map((srv) => (
                          <div key={srv.id} className="border border-border p-4 rounded-lg flex items-center justify-between text-xs hover:shadow-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                  srv.serviceType === 'FOOD' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                  {srv.serviceType}
                                </span>
                                <span className="font-semibold text-foreground font-mono">{srv.bookingNumber} (Room {srv.roomNumber})</span>
                              </div>
                              <p className="text-muted-foreground"><strong>Detail:</strong> {srv.description} x{srv.quantity}</p>
                              <span className="text-[10px] text-muted-foreground/60">{new Date(srv.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="text-right">
                              <span className={`font-semibold uppercase px-2 py-0.5 rounded-full ${
                                srv.status === 'COMPLETED'
                                  ? 'bg-green-500/10 text-green-500'
                                  : srv.status === 'PENDING'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {srv.status}
                              </span>
                              <span className="block font-bold text-foreground mt-2">₹{(srv.price * srv.quantity).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Settings Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Profile Settings</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage password credentials and document registration</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Guest Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Phone Number</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Billing Address</label>
                    <textarea
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      rows={2}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Document Type</label>
                      <select
                        value={profileDocType}
                        onChange={(e) => setProfileDocType(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none w-full"
                      >
                        <option value="Aadhaar">Aadhaar Card</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Document Number</label>
                      <input
                        type="text"
                        placeholder="ID details"
                        value={profileDocNum}
                        onChange={(e) => setProfileDocNum(e.target.value)}
                        className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Update Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Enter new password to change"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileSubmitting}
                    className="rounded-md bg-primary py-2 px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer mt-4"
                  >
                    {profileSubmitting ? 'Saving Changes...' : 'Save Settings'}
                  </button>
                </form>
              </div>
            )}

            {/* Write Review Tab */}
            {activeTab === 'review' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Submit Hotel Feedback</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Tell us about your stay experience. Ratings are public after admin review.</p>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-lg">
                  {/* Select Stay Hotel */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Select Stay Resort</label>
                    <select
                      value={reviewHotelId}
                      onChange={(e) => setReviewHotelId(e.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                    >
                      <option value="">-- Choose Hotel --</option>
                      {/* Gather unique checked-out hotels */}
                      {bookings.filter(b => b.status === 'CHECKED_OUT').map((b) => {
                        const h = b.bookingRooms[0]?.room.hotel;
                        return <option key={h?.id} value={h?.id}>{h?.name} ({h?.city})</option>;
                      })}
                    </select>
                  </div>

                  {/* Rating selection (1-5 stars) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Overall Rating</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none cursor-pointer"
                        >
                          <Star className={`h-6 w-6 ${star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Feedback Comments</label>
                    <textarea
                      placeholder="Tell us about the suite cleaning, food service quality, spa experiences..."
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="rounded-md bg-primary py-2 px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer mt-4"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Invoice Details Modal (Printable, QR Code embedded) */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Modal Actions Header */}
            <div className="bg-muted p-4 border-b border-border flex justify-between items-center no-print">
              <h3 className="font-serif font-semibold text-foreground text-sm">Receipt Summary</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition cursor-pointer"
                >
                  Print Bill
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="rounded-md border border-border px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Invoice Page Body */}
            <div className="p-8 space-y-8 overflow-y-auto flex-grow print-card bg-card text-card-foreground">
              {/* Branding header */}
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground leading-none">GRAND LUXURY</h2>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mt-1 font-semibold">Resort Billing Bill</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground block font-mono">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-[10px] text-muted-foreground block">{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Guest & Reservation Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground block">Guest Account Profile</span>
                  <span className="font-bold text-foreground text-sm">{selectedInvoice.customerName}</span>
                  <span className="text-muted-foreground block mt-1">Stay reference: {selectedInvoice.bookingNumber}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-muted-foreground block">Period of Stay</span>
                  <span className="font-bold text-foreground text-sm">{selectedInvoice.checkIn} to {selectedInvoice.checkOut}</span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                    <th className="py-2.5">Service Description</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  <tr>
                    <td className="py-3 text-foreground font-medium">Room Lodging charges (Base Rate)</td>
                    <td className="py-3 text-right font-semibold text-foreground">₹{selectedInvoice.roomCharges.toFixed(2)}</td>
                  </tr>
                  {selectedInvoice.foodCharges > 0 && (
                    <tr>
                      <td className="py-3">Food & Restaurant Service ordering</td>
                      <td className="py-3 text-right">₹{selectedInvoice.foodCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  {selectedInvoice.laundryCharges > 0 && (
                    <tr>
                      <td className="py-3">Laundry & Dry-cleaning service log</td>
                    </tr>
                  )}
                  {selectedInvoice.lateCheckoutCharges > 0 && (
                    <tr>
                      <td className="py-3">Late check-out extra hour fees</td>
                      <td className="py-3 text-right">₹{selectedInvoice.lateCheckoutCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  {selectedInvoice.damageCharges > 0 && (
                    <tr>
                      <td className="py-3 text-red-500">Damage compensation penalty</td>
                      <td className="py-3 text-right text-red-500">₹{selectedInvoice.damageCharges.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total calculations & QR code */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-border">
                {/* QR Code Scannable */}
                {selectedInvoice.qrCode && (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 bg-white p-2 rounded border border-border">
                    <img 
                      src={selectedInvoice.qrCode} 
                      alt="Scannable Invoice QR Verification" 
                      className="h-28 w-28"
                    />
                    <span className="text-[8px] text-slate-800 font-bold uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="h-3 w-3" /> Scan to Verify
                    </span>
                  </div>
                )}

                {/* Subtotals list */}
                <div className="w-full sm:max-w-xs text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base Subtotal</span>
                    <span className="font-semibold text-foreground">₹{(selectedInvoice.roomCharges + selectedInvoice.serviceCharges + selectedInvoice.lateCheckoutCharges + selectedInvoice.damageCharges).toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>Discount Coupon Deducted</span>
                      <span className="font-bold">-₹{selectedInvoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax Surcharge (20%)</span>
                    <span className="font-semibold text-foreground">₹{selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <hr className="border-border/40" />
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total Bill Paid</span>
                    <span>₹{selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Legal Note footer */}
              <div className="text-center text-[10px] text-muted-foreground/60 border-t border-border/20 pt-6">
                Thank you for staying at Grand Luxury Hotels. This is a computer-generated transaction receipt. 
                <br />No signature required. 128-bit SSL encrypted.
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
