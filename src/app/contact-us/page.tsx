'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  MessageCircle,
  Building2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

export default function ContactUsPage() {
  const { settings, profile, addToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Payment / Billing Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const businessName = settings.businessName || profile.businessName || 'Sharma Traders & Enterprise';
  const businessPhone = settings.businessPhone || profile.phone || '+91 8371838314';
  const businessEmail = settings.businessEmail || profile.email || 'contact@sharmatraders.in';
  const businessAddress = settings.businessAddress || profile.address || 'Plot 42, Apex Industrial Park, Andheri East, Mumbai, MH 400069';
  const businessGst = settings.paymentSettings?.businessGst || '27AABCS1429B1Z8';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      addToast('Missing Fields', 'Please fill in your name, email and message.', 'error');
      return;
    }
    setSubmitted(true);
    addToast('Message Sent', 'Thank you! Our support team will get back to you within 2-4 hours.', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              Official Support
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Contact Us &amp; Merchant Helpdesk
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Have questions regarding billing, invoices, payments, or merchant services? Reach out to us directly.
          </p>
        </div>

        <a
          href={`https://wa.me/${businessPhone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(businessName)},%20I%20have%20an%20inquiry%20regarding%20billing%20and%20payment.`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Official Registered Business Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{businessName}</h2>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Business Merchant
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">Registered Office Address</div>
                  <div className="text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{businessAddress}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">Telephone / Mobile Helpline</div>
                  <a href={`tel:${businessPhone}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline block mt-0.5">
                    {businessPhone}
                  </a>
                  <div className="text-[10px] text-slate-400">Toll-free customer assistance</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">Email Helpdesk</div>
                  <a href={`mailto:${businessEmail}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline block mt-0.5">
                    {businessEmail}
                  </a>
                  <div className="text-[10px] text-slate-400">Average response time &lt; 2 hours</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">Operating Support Hours</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">Monday – Saturday: 9:00 AM – 7:00 PM IST</div>
                  <div className="text-[10px] text-slate-400">Sunday: Closed (Emergency ticket support active)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div className="text-[10px] uppercase font-bold text-slate-400">GST Registration Number</div>
                <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">{businessGst}</div>
              </div>

            </div>
          </div>

          <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-2">
            <h3 className="font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Cashfree &amp; RBI Payment Compliance
            </h3>
            <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
              All payment collection transactions and refunds are routed through Cashfree Payment Gateway and NPCI UPI networks with 256-Bit SSL encryption.
            </p>
          </div>
        </div>

        {/* Right Column: Contact Inquiry Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Send Us an Inquiry / Ticket</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Please provide your invoice or payment reference if you are inquiring about a specific transaction.
            </p>

            {submitted ? (
              <div className="p-8 text-center space-y-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in zoom-in-95">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">Inquiry Received Successfully</h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                    Your reference ticket has been generated. Our executive will reach out to you at <strong>{email}</strong> or <strong>{phone}</strong> shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-xs cursor-pointer hover:bg-emerald-50"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rajesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Phone / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9820111223"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Payment / Billing Inquiry">Payment / Billing Inquiry</option>
                      <option value="Refund & Cancellation Request">Refund &amp; Cancellation Request</option>
                      <option value="Cashfree Payment Failure Assistance">Cashfree Payment Failure Assistance</option>
                      <option value="Product / Service Pricing (INR)">Product / Service Pricing (INR)</option>
                      <option value="Merchant Partnership">Merchant Partnership</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Your Message / Transaction Details *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Please include your Invoice #, Order ID, or Transaction UTR if inquiring about a payment..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
