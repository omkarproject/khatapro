'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import { Invoice, InvoiceItem } from '@/types';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  Sparkles,
  QrCode,
  ShieldCheck,
  Building,
  Link2,
  Send,
  CreditCard,
  Wallet,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { PaymentCollectionMode } from '@/types';

export default function InvoicesPage() {
  const {
    invoices,
    saveInvoice,
    customers,
    products,
    settings,
    profile,
    addToast,
    openCollectModal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Payment Link Generation State
  const [paymentLinkInvoice, setPaymentLinkInvoice] = useState<Invoice | null>(null);
  const [linkGateway, setLinkGateway] = useState<PaymentCollectionMode>(
    settings.paymentSettings.collectionMode || 'direct_upi'
  );
  const [linkPhone, setLinkPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter available gateways that have active APIs configured
  const availableGateways = useMemo(() => {
    return [
      {
        id: 'direct_upi' as PaymentCollectionMode,
        name: 'Default UPI & Shop QR',
        desc: '0% fee merchant UPI ID & instant direct bank transfer',
        badge: '0% Commission',
        icon: QrCode,
        isConfigured: true,
        isActive: settings.paymentSettings.collectionMode === 'direct_upi',
      },
      {
        id: 'cashfree' as PaymentCollectionMode,
        name: 'Cashfree Payment Gateway',
        desc: 'Hosted checkout links, Credit/Debit cards, NetBanking & UPI',
        badge: 'Cards & NetBanking',
        icon: CreditCard,
        isConfigured: !!(settings.paymentSettings.cashfreeAppId && settings.paymentSettings.cashfreeSecretKey),
        isActive: settings.paymentSettings.collectionMode === 'cashfree',
      },
      {
        id: 'razorpay' as PaymentCollectionMode,
        name: 'Razorpay Payment Gateway',
        desc: 'Instant checkout, Cards, NetBanking, UPI Intent & Wallets',
        badge: 'Instant PG Checkout',
        icon: Sparkles,
        isConfigured: !!(settings.paymentSettings.razorpayKeyId && settings.paymentSettings.razorpayKeySecret),
        isActive: settings.paymentSettings.collectionMode === 'razorpay',
      },
      {
        id: 'upi_gateway' as PaymentCollectionMode,
        name: 'UPI Payment Gateway',
        desc: 'Dynamic QR generation with real-time webhook callback',
        badge: 'Dynamic QR',
        icon: Wallet,
        isConfigured: !!settings.paymentSettings.upiGatewayKey,
        isActive: settings.paymentSettings.collectionMode === 'upi_gateway',
      },
    ];
  }, [settings.paymentSettings]);

  // Form State for New Invoice
  const [invType, setInvType] = useState<'sales' | 'purchase' | 'quotation'>('sales');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 18,
      total: 0,
    },
  ]);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [terms, setTerms] = useState('Payment due within 15 days. Subject to local jurisdiction.');

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchQuery =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handle Item Row Changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: val };

    // Recalculate item line total
    const qty = current.quantity || 0;
    const price = current.unitPrice || 0;
    const disc = current.discountPercent || 0;
    const tax = current.taxPercent || 0;

    const lineSubtotal = qty * price;
    const lineDiscount = lineSubtotal * (disc / 100);
    const taxable = lineSubtotal - lineDiscount;
    const lineTax = taxable * (tax / 100);
    current.total = Math.round(taxable + lineTax);

    updated[index] = current;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 7),
        name: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: 18,
        total: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations for current creation
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const raw = (item.quantity || 0) * (item.unitPrice || 0);
      const d = raw * ((item.discountPercent || 0) / 100);
      const taxable = raw - d;
      const t = taxable * ((item.taxPercent || 0) / 100);

      subtotal += raw;
      discountAmount += d;
      taxAmount += t;
    });

    const total = Math.round(subtotal - discountAmount + taxAmount);
    return {
      subtotal: Math.round(subtotal),
      discountAmount: Math.round(discountAmount),
      taxAmount: Math.round(taxAmount),
      cgst: Math.round(taxAmount / 2),
      sgst: Math.round(taxAmount / 2),
      total,
    };
  }, [items]);

  // Handle Save New Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) {
      addToast('Customer required', 'Please select a customer for this invoice.', 'error');
      return;
    }

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `SKP/2025/${1040 + invoices.length + 1}`,
      type: invType,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerGst: cust.gstNumber,
      customerAddress: cust.address,
      issueDate,
      dueDate,
      items: items.filter(i => i.name.trim().length > 0),
      subtotal: calculatedTotals.subtotal,
      discountAmount: calculatedTotals.discountAmount,
      taxAmount: calculatedTotals.taxAmount,
      cgst: calculatedTotals.cgst,
      sgst: calculatedTotals.sgst,
      igst: 0,
      total: calculatedTotals.total,
      paidAmount: 0,
      status: 'unpaid',
      notes,
      terms,
      createdAt: new Date().toISOString(),
    };

    saveInvoice(newInvoice);
    setIsCreateModalOpen(false);
    setActiveInvoice(newInvoice);
  };

  // WhatsApp Share Invoice
  const handleWhatsAppShare = (inv: Invoice) => {
    const upiUri = buildUpiUri(settings.paymentSettings.upiId, settings.paymentSettings.payeeName, inv.total, `Inv ${inv.invoiceNumber}`);
    const message = inv.status === 'paid'
      ? `Dear ${inv.customerName},\n\nPlease find your official Tax Invoice *#${inv.invoiceNumber}* for *₹${inv.total.toLocaleString('en-IN')}*.\nStatus: *PAID (Payment Received & Settled)* ✅\n\nThank you for your business,\n${settings.businessName}`
      : `Dear ${inv.customerName},\n\nPlease find your invoice *#${inv.invoiceNumber}* for *₹${inv.total.toLocaleString('en-IN')}*.\nDue Date: ${formatDate(inv.dueDate)}\n\n*Pay Directly via UPI:*\n${upiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(inv.customerPhone, message);
  };

  // Open Send Payment Link Modal
  const handleOpenSendPaymentLink = (inv: Invoice) => {
    setPaymentLinkInvoice(inv);
    setLinkGateway(settings.paymentSettings.collectionMode || 'direct_upi');
    setLinkPhone(inv.customerPhone || '');
    setCopiedLink(false);
  };

  const getGeneratedPaymentLink = (inv: Invoice, gw: PaymentCollectionMode) => {
    if (typeof window === 'undefined') return `/pay/${inv.id}?gw=${gw}`;
    return `${window.location.origin}/pay/${inv.id}?gw=${gw}`;
  };

  const handleSendPaymentLinkWhatsApp = () => {
    if (!paymentLinkInvoice) return;
    const payUrl = getGeneratedPaymentLink(paymentLinkInvoice, linkGateway);
    const gwLabel =
      linkGateway === 'direct_upi'
        ? 'Direct 0% UPI & QR'
        : linkGateway === 'cashfree'
        ? 'Cashfree Payment Gateway'
        : linkGateway === 'razorpay'
        ? 'Razorpay Payment Gateway'
        : 'Instant UPI Gateway';

    const message = `*TAX INVOICE & ONLINE PAYMENT LINK*\n\nDear *${paymentLinkInvoice.customerName}*,\n\nHere is your Tax Invoice *#${paymentLinkInvoice.invoiceNumber}* for *${formatINR(paymentLinkInvoice.total)}*.\nDue Date: *${formatDate(paymentLinkInvoice.dueDate)}*\nPayment Option: *${gwLabel}*\n\n👉 *Click here to view invoice & pay online:*\n${payUrl}\n\n—\n*${settings.businessName}*\n📞 ${settings.businessPhone}`;

    openWhatsApp(linkPhone, message);
    addToast('Payment Link Shared', `Invoice link sent to ${paymentLinkInvoice.customerName} via WhatsApp.`, 'success');
  };

  const handleCopyPaymentLink = () => {
    if (!paymentLinkInvoice) return;
    const payUrl = getGeneratedPaymentLink(paymentLinkInvoice, linkGateway);
    navigator.clipboard.writeText(payUrl);
    setCopiedLink(true);
    addToast('Copied!', 'Customer payment link copied to clipboard.', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Billing & Invoicing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            GST-compliant invoices, automated tax calculations, printable luxury templates, and instant UPI QR integration
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filter & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice number or customer name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'paid', 'unpaid', 'overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="glass-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {inv.customerName}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatINR(inv.total)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : inv.status === 'overdue'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                        title="View / Print Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleOpenSendPaymentLink(inv)}
                          className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-500 hover:text-indigo-600 cursor-pointer"
                          title="Generate & Send Payment Link"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleWhatsAppShare(inv)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() =>
                            openCollectModal({
                              customerId: inv.customerId,
                              customerName: inv.customerName,
                              amount: inv.total - inv.paidAmount,
                              note: `Payment for Invoice ${inv.invoiceNumber}`,
                            })
                          }
                          className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                          title="Collect via UPI"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable / View Luxury Invoice Modal */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-8 max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tax Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                {activeInvoice.status !== 'paid' && (
                  <button
                    type="button"
                    onClick={() => handleOpenSendPaymentLink(activeInvoice)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    title="Generate & Send Payment Link"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Send Payment Link</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => handleWhatsAppShare(activeInvoice)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The Actual Luxury Invoice Document Container */}
            <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none">
              
              {/* Header: Company & Invoice Meta */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {profile.businessName}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    {profile.businessAddress}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Phone: {profile.phone} • Email: {profile.email}
                  </p>
                  {profile.businessGst && (
                    <p className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">
                      GSTIN: {profile.businessGst}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600 uppercase tracking-tight">
                    TAX INVOICE
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                    {activeInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: <span className="font-mono">{formatDate(activeInvoice.issueDate)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Due: <span className="font-mono">{formatDate(activeInvoice.dueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Billed To:
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {activeInvoice.customerName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {activeInvoice.customerAddress || 'Customer Address on Record'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Phone: {activeInvoice.customerPhone || '-'}
                  </div>
                  {activeInvoice.customerGst && (
                    <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                      GST: {activeInvoice.customerGst}
                    </div>
                  )}
                </div>

                {/* Status Pill */}
                <div className="text-right">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    activeInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeInvoice.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-2 text-center">GST %</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {item.taxPercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatINR(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Integrated Payment UPI QR Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                
                {/* Embedded Merchant UPI QR Code for Instant Pay */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-4">
                  <img
                    src={
                      settings.paymentSettings.customQrUrl ||
                      getQrCodeUrl(
                        buildUpiUri(settings.paymentSettings.upiId, settings.paymentSettings.payeeName, activeInvoice.total, activeInvoice.invoiceNumber),
                        200
                      )
                    }
                    alt="Scan & Pay UPI"
                    className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Scan to Pay via UPI
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[170px]">
                      {settings.paymentSettings.upiId}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                      GPay • PhonePe • Paytm • BHIM
                    </div>
                  </div>
                </div>

                {/* Subtotal / Tax Summary */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(activeInvoice.subtotal)}</span>
                  </div>
                  {activeInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">-{formatINR(activeInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span className="font-mono">{formatINR(activeInvoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span className="font-mono">{formatINR(activeInvoice.sgst)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Invoice Total:</span>
                    <span className="font-mono text-indigo-700">{formatINR(activeInvoice.total)}</span>
                  </div>
                </div>

              </div>

              {/* Notes & Terms */}
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 space-y-1">
                <div><strong>Terms:</strong> {activeInvoice.terms}</div>
                <div><strong>Notes:</strong> {activeInvoice.notes}</div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Create New Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Create GST Tax Invoice
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              
              {/* Customer & Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Select Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.businessName || c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Item Name / SKU"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-center font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-right font-bold"
                        />
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-xs">
                        {formatINR(item.total)}
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Taxable: {formatINR(calculatedTotals.subtotal)} | GST (18%): {formatINR(calculatedTotals.taxAmount)}</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Grand Total: {formatINR(calculatedTotals.total)}
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  Generate Invoice
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GENERATE & SEND PAYMENT LINK ================= */}
      {paymentLinkInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Send Online Payment Link
                  </h3>
                  <p className="text-xs text-slate-400">
                    Invoice #{paymentLinkInvoice.invoiceNumber} • {paymentLinkInvoice.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentLinkInvoice(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Pill */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Payable Amount
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {formatINR(paymentLinkInvoice.total)}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                paymentLinkInvoice.status === 'paid'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}>
                {paymentLinkInvoice.status}
              </span>
            </div>

            {/* Gateway Selection Section: Lists all active and configured APIs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Payment Gateway API
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Sourced from Settings
                </span>
              </div>
              
              <div className="space-y-2">
                {availableGateways.map((gw) => {
                  const Icon = gw.icon;
                  const isSelected = linkGateway === gw.id;
                  return (
                    <div
                      key={gw.id}
                      onClick={() => setLinkGateway(gw.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white/50 dark:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {gw.name}
                            </span>
                            {gw.isActive && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                                Active Default
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {gw.desc}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                          {gw.badge}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-700'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Phone Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Recipient WhatsApp Phone *
              </label>
              <input
                type="text"
                value={linkPhone}
                onChange={(e) => setLinkPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
              />
            </div>

            {/* Generated Payment Link Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Generated Customer Payment Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getGeneratedPaymentLink(paymentLinkInvoice, linkGateway)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300 text-ellipsis overflow-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyPaymentLink}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <a
                href={getGeneratedPaymentLink(paymentLinkInvoice, linkGateway)}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Preview Customer View</span>
              </a>

              <button
                type="button"
                onClick={handleSendPaymentLinkWhatsApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
