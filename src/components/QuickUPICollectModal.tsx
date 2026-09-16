'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import {
  X,
  QrCode,
  Upload,
  Check,
  Copy,
  Share2,
  DollarSign,
  Save,
  Sparkles,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function QuickUPICollectModal() {
  const {
    settings,
    saveDefaultUpiAndQr,
    isCollectModalOpen,
    closeCollectModal,
    collectModalData,
    addTransaction,
    customers,
    addToast,
  } = useApp();

  const paymentSettings = settings.paymentSettings;

  // Form State
  const [upiId, setUpiId] = useState(paymentSettings.upiId || 'merchant@upi');
  const [payeeName, setPayeeName] = useState(paymentSettings.payeeName || 'SmartKhata Merchant');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(paymentSettings.customQrUrl);
  const [isDefaultSaved, setIsDefaultSaved] = useState<boolean>(paymentSettings.isDefaultQrSaved ?? true);
  const [copied, setCopied] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or settings change
  useEffect(() => {
    if (isCollectModalOpen) {
      setUpiId(paymentSettings.upiId || 'merchant@upi');
      setPayeeName(paymentSettings.payeeName || 'SmartKhata Merchant');
      setCustomQrUrl(paymentSettings.customQrUrl);
      setRecordedSuccess(false);

      if (collectModalData.amount) {
        setAmount(collectModalData.amount.toString());
      } else {
        setAmount('');
      }

      if (collectModalData.note) {
        setNote(collectModalData.note);
      } else {
        setNote('Payment for goods & services');
      }

      if (collectModalData.customerId) {
        setSelectedCustomer(collectModalData.customerId);
      } else {
        setSelectedCustomer('');
      }
    }
  }, [isCollectModalOpen, paymentSettings, collectModalData]);

  if (!isCollectModalOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const currentUpiUri = buildUpiUri(upiId, payeeName, numAmount > 0 ? numAmount : undefined, note);
  // If merchant uploaded a custom QR, use it; otherwise generate dynamic QR from UPI URI
  const displayQr = customQrUrl && customQrUrl.trim().length > 0 ? customQrUrl : getQrCodeUrl(currentUpiUri);

  // Handle local QR code image upload
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File too large', 'Please upload a QR image under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setCustomQrUrl(base64Url);
        addToast('QR Image Uploaded', 'Click "Save as Default" to keep this QR for future collections.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save as Default (User Requirement)
  const handleSaveAsDefault = () => {
    if (!upiId.includes('@')) {
      addToast('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank)', 'error');
      return;
    }
    saveDefaultUpiAndQr({
      upiId,
      payeeName,
      customQrUrl,
    });
    setIsDefaultSaved(true);
  };

  // Copy UPI
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard', `UPI ID ${upiId} copied.`, 'info');
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const cust = customers.find(c => c.id === selectedCustomer);
    const recipient = cust?.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
    const shareMessage = `Dear ${cust?.name || 'Customer'},\n\nPlease pay ${numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : 'your balance'} to *${payeeName}* via UPI.\n\n*UPI ID:* ${upiId}\n*Note:* ${note}\n\n*UPI Payment Link:*\n${currentUpiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(recipient, shareMessage);
  };

  // Mark as Collected in Ledger
  const handleRecordCollection = () => {
    if (numAmount <= 0) {
      addToast('Amount Required', 'Please enter an amount to record collection.', 'warning');
      return;
    }
    const cust = customers.find(c => c.id === selectedCustomer);
    addTransaction({
      id: `txn_${Date.now()}`,
      type: 'collection',
      amount: numAmount,
      date: new Date().toISOString(),
      customerId: cust?.id,
      customerName: cust?.name || collectModalData.customerName || 'Direct Customer',
      category: 'UPI Direct Collection',
      paymentMode: 'upi',
      referenceNo: `UPI-${Math.floor(100000000 + Math.random() * 900000000)}`,
      note: note || 'Collected via UPI QR',
      status: 'completed',
      createdBy: settings.businessName,
      createdAt: new Date().toISOString(),
    });

    setRecordedSuccess(true);
    setTimeout(() => {
      closeCollectModal();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl fintech-gradient-primary flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                UPI Payment Collection
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Instant 0% Gateway Fee
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect directly to your bank account via PhonePe, GPay, Paytm, or BHIM
              </p>
            </div>
          </div>
          <button
            onClick={closeCollectModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {recordedSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Recorded Successfully!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                ₹{numAmount.toLocaleString('en-IN')} has been added to transactions and customer ledger balance has been updated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: QR Code & Visual Display */}
              <div className="md:col-span-5 flex flex-col items-center justify-between p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/30 text-center">
                <div className="w-full text-left mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400">
                    Payee: {payeeName}
                  </span>
                  <div className="text-xs text-slate-500 truncate font-mono">{upiId}</div>
                </div>

                {/* QR Code Container */}
                <div className="relative group p-3 bg-white rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700 flex items-center justify-center my-2">
                  <img
                    src={displayQr}
                    alt="UPI QR Code"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                  {customQrUrl && (
                    <span className="absolute bottom-2 right-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Custom QR
                    </span>
                  )}
                </div>

                {/* Amount display under QR */}
                <div className="my-2">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {numAmount > 0 ? formatINR(numAmount) : 'Any Amount'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scan using any UPI App
                  </p>
                </div>

                {/* Quick UPI ID Copy Pill */}
                <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mt-2">
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate mr-2">
                    {upiId}
                  </span>
                  <button
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Collection Inputs & UPI Setup */}
              <div className="md:col-span-7 space-y-4">
                {/* 1. UPI ID & Payee Setup */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Merchant UPI & Default QR Settings
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAsDefault}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save as Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        UPI ID / VPA *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. sharma.traders@okaxis"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Payee / Business Name *
                      </label>
                      <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        placeholder="e.g. Sharma Traders"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Upload Custom QR Image */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {customQrUrl ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Custom QR image loaded
                        </span>
                      ) : (
                        'Upload your printed Shop QR image'
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {customQrUrl ? 'Change QR' : 'Upload QR Image'}
                      </button>
                      {customQrUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomQrUrl(undefined)}
                          className="text-xs text-rose-500 hover:underline px-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Collection Transaction Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer (Optional - to link in KhataBook)
                    </label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        const c = customers.find(item => item.id === e.target.value);
                        if (c && c.outstandingBalance > 0 && !amount) {
                          setAmount(c.outstandingBalance.toString());
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Direct / Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) - Due: ₹{c.outstandingBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Amount to Collect (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full pl-7 pr-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Payment Note
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Bill clearance"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordCollection}
                    disabled={numAmount <= 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Record in Khata
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
