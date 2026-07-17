'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { 
  Loader2, Grid, CalendarPlus, UserCheck, UserX, ClipboardList, 
  Users, Key, HelpCircle, AlertCircle, RefreshCw, CheckCircle,
  Clock, CheckSquare, Trash, Ban, ShieldCheck, Printer, QrCode
} from 'lucide-react';

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  cleaningStatus: string;
  category: { name: string; pricePerNight: number };
}

interface DueBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  roomNumber: string;
  paymentStatus: string;
  status: string;
}

interface ServiceQueueItem {
  id: string;
  roomNumber: string;
  serviceType: string;
  description: string;
  quantity: number;
  createdAt: string;
}

export default function ReceptionDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'due' | 'services' | 'walkin'>('grid');
  const [loading, setLoading] = useState(true);

  // Reception states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [checkins, setCheckins] = useState<DueBooking[]>([]);
  const [checkouts, setCheckouts] = useState<DueBooking[]>([]);
  const [serviceQueue, setServiceQueue] = useState<ServiceQueueItem[]>([]);

  // Walk-in booking states
  const [walkinHotelId, setWalkinHotelId] = useState('');
  const [walkinCategory, setWalkinCategory] = useState('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinIn, setWalkinIn] = useState('');
  const [walkinOut, setWalkinOut] = useState('');
  const [walkinGuests, setWalkinGuests] = useState(1);
  const [walkinMethod, setWalkinMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  // Checkin Modal
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [assignedKey, setAssignedKey] = useState('');
  const [checkinRoomNum, setCheckinRoomNum] = useState('');

  // Checkout billing states
  const [selectedCheckoutBooking, setSelectedCheckoutBooking] = useState<DueBooking | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutLateFee, setCheckoutLateFee] = useState(0);
  const [checkoutDamageFee, setCheckoutDamageFee] = useState(0);
  const [checkoutMethod, setCheckoutMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  
  // Printed Invoice Display
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchReceptionData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch live metrics
      const statusRes = await fetch('/api/reception/status');
      const statusData = await statusRes.json();
      if (statusData.success) {
        setCounts(statusData.statusCounts);
        setCheckins(statusData.checkinsDue);
        setCheckouts(statusData.checkoutsDue);
        setServiceQueue(statusData.pendingServices);
        setWalkinHotelId(statusData.hotelId);
      }

      // 2. Fetch all rooms
      const roomsRes = await fetch(`/api/rooms?hotelId=${statusData.hotelId || ''}`);
      const roomsData = await roomsRes.json();
      if (roomsData.success) {
        setRooms(roomsData.rooms);
      }
    } catch (err) {
      console.error(err);
      error('Error loading receptionist panel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'RECEPTIONIST' && user.role !== 'SUPER_ADMIN'))) {
      error('Access restricted to front-desk staff.');
      router.push('/login');
      return;
    }

    if (user) {
      fetchReceptionData();
    }
  }, [user, authLoading, router]);

  // Toggle Room details / status
  const handleToggleRoomStatus = async (roomId: string, currentStatus: string, cleaning: string) => {
    const nextStatus = currentStatus === 'Available' ? 'Blocked' : currentStatus === 'Blocked' ? 'Maintenance' : 'Available';
    const nextCleaning = cleaning === 'Clean' ? 'Dirty' : 'Clean';
    
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, cleaningStatus: nextCleaning }),
      });

      const data = await res.json();
      if (data.success) {
        success('Room details updated.');
        fetchReceptionData();
      } else {
        error(data.message || 'Failed to toggle room');
      }
    } catch (err) {
      error('Error saving room status');
    }
  };

  // Walk-in submit handler
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinCategory || !walkinName || !walkinEmail || !walkinPhone || !walkinIn || !walkinOut) {
      error('Please fill in all details for guest registration');
      return;
    }

    setWalkinSubmitting(true);
    try {
      const payload = {
        hotelId: walkinHotelId,
        categoryId: walkinCategory,
        guestName: walkinName,
        guestEmail: walkinEmail,
        guestPhone: walkinPhone,
        checkInDate: walkinIn,
        checkOutDate: walkinOut,
        adults: walkinGuests,
        paymentMethod: walkinMethod,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        success('Walk-in booking created: ' + data.booking.bookingNumber);
        // Reset
        setWalkinName('');
        setWalkinEmail('');
        setWalkinPhone('');
        setWalkinIn('');
        setWalkinOut('');
        fetchReceptionData();
        setActiveSubTab('grid');
      } else {
        error(data.message || 'Booking failed');
      }
    } catch (err) {
      error('Error executing checkout transaction');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Checkin submission
  const handleCheckinSubmit = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setAssignedKey(data.roomKey);
        setCheckinRoomNum(data.roomNumber);
        setShowCheckinModal(true);
        success('Checked in guest successfully!');
        fetchReceptionData();
      } else {
        error(data.message || 'Checkin failed');
      }
    } catch (err) {
      error('Error completing check-in');
    }
  };

  // Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckoutBooking) return;

    setCheckoutSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${selectedCheckoutBooking.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateCheckoutCharges: checkoutLateFee,
          damageCharges: checkoutDamageFee,
          extraPaymentMethod: checkoutMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Checkout completed!');
        setInvoiceResult({
          ...data.invoice,
          customerName: selectedCheckoutBooking.customerName,
          bookingNumber: selectedCheckoutBooking.bookingNumber,
        });
        
        setShowCheckoutModal(false);
        setShowInvoiceModal(true);
        fetchReceptionData();
      } else {
        error(data.message || 'Checkout failed');
      }
    } catch (err) {
      error('Error completing check-out');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Resolve service queue status toggles
  const handleResolveService = async (serviceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Service marked as ${nextStatus}`);
        fetchReceptionData();
      } else {
        error('Failed to update service queue');
      }
    } catch (err) {
      error('Error resolving service');
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
        {/* Statistics header */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Available Rooms</span>
            <span className="text-2xl font-bold text-green-500 mt-1 block">{counts?.Available || 0}</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Occupied Rooms</span>
            <span className="text-2xl font-bold text-blue-500 mt-1 block">{counts?.Occupied || 0}</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Cleaning / Dirty</span>
            <span className="text-2xl font-bold text-orange-500 mt-1 block">{counts?.Cleaning || 0}</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Maintenance</span>
            <span className="text-2xl font-bold text-red-500 mt-1 block">{counts?.Maintenance || 0}</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm col-span-2 md:col-span-1 text-center flex items-center justify-center gap-2">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Rooms Inventory: {counts?.total || 0}</span>
          </div>
        </section>

        {/* Tab Headers */}
        <section className="flex border-b border-border mb-8 text-sm font-semibold">
          <button
            onClick={() => setActiveSubTab('grid')}
            className={`py-3 px-6 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'grid' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="h-4 w-4" />
            Live Room Grid
          </button>
          <button
            onClick={() => setActiveSubTab('due')}
            className={`py-3 px-6 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'due' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Check-In / Out Queue ({checkins.length + checkouts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-3 px-6 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            In-Room Service Orders ({serviceQueue.length})
          </button>
          <button
            onClick={() => setActiveSubTab('walkin')}
            className={`py-3 px-6 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'walkin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Walk-In Booking
          </button>
        </section>

        {/* Tab Contents */}
        <section className="bg-card border border-border p-8 rounded-xl min-h-[400px]">
          
          {/* Room Grid */}
          {activeSubTab === 'grid' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">Live Room Board</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Click room cards to cycle statuses (Available &lt;&gt; Blocked &lt;&gt; Maintenance)</p>
              </div>

              {rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No rooms loaded. Seeding database first recommended.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {rooms.map((room) => {
                    const isOccupied = room.status === 'Occupied';
                    const isBooked = room.status === 'Booked';
                    const isClean = room.cleaningStatus === 'Clean';
                    const isMaintenance = room.status === 'Maintenance';
                    const isBlocked = room.status === 'Blocked';

                    return (
                      <button
                        key={room.id}
                        onClick={() => handleToggleRoomStatus(room.id, room.status, room.cleaningStatus)}
                        className={`p-4 border rounded-lg text-center flex flex-col justify-between items-center gap-2.5 transition shadow-sm hover:scale-102 hover:shadow cursor-pointer ${
                          isOccupied
                            ? 'border-blue-500 bg-blue-500/10'
                            : isBooked
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : isMaintenance
                            ? 'border-red-500 bg-red-500/10'
                            : isBlocked
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : room.status === 'Cleaning'
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-green-500 bg-green-500/10'
                        }`}
                      >
                        <div className="text-lg font-bold text-foreground font-mono leading-none">{room.roomNumber}</div>
                        <div className="text-[9px] font-semibold text-muted-foreground truncate w-full max-w-[80px]">
                          {room.category.name}
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-card ${
                            isOccupied ? 'text-blue-500' : isBooked ? 'text-indigo-500' : isMaintenance ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {room.status}
                          </span>
                          <span className={`text-[7px] font-bold uppercase ${isClean ? 'text-green-500/80' : 'text-orange-500/80'}`}>
                            {room.cleaningStatus}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Queue Tab */}
          {activeSubTab === 'due' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Check-ins Due */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                  <UserCheck className="h-5 w-5 text-green-500" /> Check-Ins Due Today
                </h3>
                {checkins.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No guest check-ins pending for today.</p>
                ) : (
                  <div className="space-y-3">
                    {checkins.map((c) => (
                      <div key={c.id} className="border border-border p-4 rounded-lg flex items-center justify-between text-xs hover:shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground">{c.customerName}</h4>
                          <p className="text-muted-foreground"><strong>Code:</strong> {c.bookingNumber} | <strong>Room:</strong> {c.roomNumber}</p>
                          <p className="text-muted-foreground"><strong>Phone:</strong> {c.customerPhone}</p>
                        </div>
                        <button
                          onClick={() => handleCheckinSubmit(c.id)}
                          className="rounded bg-green-600 text-white font-semibold px-3 py-1.5 hover:bg-green-700 transition cursor-pointer"
                        >
                          Check-In
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Check-outs Due */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                  <UserX className="h-5 w-5 text-red-500" /> Check-Outs Due Today
                </h3>
                {checkouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No guest check-outs pending for today.</p>
                ) : (
                  <div className="space-y-3">
                    {checkouts.map((c) => (
                      <div key={c.id} className="border border-border p-4 rounded-lg flex items-center justify-between text-xs hover:shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground">{c.customerName}</h4>
                          <p className="text-muted-foreground"><strong>Code:</strong> {c.bookingNumber} | <strong>Room:</strong> {c.roomNumber}</p>
                          <p className="text-muted-foreground"><strong>Phone:</strong> {c.customerPhone}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedCheckoutBooking(c); setShowCheckoutModal(true); }}
                          className="rounded bg-red-600 text-white font-semibold px-3 py-1.5 hover:bg-red-700 transition cursor-pointer"
                        >
                          Check-Out
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Requests */}
          {activeSubTab === 'services' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">In-Room Delivery Queue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fulfill room request services. Click status pill to advance.</p>
              </div>

              {serviceQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">No pending service orders.</p>
              ) : (
                <div className="space-y-3">
                  {serviceQueue.map((item) => (
                    <div key={item.id} className="border border-border p-4 rounded-lg flex items-center justify-between text-xs hover:shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm font-mono">Room {item.roomNumber}</span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                            {item.serviceType}
                          </span>
                        </div>
                        <p className="text-muted-foreground"><strong>Detail:</strong> {item.description} x{item.quantity}</p>
                        <span className="text-[10px] text-muted-foreground/60">{new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <button
                        onClick={() => handleResolveService(item.id, 'PENDING')}
                        className="rounded border border-primary/40 text-primary bg-primary/5 hover:bg-primary px-3.5 py-1.5 font-semibold hover:text-primary-foreground transition cursor-pointer"
                      >
                        Fulfill Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Walk-in Booking */}
          {activeSubTab === 'walkin' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">Quick Walk-In Registration</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Book a room directly on behalf of physical walk-in customer</p>
              </div>

              <form onSubmit={handleWalkinSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Select Room Category</label>
                    <select
                      value={walkinCategory}
                      onChange={(e) => setWalkinCategory(e.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none w-full"
                    >
                      <option value="">-- Choose Category --</option>
                      {/* Pull from rooms unique category id list or just seed placeholders */}
                      <option value="Standard Queen Room">Standard Queen Room (3500/night)</option>
                      <option value="Deluxe Suite">Deluxe Suite (7500/night)</option>
                      <option value="Presidential Penthouse">Presidential Penthouse (18000/night)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Guests Count</label>
                    <select
                      value={walkinGuests}
                      onChange={(e) => setWalkinGuests(parseInt(e.target.value, 10))}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none w-full"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Customer Full Name</label>
                  <input
                    type="text"
                    placeholder="Guest Name"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Guest Email Address</label>
                    <input
                      type="email"
                      placeholder="guest@mail.com"
                      value={walkinEmail}
                      onChange={(e) => setWalkinEmail(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="10 digit number"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Check-In Date</label>
                    <input
                      type="date"
                      value={walkinIn}
                      onChange={(e) => setWalkinIn(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Check-Out Date</label>
                    <input
                      type="date"
                      value={walkinOut}
                      onChange={(e) => setWalkinOut(e.target.value)}
                      className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Payment Settlement Option</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="walkinPayment"
                        value="CASH"
                        checked={walkinMethod === 'CASH'}
                        onChange={() => setWalkinMethod('CASH')}
                        className="text-primary focus:ring-primary"
                      />
                      Pay on Arrival (CASH)
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="walkinPayment"
                        value="CARD"
                        checked={walkinMethod === 'CARD'}
                        onChange={() => setWalkinMethod('CARD')}
                        className="text-primary focus:ring-primary"
                      />
                      Pay immediately via Terminal Card
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={walkinSubmitting}
                  className="rounded-md bg-primary py-2.5 px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer mt-4"
                >
                  {walkinSubmitting ? 'Registering Guest...' : 'Create Booking'}
                </button>
              </form>
            </div>
          )}

        </section>
      </main>

      {/* Checkin Success Key Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border p-6 rounded-xl shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="p-4 bg-green-500/10 text-green-500 rounded-full w-fit mx-auto animate-bounce">
              <Key className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">RFID Room Key Encoded</h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                Room <strong>{checkinRoomNum}</strong> has been set to Occupied. Please hand over the physical card.
              </p>
            </div>

            <div className="bg-muted p-3.5 rounded font-mono font-bold text-foreground text-md border border-dashed border-border tracking-wider">
              {assignedKey}
            </div>

            <button
              onClick={() => setShowCheckinModal(false)}
              className="w-full rounded bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 transition cursor-pointer"
            >
              Handover & Close
            </button>
          </div>
        </div>
      )}

      {/* Checkout Add-on Billing Modal */}
      {showCheckoutModal && selectedCheckoutBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-6 animate-scale-up">
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Check-Out Billing Invoice</h3>
              <p className="text-xs text-muted-foreground mt-1">Compile extra add-on room charges for booking: {selectedCheckoutBooking.bookingNumber}</p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Late Check-Out Fees (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={checkoutLateFee}
                    onChange={(e) => setCheckoutLateFee(parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Damage Penalties (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={checkoutDamageFee}
                    onChange={(e) => setCheckoutDamageFee(parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Outstanding Payment Mode</label>
                <select
                  value={checkoutMethod}
                  onChange={(e) => setCheckoutMethod(e.target.value as 'CASH' | 'CARD' | 'UPI')}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                >
                  <option value="CASH">Cash Settlement</option>
                  <option value="CARD">Terminal Card Payment</option>
                  <option value="UPI">UPI Scan QR</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 rounded border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  disabled={checkoutSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-red-600 text-white py-2 text-xs font-semibold hover:bg-red-700 transition cursor-pointer flex items-center justify-center gap-1"
                  disabled={checkoutSubmitting}
                >
                  {checkoutSubmitting ? 'Compiling...' : 'Confirm Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Result Modal */}
      {showInvoiceModal && invoiceResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Modal Actions Header */}
            <div className="bg-muted p-4 border-b border-border flex justify-between items-center no-print">
              <h3 className="font-serif font-semibold text-foreground text-sm">Receipt Summary</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition cursor-pointer flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
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
                  <h2 className="text-2xl font-serif font-bold text-foreground leading-none">Hotel-Hub</h2>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mt-1 font-semibold">Resort Billing Bill</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground block font-mono">{invoiceResult.invoiceNumber}</span>
                  <span className="text-[10px] text-muted-foreground block">{new Date(invoiceResult.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Guest & Reservation Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground block">Guest Account Profile</span>
                  <span className="font-bold text-foreground text-sm">{invoiceResult.customerName}</span>
                  <span className="text-muted-foreground block mt-1">Stay reference: {invoiceResult.bookingNumber}</span>
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
                    <td className="py-3 text-right font-semibold text-foreground">₹{invoiceResult.roomCharges.toFixed(2)}</td>
                  </tr>
                  {invoiceResult.foodCharges > 0 && (
                    <tr>
                      <td className="py-3">Food & Restaurant Service ordering</td>
                      <td className="py-3 text-right">₹{invoiceResult.foodCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceResult.laundryCharges > 0 && (
                    <tr>
                      <td className="py-3">Laundry & Dry-cleaning service log</td>
                      <td className="py-3 text-right">₹{invoiceResult.laundryCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceResult.lateCheckoutCharges > 0 && (
                    <tr>
                      <td className="py-3">Late check-out extra hour fees</td>
                      <td className="py-3 text-right">₹{invoiceResult.lateCheckoutCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceResult.damageCharges > 0 && (
                    <tr>
                      <td className="py-3 text-red-500">Damage compensation penalty</td>
                      <td className="py-3 text-right text-red-500">₹{invoiceResult.damageCharges.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total calculations & QR code */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-border">
                {/* QR Code Scannable */}
                {invoiceResult.qrCode && (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 bg-white p-2 rounded border border-border">
                    <img 
                      src={invoiceResult.qrCode} 
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
                    <span className="font-semibold text-foreground">₹{(invoiceResult.roomCharges + invoiceResult.serviceCharges + invoiceResult.lateCheckoutCharges + invoiceResult.damageCharges).toFixed(2)}</span>
                  </div>
                  {invoiceResult.discountAmount > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>Discount Coupon Deducted</span>
                      <span className="font-bold">-₹{invoiceResult.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax Surcharge (20%)</span>
                    <span className="font-semibold text-foreground">₹{invoiceResult.taxAmount.toFixed(2)}</span>
                  </div>
                  <hr className="border-border/40" />
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total Bill Paid</span>
                    <span>₹{invoiceResult.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Legal Note footer */}
              <div className="text-center text-[10px] text-muted-foreground/60 border-t border-border/20 pt-6">
                Thank you for staying at Hotel Hub. This is a computer-generated transaction receipt. 
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
