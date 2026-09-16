'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import {
  QrCode,
  Upload,
  Save,
  Check,
  Copy,
  Share2,
  Download,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  Printer,
  Sparkles,
  DollarSign,
  History,
  TrendingUp
} from 'lucide-react';

export default function UpiCollectionPage() {
  const {
    settings,
    saveDefaultUpiAndQr,
    transactions,
    customers,
    addTransaction,
    addToast,
  } = useApp();

  const paymentSettings = settings.paymentSettings;

  // Merchant Default Configuration State
  const [upiId, setUpiId] = useState(paymentSettings.upiId || 'merchant@upi');
  const [payeeName, setPayeeName] = useState(paymentSettings.payeeName || 'SmartKhata Merchant');
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(paymentSettings.customQrUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dynamic Collection Calculator State
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('Payment settlement');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep in sync with store
  useEffect(() => {
    setUpiId(paymentSettings.upiId || 'merchant@upi');
    setPayeeName(paymentSettings.payeeName || 'SmartKhata Merchant');
    setCustomQrUrl(paymentSettings.customQrUrl);
  }, [paymentSettings]);

  // Derived URI and QR image
  const numCollectAmount = parseFloat(collectAmount) || 0;
  const activeUpiUri = buildUpiUri(upiId, payeeName, numCollectAmount > 0 ? numCollectAmount : undefined, collectNote);
  const activeQrDisplay = customQrUrl && customQrUrl.trim().length > 0 ? customQrUrl : getQrCodeUrl(activeUpiUri, 350);

  // Handle QR image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        addToast('File too large', 'Please choose an image under 6MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCustomQrUrl(base64);
        addToast('QR Image Ready', 'Click "Save as Default" to make this your permanent collection QR.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Default UPI & QR (Requested User Feature)
  const handleSaveDefault = () => {
    if (!upiId.includes('@')) {
      addToast('Invalid UPI ID', 'Please enter a valid UPI VPA (e.g. sharma.traders@okaxis)', 'error');
      return;
    }

    saveDefaultUpiAndQr({
      upiId,
      payeeName,
      customQrUrl,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Copy UPI ID
  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied', 'UPI ID copied to clipboard.', 'info');
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const cust = customers.find(c => c.id === selectedCustomerId);
    const shareMessage = `Dear ${cust?.name || 'Customer'},\n\nPlease pay ${numCollectAmount > 0 ? `₹${numCollectAmount.toLocaleString('en-IN')}` : 'your balance'} to *${payeeName}* via UPI.\n\n*UPI ID:* ${upiId}\n*Note:* ${collectNote}\n\n*Direct Payment Link:*\n${activeUpiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(cust?.phone, shareMessage);
  };

  // Record Collection
  const handleRecordCollection = () => {
    if (numCollectAmount <= 0) {
      addToast('Amount Required', 'Enter amount to record settlement.', 'warning');
      return;
    }
    const cust = customers.find(c => c.id === selectedCustomerId);
    addTransaction({
      id: `txn_${Date.now()}`,
      type: 'collection',
      amount: numCollectAmount,
      date: new Date().toISOString(),
      customerId: cust?.id,
      customerName: cust?.name || 'Walk-in UPI Payer',
      category: 'UPI QR Collection',
      paymentMode: 'upi',
      referenceNo: `UPI-${Math.floor(100000000 + Math.random() * 900000000)}`,
      note: collectNote,
      status: 'completed',
      createdBy: settings.businessName,
      createdAt: new Date().toISOString(),
    });
    setCollectAmount('');
    addToast('Recorded in Khata', `₹${numCollectAmount.toLocaleString('en-IN')} recorded successfully.`, 'success');
  };

  // Filter UPI collection transactions
  const upiTransactions = useMemo(() => {
    return transactions.filter(t => t.paymentMode === 'upi' && (t.type === 'collection' || t.type === 'income'));
  }, [transactions]);

  const totalUpiCollected = upiTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            UPI Payment Collection Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Zero gateway charges, direct bank settlements via Google Pay, PhonePe, Paytm & BHIM
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Print Shop Standee
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 5 Cols: Default Standee QR Card */}
        <div className="lg:col-span-5 flex flex-col items-center p-6 glass-card border border-indigo-200/60 dark:border-indigo-900/40 text-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Active Merchant QR Card
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {paymentSettings.isDefaultQrSaved ? 'Default Saved' : 'Auto Generated'}
            </span>
          </div>

          {/* Standee Look Card */}
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-slate-200/80 my-3 flex flex-col items-center">
            <div className="text-sm font-black text-slate-900 truncate max-w-[240px]">
              {payeeName}
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate max-w-[240px] mt-0.5">
              {upiId}
            </div>

            {/* The QR Image */}
            <div className="my-4 p-2 bg-white rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
              <img
                src={activeQrDisplay}
                alt="Merchant UPI QR"
                className="w-52 h-52 object-contain rounded-xl"
              />
            </div>

            {/* Amount / Instruction */}
            <div className="text-center">
              <div className="text-lg font-black text-slate-900">
                {numCollectAmount > 0 ? formatINR(numCollectAmount) : 'Scan & Pay Any Amount'}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
              </div>
            </div>
          </div>

          {/* Quick Copy UPI Button */}
          <div className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs mt-3">
            <span className="font-mono text-slate-700 dark:text-slate-300 truncate mr-2">
              {upiId}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy UPI'}</span>
            </button>
          </div>
        </div>

        {/* Right 7 Cols: Configure Default QR & On-the-fly Collection */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Default Settings Form (The User's specific prompt requirement) */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Default UPI & QR Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Enter your UPI ID and upload your shop QR code. Once saved, it will automatically show on all collection screens.
                </p>
              </div>

              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" /> Saved as Default!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Your UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. sharma.traders@okaxis"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payee / Merchant Name *
                </label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Sharma Traders Enterprise"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Custom QR Upload Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  Upload Custom Business QR Code Image
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {customQrUrl ? 'Custom QR image is active.' : 'Upload your physical counter QR image (PNG, JPG)'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {customQrUrl ? 'Change QR' : 'Select Image'}
                </button>
                {customQrUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomQrUrl(undefined)}
                    className="text-xs text-rose-500 hover:underline px-2 font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Save As Default Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveDefault}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                Save as Permanent Default QR & UPI
              </button>
            </div>
          </div>

          {/* Section 2: Quick Collection Generator */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-500" />
              Collect from Customer (Generate Link & WhatsApp)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Khata Customer (Optional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const c = customers.find(item => item.id === e.target.value);
                    if (c && c.outstandingBalance > 0) {
                      setCollectAmount(c.outstandingBalance.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Direct Payment / Any Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: ₹{c.outstandingBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Amount to Request (₹)
                </label>
                <input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Remark / Bill Note
              </label>
              <input
                type="text"
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                placeholder="e.g. Settlement for goods"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </button>

              <button
                type="button"
                onClick={handleRecordCollection}
                disabled={numCollectAmount <= 0}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
              >
                <Check className="w-4 h-4" />
                Record in Khata
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* UPI Collection History */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              UPI Collection Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Total Recorded UPI Inflow: <span className="font-mono font-bold text-emerald-600">{formatINR(totalUpiCollected)}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer / Payer</th>
                <th className="py-2.5 px-3">Ref ID</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {upiTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {formatDate(t.date)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {t.customerName || 'Direct UPI'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {t.referenceNo || 'UPI-N/A'}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {t.note || '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +{formatINR(t.amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Settled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
