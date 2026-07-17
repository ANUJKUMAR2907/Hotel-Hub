'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';
import { MapPin, Star, Wifi, Wind, Tv, Sparkles, Bell, Shield, Coffee, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface Amenity {
  id: string;
  name: string;
  icon: string;
}

interface RoomCategory {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  hasAC: boolean;
  images: string;
  roomAmenities: Array<{ amenity: Amenity }>;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer: { name: string };
}

interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  email: string;
  phone: string;
  images: string;
  rating: number;
  roomCategories: RoomCategory[];
  reviews: Review[];
}

export default function HotelDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useToast();
  const { user } = useAuth();
  
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');

  // Default dates for booking link (default: tomorrow to day after)
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getDayAfterTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState(searchParams.get('checkInDate') || getTomorrow());
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOutDate') || getDayAfterTomorrow());
  const [guests, setGuests] = useState(searchParams.get('guests') || '1');

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        const res = await fetch(`/api/hotels/${id}`);
        const data = await res.json();
        if (data.success) {
          setHotel(data.hotel);
          setActiveImage(data.hotel.images.split(',')[0]);
        } else {
          error(data.message || 'Hotel details not found');
        }
      } catch (err) {
        console.error(err);
        error('Error fetching hotel details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchHotelDetails();
  }, [id, error]);

  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('wifi')) return <Wifi className="h-4 w-4 text-primary" />;
    if (n.includes('air') || n.includes('ac')) return <Wind className="h-4 w-4 text-primary" />;
    if (n.includes('tv') || n.includes('flat')) return <Tv className="h-4 w-4 text-primary" />;
    if (n.includes('bar') || n.includes('mini')) return <Coffee className="h-4 w-4 text-primary" />;
    if (n.includes('service') || n.includes('room')) return <Bell className="h-4 w-4 text-primary" />;
    if (n.includes('bath') || n.includes('shower')) return <Sparkles className="h-4 w-4 text-primary" />;
    if (n.includes('safe') || n.includes('security')) return <Shield className="h-4 w-4 text-primary" />;
    return <Sparkles className="h-4 w-4 text-primary" />;
  };

  const handleBookNow = (categoryId: string) => {
    if (new Date(checkIn) >= new Date(checkOut)) {
      error('Check-out date must be after check-in date');
      return;
    }
    // Route to checkout
    router.push(`/hotels/${id}/book/${categoryId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  };

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

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center gap-4 py-20 text-center">
          <h2 className="text-2xl font-serif font-semibold text-foreground">Hotel Not Found</h2>
          <button onClick={() => router.push('/')} className="text-primary hover:underline font-semibold flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const imagesList = hotel.images.split(',');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow pb-20">
        {/* Header Hero Section */}
        <section className="bg-muted/30 border-b border-border py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold mb-6 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Hotels
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-semibold tracking-wide">{hotel.name}</h1>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary shrink-0" /> {hotel.address}, {hotel.city}, {hotel.state}, {hotel.country}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 shrink-0" />
                <div className="text-left leading-tight">
                  <span className="text-md font-bold text-foreground">{hotel.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Five Star Rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Grid */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content (Images, About, Rooms) */}
          <div className="lg:col-span-2 space-y-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div 
                className="h-96 sm:h-[450px] bg-cover bg-center rounded-xl shadow-md border border-border transition-all duration-300"
                style={{ backgroundImage: `url('${activeImage}')` }}
              />
              <div className="flex gap-3 overflow-x-auto pb-2">
                {imagesList.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`h-16 w-24 shrink-0 rounded-md bg-cover bg-center border transition overflow-hidden ${
                      activeImage === img ? 'border-primary ring-2 ring-primary/20' : 'border-border opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundImage: `url('${img}')` }}
                  />
                ))}
              </div>
            </div>

            {/* About Hotel */}
            <div className="space-y-4">
              <h3 className="text-2xl font-serif text-foreground font-semibold border-b border-border pb-3">About the Resort</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light whitespace-pre-line">
                {hotel.description}
              </p>
            </div>

            {/* Room Categories */}
            <div className="space-y-6">
              <h3 className="text-2xl font-serif text-foreground font-semibold border-b border-border pb-3">Room Selection</h3>
              
              <div className="space-y-6">
                {hotel.roomCategories.map((category) => {
                  const catImage = category.images.split(',')[0];
                  return (
                    <div
                      key={category.id}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition grid grid-cols-1 md:grid-cols-3"
                    >
                      <div 
                        className="h-48 md:h-full min-h-[180px] bg-cover bg-center"
                        style={{ backgroundImage: `url('${catImage}')` }}
                      />
                      <div className="p-6 md:col-span-2 flex flex-col justify-between gap-6">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-lg font-serif font-bold text-foreground leading-tight">{category.name}</h4>
                            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                              {category.hasAC ? 'AC Room' : 'Non-AC'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed font-light">
                            {category.description}
                          </p>

                          {/* Amenities */}
                          <div className="flex flex-wrap gap-3.5 mb-2">
                            {category.roomAmenities.map((ra, idx) => (
                              <span key={idx} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                {getAmenityIcon(ra.amenity.name)}
                                {ra.amenity.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                          <div>
                            <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">Starting From</span>
                            <span className="text-xl font-bold text-foreground">₹{category.pricePerNight.toFixed(0)}</span>
                            <span className="text-xs text-muted-foreground"> / night</span>
                          </div>
                          <button
                            onClick={() => handleBookNow(category.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow cursor-pointer"
                          >
                            Book Room
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar (Dates Selector, Reviews) */}
          <div className="space-y-8">
            {/* Quick Stay Selector */}
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4 sticky top-24">
              <h3 className="text-lg font-serif text-foreground font-semibold border-b border-border pb-2.5">Stay Settings</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Check-In Date</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Check-Out Date</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Number of Guests</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                >
                  <option value="1">1 Adult</option>
                  <option value="2">2 Adults</option>
                  <option value="3">3 Adults</option>
                  <option value="4">4 Adults</option>
                </select>
              </div>
            </div>

            {/* Testimonials & Reviews */}
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-lg font-serif text-foreground font-semibold border-b border-border pb-2.5">Guest Feedback</h3>
              
              {hotel.reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground leading-normal">
                  No verified guest reviews yet. Completed bookings can submit reviews via their customer profile dashboard.
                </p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {hotel.reviews.map((review) => (
                    <div key={review.id} className="border-b border-border pb-3 last:border-b-0 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-foreground">{review.customer.name}</span>
                        <div className="flex items-center gap-0.5 text-xs text-yellow-500">
                          {Array.from({ length: review.rating }).map((_, idx) => (
                            <Star key={idx} className="h-3 w-3 fill-yellow-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">&quot;{review.comment}&quot;</p>
                      <span className="text-[9px] text-muted-foreground/60 block">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
