'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Calendar, Users, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/context/toast-context';

interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  images: string;
  rating: number;
}

export default function LandingPage() {
  const { error } = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');

  const fetchHotels = async (searchCity = '') => {
    setLoading(true);
    try {
      const url = searchCity ? `/api/hotels?city=${encodeURIComponent(searchCity)}` : '/api/hotels';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHotels(data.hotels);
      } else {
        error(data.message || 'Failed to load hotels');
      }
    } catch (err) {
      console.error(err);
      error('Could not connect to database. Make sure you seeded the DB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
      error('Check-out date must be after check-in date');
      return;
    }
    fetchHotels(city);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[650px] flex items-center justify-center bg-black overflow-hidden">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 transform scale-105 transition-transform duration-10000"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-black/60" />

        {/* Hero Content */}
        <div className="relative mx-auto max-w-5xl px-4 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary font-semibold tracking-[0.25em] text-xs uppercase mb-3 block">
              Luxury Hospitality Rediscovered
            </span>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-wide mb-6 leading-tight">
              Your Sanctuary of <br />
              <span className="italic text-primary font-normal">Uncompromised Luxury</span>
            </h1>
            <p className="text-md sm:text-lg text-slate-200/80 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Unlock unique suites, private beach club access, and legendary spa treatment rooms. Welcome to Hotel Hub.
            </p>
          </motion.div>

          {/* Search Drawer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-4xl mx-auto bg-card/90 backdrop-blur-md p-6 rounded-xl border border-border/20 shadow-2xl text-left"
          >
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Destination */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Destination
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition w-full"
                />
              </div>

              {/* Check-In */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                />
              </div>

              {/* Check-Out */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                />
              </div>

              {/* Search Button */}
              <div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 h-10 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                  Search Hotels
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Feature Brands */}
      <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold tracking-wider text-xs uppercase">Curated Offerings</span>
          <h2 className="text-3xl font-serif text-foreground mt-2">Why Stay at Hotel Hub?</h2>
          <div className="h-[1px] w-20 bg-primary mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-border p-8 rounded-xl text-center flex flex-col items-center gap-4 hover:shadow-xl transition duration-300">
            <div className="p-3.5 rounded-full bg-primary/10 text-primary">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Award-Winning Service</h3>
            <p className="text-sm text-muted-foreground">
              Experience the legend of bespoke customer service. From room service butlering to personalized itineraries.
            </p>
          </div>
          <div className="bg-card border border-border p-8 rounded-xl text-center flex flex-col items-center gap-4 hover:shadow-xl transition duration-300">
            <div className="p-3.5 rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Luxury Wellness Spa</h3>
            <p className="text-sm text-muted-foreground">
              Revitalize with signature massage therapies, steam baths, and organic botanicals under the care of certified therapists.
            </p>
          </div>
          <div className="bg-card border border-border p-8 rounded-xl text-center flex flex-col items-center gap-4 hover:shadow-xl transition duration-300">
            <div className="p-3.5 rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Secured Checkout & Trust</h3>
            <p className="text-sm text-muted-foreground">
              Confidently book online via encryption. Safe RFID room entry systems and transparent billing protocols.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Hotels List */}
      <section className="bg-muted/30 py-20 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold tracking-wider text-xs uppercase font-sans">Our Handpicked Resorts</span>
            <h2 className="text-3xl font-serif text-foreground mt-2">Explore Destinations</h2>
            <div className="h-[1px] w-20 bg-primary mx-auto mt-4" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow animate-pulse h-[400px]" />
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No hotels match your query or database is unseeded.</p>
              <Link href="/api/seed" className="text-primary border border-primary px-4 py-2 rounded hover:bg-primary/10 transition">
                Click here to Seed Database
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {hotels.map((hotel) => {
                const mainImage = hotel.images.split(',')[0];
                return (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                  >
                    <div 
                      className="h-56 bg-cover bg-center bg-slate-300"
                      style={{ backgroundImage: `url('${mainImage}')` }}
                    />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {hotel.city}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-yellow-500" /> {hotel.rating.toFixed(1)}
                        </span>
                      </div>
                      <h3 className="text-xl font-serif text-foreground font-semibold mb-2">{hotel.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                        {hotel.description}
                      </p>
                      <Link
                        href={`/hotels/${hotel.id}`}
                        className="block text-center w-full rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                      >
                        Explore Rooms
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
