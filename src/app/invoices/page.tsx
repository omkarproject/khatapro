'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatusHistoryEntry,
  InvoiceChargeConfig,
  InvoiceAppliedCharge,
  PaymentCollectionMode,
} from '@/types';
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
  ExternalLink,
  History,
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Calendar,
  Settings,
  Percent
} from 'lucide-react';

const DEFAULT_INVOICE_CHARGES: InvoiceChargeConfig[] = [
  { id: 'cgst', name: 'CGST', type: 'percentage', value: 9, enabled: true, isSystemTax: true },
  { id: 'sgst', name: 'SGST', type: 'percentage', value: 9, enabled: true, isSystemTax: true },
  { id: 'igst', name: 'IGST', type: 'percentage', value: 18, enabled: false, isSystemTax: true },
  { id: 'delivery', name: 'Delivery Charges', type: 'fixed', value: 50, enabled: false },
  { id: 'packaging', name: 'Packaging Charges', type: 'fixed', value: 20, enabled: false },
  { id: 'service', name: 'Service / Handling Fee', type: 'percentage', value: 2.5, enabled: false },
];

export default function InvoicesPage() {
  const {
    invoices,
    saveInvoice,
    deleteInvoice,
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

  // Status Update Modal State
  const [statusModalInvoice, setStatusModalInvoice] = useState<Invoice | null>(null);
  const [statusModalStatus, setStatusModalStatus] = useState<'paid' | 'unpaid' | 'overdue'>('paid');
  const [statusModalDate, setStatusModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusModalAmount, setStatusModalAmount] = useState('');
  const [statusModalNotes, setStatusModalNotes] = useState('');
  const [statusModalReceiptUrl, setStatusModalReceiptUrl] = useState<string | null>(null);
  const [statusModalReceiptName, setStatusModalReceiptName] = useState('');
  const [statusModalReceiptType, setStatusModalReceiptType] = useState('');
  const statusFileInputRef = useRef<HTMLInputElement>(null);

  // Status History Modal State
  const [historyModalInvoice, setHistoryModalInvoice] = useState<Invoice | null>(null);

  // Preview Document Modal State
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null);

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

  // Invoice Charges & Tax Configuration State
  const [invoiceChargesConfig, setInvoiceChargesConfig] = useState<InvoiceChargeConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('khatapro_invoice_charges_config');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load invoice charges config', e);
      }
    }
    return DEFAULT_INVOICE_CHARGES;
  });
  const [isChargesConfigModalOpen, setIsChargesConfigModalOpen] = useState(false);

  // New custom charge form in configuration modal
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeType, setNewChargeType] = useState<'percentage' | 'fixed'>('fixed');
  const [newChargeValue, setNewChargeValue] = useState('');

  // Selected Charges for current invoice creation
  const [selectedCharges, setSelectedCharges] = useState<{
    [id: string]: { enabled: boolean; value: number; type: 'percentage' | 'fixed' };
  }>({});

  // Sync selected charges whenever Create Modal opens or config changes
  useEffect(() => {
    if (isCreateModalOpen) {
      const initial: { [id: string]: { enabled: boolean; value: number; type: 'percentage' | 'fixed' } } = {};
      invoiceChargesConfig.forEach((chg) => {
        initial[chg.id] = {
          enabled: chg.enabled,
          value: chg.value,
          type: chg.type,
        };
      });
      setSelectedCharges(initial);
    }
  }, [isCreateModalOpen, invoiceChargesConfig]);

  const saveChargesConfig = (newConfig: InvoiceChargeConfig[]) => {
    setInvoiceChargesConfig(newConfig);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('khatapro_invoice_charges_config', JSON.stringify(newConfig));
      } catch (e) {
        console.warn('Failed to save invoice charges config', e);
      }
    }
  };

  const handleAddCustomCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChargeName.trim()) {
      addToast('Name Required', 'Enter a name for the charge.', 'error');
      return;
    }
    const val = parseFloat(newChargeValue) || 0;
    const newCharge: InvoiceChargeConfig = {
      id: `chg_${Date.now()}`,
      name: newChargeName.trim(),
      type: newChargeType,
      value: val,
      enabled: false,
      isSystemTax: false,
    };
    const updated = [...invoiceChargesConfig, newCharge];
    saveChargesConfig(updated);
    setNewChargeName('');
    setNewChargeValue('');
    addToast('Charge Added', `${newCharge.name} added to invoice charges.`, 'success');
  };

  const handleDeleteCharge = (id: string) => {
    const updated = invoiceChargesConfig.filter((c) => c.id !== id);
    saveChargesConfig(updated);
    addToast('Charge Removed', 'Charge configuration removed.', 'info');
  };

  const handleUpdateChargeField = (id: string, field: keyof InvoiceChargeConfig, val: any) => {
    const updated = invoiceChargesConfig.map((c) => (c.id === id ? { ...c, [field]: val } : c));
    saveChargesConfig(updated);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations for current creation with dynamic checkboxes
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let discountAmount = 0;

    items.forEach(item => {
      const qty = item.quantity || 0;
      const price = item.unitPrice || 0;
      const raw = qty * price;
      const d = raw * ((item.discountPercent || 0) / 100);
      subtotal += raw;
      discountAmount += d;
    });

    const taxable = Math.max(0, subtotal - discountAmount);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const appliedCharges: InvoiceAppliedCharge[] = [];

    invoiceChargesConfig.forEach(chg => {
      const state = selectedCharges[chg.id];
      if (state && state.enabled) {
        const val = state.value || 0;
        const amt =
          state.type === 'percentage'
            ? Math.round((taxable * val) / 100)
            : Math.round(val);

        if (chg.id === 'cgst') {
          cgst = amt;
        } else if (chg.id === 'sgst') {
          sgst = amt;
        } else if (chg.id === 'igst') {
          igst = amt;
        } else {
          appliedCharges.push({
            id: chg.id,
            name: chg.name,
            type: state.type,
            rate: val,
            amount: amt,
          });
        }
      }
    });

    const taxAmount = cgst + sgst + igst;
    const otherChargesTotal = appliedCharges.reduce((sum, c) => sum + c.amount, 0);
    const total = Math.round(taxable + taxAmount + otherChargesTotal);

    return {
      subtotal: Math.round(subtotal),
      discountAmount: Math.round(discountAmount),
      taxable: Math.round(taxable),
      taxAmount,
      cgst,
      sgst,
      igst,
      appliedCharges,
      total,
    };
  }, [items, invoiceChargesConfig, selectedCharges]);

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
      igst: calculatedTotals.igst,
      appliedCharges: calculatedTotals.appliedCharges,
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

  // Handle Open Status Update Modal
  const handleOpenStatusModal = (inv: Invoice) => {
    setStatusModalInvoice(inv);
    setStatusModalStatus(inv.status === 'overdue' ? 'overdue' : inv.status === 'paid' ? 'paid' : 'paid');
    setStatusModalDate(inv.paymentDate || new Date().toISOString().split('T')[0]);
    setStatusModalAmount(inv.status === 'paid' ? inv.paidAmount.toString() : inv.total.toString());
    setStatusModalNotes(inv.notes || '');
    setStatusModalReceiptUrl(inv.receiptUrl || null);
    setStatusModalReceiptName(inv.receiptName || '');
    setStatusModalReceiptType(inv.receiptType || '');
  };

  const processInvoiceFile = (file: File) => {
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      addToast('File Too Large', 'Please select a file smaller than 25MB.', 'error');
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const type = isPdf ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'file';

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setStatusModalReceiptUrl(result);
      setStatusModalReceiptName(file.name);
      setStatusModalReceiptType(type);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalInvoice) return;

    const newStatus = statusModalStatus;
    const paymentDate = statusModalDate || new Date().toISOString().split('T')[0];
    const enteredAmt = parseFloat(statusModalAmount);
    const paidAmt =
      newStatus === 'paid'
        ? (!isNaN(enteredAmt) && enteredAmt > 0 ? enteredAmt : statusModalInvoice.total)
        : newStatus === 'unpaid'
        ? 0
        : (!isNaN(enteredAmt) ? enteredAmt : statusModalInvoice.paidAmount);

    const historyEntry: InvoiceStatusHistoryEntry = {
      id: `hist_${Date.now()}`,
      status: newStatus,
      date: paymentDate,
      amount: paidAmt,
      notes: statusModalNotes.trim() || (newStatus === 'paid' ? 'Payment received' : `Marked as ${newStatus}`),
      receiptUrl: statusModalReceiptUrl || undefined,
      receiptName: statusModalReceiptName || undefined,
      receiptType: statusModalReceiptType || undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedInvoice: Invoice = {
      ...statusModalInvoice,
      status: newStatus,
      paidAmount: paidAmt,
      paymentDate: newStatus === 'paid' ? paymentDate : statusModalInvoice.paymentDate,
      receiptUrl: statusModalReceiptUrl || statusModalInvoice.receiptUrl,
      receiptName: statusModalReceiptName || statusModalInvoice.receiptName,
      receiptType: statusModalReceiptType || statusModalInvoice.receiptType,
      statusHistory: [historyEntry, ...(statusModalInvoice.statusHistory || [])],
    };

    saveInvoice(updatedInvoice);
    addToast(
      'Status Updated',
      `Invoice #${statusModalInvoice.invoiceNumber} status set to ${newStatus.toUpperCase()}.`,
      'success'
    );
    setStatusModalInvoice(null);
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsChargesConfigModalOpen(true)}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="GST, Taxes & Additional Charges Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
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
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(inv)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 shadow-xs flex items-center gap-1 ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800'
                            : inv.status === 'overdue'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800'
                        }`}
                        title="Click to update status, date & attach receipt proof"
                      >
                        <span>{inv.status}</span>
                        {inv.receiptUrl && <Paperclip className="w-2.5 h-2.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryModalInvoice(inv)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Status & Payment History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Invoice #${inv.invoiceNumber}?`)) {
                            deleteInvoice(inv.id);
                          }
                        }}
                        className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                  {activeInvoice.cgst > 0 && (
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span className="font-mono">+{formatINR(activeInvoice.cgst)}</span>
                    </div>
                  )}
                  {activeInvoice.sgst > 0 && (
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span className="font-mono">+{formatINR(activeInvoice.sgst)}</span>
                    </div>
                  )}
                  {activeInvoice.igst > 0 && (
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span className="font-mono">+{formatINR(activeInvoice.igst)}</span>
                    </div>
                  )}
                  {activeInvoice.appliedCharges && activeInvoice.appliedCharges.map((chg) => (
                    <div key={chg.id} className="flex justify-between text-indigo-700 dark:text-indigo-400">
                      <span>{chg.name} ({chg.type === 'percentage' ? `${chg.rate}%` : 'Fixed'}):</span>
                      <span className="font-mono font-semibold">+{formatINR(chg.amount)}</span>
                    </div>
                  ))}
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
                Create Invoice
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

              {/* Taxes & Additional Charges Selection Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Percent className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Taxes & Additional Charges</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Taxable Subtotal: <strong className="text-slate-800 dark:text-slate-200">{formatINR(calculatedTotals.taxable)}</strong>
                  </div>
                </div>

                {/* Checkbox Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {invoiceChargesConfig.map((chg) => {
                    const state = selectedCharges[chg.id] || { enabled: false, value: chg.value, type: chg.type };
                    const isChecked = state.enabled;
                    const calcAmt = isChecked
                      ? state.type === 'percentage'
                        ? Math.round((calculatedTotals.taxable * state.value) / 100)
                        : Math.round(state.value)
                      : 0;

                    return (
                      <label
                        key={chg.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedCharges((prev) => ({
                                ...prev,
                                [chg.id]: {
                                  ...state,
                                  enabled: e.target.checked,
                                },
                              }));
                            }}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="truncate font-semibold text-[11px]">
                            {chg.name}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({state.type === 'percentage' ? `${state.value}%` : `₹${state.value}`})
                            </span>
                          </span>
                        </div>

                        <span
                          className={`font-mono font-bold text-[11px] shrink-0 ml-1 ${
                            isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                          }`}
                        >
                          {isChecked ? `+${formatINR(calcAmt)}` : '₹0'}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Summary Total Bar */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Taxable: {formatINR(calculatedTotals.taxable)}</span>
                    <span>•</span>
                    <span>GST / Taxes: {formatINR(calculatedTotals.taxAmount)}</span>
                    {calculatedTotals.appliedCharges.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Other Charges: {formatINR(calculatedTotals.appliedCharges.reduce((s, c) => s + c.amount, 0))}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase font-bold">Grand Total:</span>
                    <span className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-400">
                      {formatINR(calculatedTotals.total)}
                    </span>
                  </div>
                </div>
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

      {/* Modal: Update Invoice Status */}
      {statusModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Update Invoice Status
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoice <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{statusModalInvoice.invoiceNumber}</span> • {statusModalInvoice.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalInvoice(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Invoice Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Total Bill Amount</div>
                <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {formatINR(statusModalInvoice.total)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Due Date</div>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formatDate(statusModalInvoice.dueDate)}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveStatusUpdate} className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusModalStatus('paid');
                      if (!statusModalAmount || parseFloat(statusModalAmount) === 0) {
                        setStatusModalAmount(statusModalInvoice.total.toString());
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      statusModalStatus === 'paid'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>PAID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusModalStatus('unpaid')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      statusModalStatus === 'unpaid'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>UNPAID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusModalStatus('overdue')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      statusModalStatus === 'overdue'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-sm ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>OVERDUE</span>
                  </button>
                </div>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status / Payment Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="date"
                      value={statusModalDate}
                      onChange={(e) => setStatusModalDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Settled / Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={statusModalAmount}
                    onChange={(e) => setStatusModalAmount(e.target.value)}
                    placeholder={statusModalStatus === 'paid' ? statusModalInvoice.total.toString() : '0'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Receipt / Proof Image Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    Attach Payment Proof / Receipt (Image or PDF)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional • Max 25MB</span>
                </label>

                <input
                  type="file"
                  ref={statusFileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processInvoiceFile(f);
                  }}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {statusModalReceiptUrl ? (
                  <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {statusModalReceiptType === 'pdf' ? (
                        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 overflow-hidden shrink-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={statusModalReceiptUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {statusModalReceiptName || 'Attached Document'}
                        </div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                          {statusModalReceiptType || 'FILE'} Attached
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            url: statusModalReceiptUrl,
                            name: statusModalReceiptName || 'Payment_Proof',
                            type: statusModalReceiptType || 'image',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusModalReceiptUrl(null);
                          setStatusModalReceiptName('');
                          setStatusModalReceiptType('');
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => statusFileInputRef.current?.click()}
                    className="w-full p-3.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-semibold"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Click to Upload Payment Screenshot, Receipt or PDF</span>
                  </button>
                )}
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment / Status Notes (Optional)
                </label>
                <input
                  type="text"
                  value={statusModalNotes}
                  onChange={(e) => setStatusModalNotes(e.target.value)}
                  placeholder="e.g. Paid via PhonePe UPI / Cheque #12345 / Cash collected"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalInvoice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Status & Payment History Timeline */}
      {historyModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Status & Payment History
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoice <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{historyModalInvoice.invoiceNumber}</span> • {historyModalInvoice.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalInvoice(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Snapshot */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Status</span>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${
                    historyModalInvoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : historyModalInvoice.status === 'overdue'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  {historyModalInvoice.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {formatINR(historyModalInvoice.total)}
                </span>
              </div>
            </div>

            {/* Timeline Entries */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyModalInvoice.statusHistory && historyModalInvoice.statusHistory.length > 0 ? (
                historyModalInvoice.statusHistory.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            entry.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : entry.status === 'overdue'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      {entry.amount !== undefined && entry.amount > 0 && (
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatINR(entry.amount)}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                        {entry.notes}
                      </p>
                    )}

                    {entry.receiptUrl && (
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">
                            {entry.receiptName || 'Attached Receipt / Proof'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              url: entry.receiptUrl!,
                              name: entry.receiptName || 'Payment_Proof',
                              type: entry.receiptType || 'image',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {/* Synthesized Initial Record */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            historyModalInvoice.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {historyModalInvoice.status}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDate(historyModalInvoice.issueDate)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {formatINR(historyModalInvoice.total)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Invoice generated with initial status {historyModalInvoice.status.toUpperCase()}.
                    </p>
                    {historyModalInvoice.receiptUrl && (
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{historyModalInvoice.receiptName || 'Attached Proof'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              url: historyModalInvoice.receiptUrl!,
                              name: historyModalInvoice.receiptName || 'Payment_Proof',
                              type: historyModalInvoice.receiptType || 'image',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-indigo-600 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const inv = historyModalInvoice;
                  setHistoryModalInvoice(null);
                  handleOpenStatusModal(inv);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Update Status Now
              </button>

              <button
                type="button"
                onClick={() => setHistoryModalInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Document / Image / PDF Fullscreen Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {previewDoc.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.type === 'pdf' ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[65vh] border-0 rounded-2xl"
                />
              ) : previewDoc.url.startsWith('data:image/') || previewDoc.type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-sm"
                />
              ) : (
                <div className="p-8 text-center space-y-2">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">Document preview not directly renderable</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-bold">
                {previewDoc.type} Preview
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invoice Charges & Tax Configuration (Gear Icon) */}
      {isChargesConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Invoice Charges & Tax Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set GST rates & custom charges (Delivery, Packaging, etc.)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChargesConfigModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Configured Charges List */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Taxes & Additional Charges
              </span>

              <div className="space-y-2">
                {invoiceChargesConfig.map((chg) => (
                  <div
                    key={chg.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={chg.enabled}
                        onChange={(e) => handleUpdateChargeField(chg.id, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        title="Enable by default when creating new invoice"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {chg.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {chg.isSystemTax ? 'Standard Tax' : 'Custom Charge'} • Default: {chg.enabled ? 'Active' : 'Optional'}
                        </span>
                      </div>
                    </div>

                    {/* Value & Type controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={chg.value}
                          onChange={(e) =>
                            handleUpdateChargeField(chg.id, 'value', parseFloat(e.target.value) || 0)
                          }
                          className="w-14 text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white text-right focus:outline-none"
                        />
                        <select
                          value={chg.type}
                          onChange={(e) =>
                            handleUpdateChargeField(chg.id, 'type', e.target.value as 'percentage' | 'fixed')
                          }
                          className="text-[11px] font-bold bg-transparent text-indigo-600 dark:text-indigo-400 cursor-pointer focus:outline-none"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">₹ (Fixed)</option>
                        </select>
                      </div>

                      {!chg.isSystemTax && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCharge(chg.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Delete Charge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Custom Charge Form */}
            <form onSubmit={handleAddCustomCharge} className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add New Charge (e.g. Delivery, Packaging, Handling)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Charge Name (e.g. Delivery Charge)"
                    value={newChargeName}
                    onChange={(e) => setNewChargeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Value"
                    value={newChargeValue}
                    onChange={(e) => setNewChargeValue(e.target.value)}
                    className="w-12 text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white text-right focus:outline-none"
                  />
                  <select
                    value={newChargeType}
                    onChange={(e) => setNewChargeType(e.target.value as 'percentage' | 'fixed')}
                    className="text-[11px] font-bold bg-transparent text-indigo-600 dark:text-indigo-400 cursor-pointer focus:outline-none"
                  >
                    <option value="fixed">₹</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Charge</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsChargesConfigModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
