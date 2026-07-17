import React from 'react';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { Award, Compass, Heart, Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Header */}
      <section className="relative py-20 bg-secondary text-secondary-foreground text-center">
        <div className="mx-auto max-w-4xl px-4">
          <span className="text-primary font-semibold tracking-wider text-xs uppercase">Est. 1998</span>
          <h1 className="text-4xl sm:text-5xl font-serif mt-2 tracking-wide text-foreground">Our Legacy of Elegance</h1>
          <div className="h-[1px] w-20 bg-primary mx-auto mt-4" />
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed font-light">
            For nearly three decades, Grand Luxury Hotels has set the benchmark for luxury lodging, award-winning fine dining, and bespoke oceanfront resorts.
          </p>
        </div>
      </section>

      {/* Brand Bio */}
      <section className="py-20 mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div 
            className="h-80 bg-cover bg-center rounded-xl shadow-lg"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80')` }}
          />
          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-foreground font-semibold">Crafting Unforgettable Sanctuary</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Grand Luxury Hotels, we believe that true hospitality is an art form. We look past the basics of accommodations to weave a tapestry of unforgettable sensory experiences. Every suite layout is bespoke, every massage therapeutic, and every butler concierge highly skilled.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our locations are selected for their historic elegance and scenic coastlines, ensuring that when you stay with us, you are experiencing the absolute best that a destination has to offer.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-muted/30 border-y border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-foreground">Our Founding Commitments</h2>
            <div className="h-[1px] w-20 bg-primary mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-card p-6 border border-border rounded-xl text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">Artisan Quality</h3>
              <p className="text-xs text-muted-foreground">Every meal is prepared by five-star chefs and every room custom detailed.</p>
            </div>
            <div className="bg-card p-6 border border-border rounded-xl text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">Local Curation</h3>
              <p className="text-xs text-muted-foreground">We incorporate native art styles, architectural notes, and local ingredients.</p>
            </div>
            <div className="bg-card p-6 border border-border rounded-xl text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">Bespoke Care</h3>
              <p className="text-xs text-muted-foreground">Our customer desk operates 24/7 with customized packages for guests.</p>
            </div>
            <div className="bg-card p-6 border border-border rounded-xl text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">Ethical Luxury</h3>
              <p className="text-xs text-muted-foreground">We practice eco-friendly resort cleaning, zero-waste, and community support.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
