'use client';

import React, { useState } from 'react';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useToast } from '@/context/toast-context';
import { MapPin, Phone, Mail, Send, Check } from 'lucide-react';

export default function ContactPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      error('Please fill in all form details before sending');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      success('Thank you for contacting us! Our butler concierge will reply shortly.');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Header */}
      <section className="relative py-20 bg-secondary text-secondary-foreground text-center">
        <div className="mx-auto max-w-4xl px-4">
          <span className="text-primary font-semibold tracking-wider text-xs uppercase">Get in Touch</span>
          <h1 className="text-4xl sm:text-5xl font-serif mt-2 tracking-wide text-foreground">Contact Our Concierge Desk</h1>
          <div className="h-[1px] w-20 bg-primary mx-auto mt-4" />
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-20 mx-auto max-w-6xl px-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Info Card */}
          <div className="space-y-8 bg-card border border-border p-8 rounded-xl">
            <h2 className="text-2xl font-serif text-foreground font-semibold">Reservations & Inquiries</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have special check-in requests, wish to book a luxury corporate event, or request custom spa configurations, please get in touch. Our 24/7 hospitality desk is always ready.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Mailing Address</h4>
                  <p className="text-xs text-muted-foreground mt-1">101, Marine Drive, Mumbai, Maharashtra, 400020, India</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Telephone Helpline</h4>
                  <p className="text-xs text-muted-foreground mt-1">+91 22 2282 1234 (Reservations desk)</p>
                  <p className="text-xs text-muted-foreground">+91 22 2282 5678 (General desk)</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Email Communications</h4>
                  <p className="text-xs text-muted-foreground mt-1">reservations@grandluxuryhotel.com</p>
                  <p className="text-xs text-muted-foreground">concierge@grandluxuryhotel.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border p-8 rounded-xl shadow-sm">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-serif text-foreground font-semibold mb-4">Send a Message</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    placeholder="Reason for inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Message</label>
                  <textarea
                    placeholder="Describe your request..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition w-full resize-none"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 cursor-pointer mt-6"
                  disabled={loading}
                >
                  {loading ? 'Sending Message...' : 'Send Message'}
                  {!loading && <Send className="h-4 w-4" />}
                </button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="p-4 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto">
                  <Check className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-foreground">Message Dispatched</h3>
                <p className="text-sm text-muted-foreground leading-normal max-w-sm mx-auto">
                  Your message has been sent to our reservations desk. We appreciate your interest and will get back to you within 24 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                >
                  Send another message
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
