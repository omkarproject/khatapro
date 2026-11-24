'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Loading from '@/components/Loading';
import { StorageService } from '@/services/storage';
import { Invoice, PaymentCollectionMode, isGatewayActive, PaymentMode } from '@/types';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl } from '@/lib/utils';
import {
  generateInvoicePdfBlob,
  generateReceiptCanvasBlob,
  generateInvoiceQrWithLogo,
} from '@/lib/invoicePdfGenerator';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  CreditCard,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Download,
  Lock,
  RefreshCw,
  Smartphone,
  Shield,
  X,
  Building2,
  Wallet,
  Zap,
  Key,
  ExternalLink,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';

function CustomerPayInvoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params?.id as string;
  const gwParam = searchParams?.get('gw') as PaymentCollectionMode | null;

  const { invoices, saveInvoice, settings, updateSettings, profile, currentUser, addTransaction, addToast } = useApp();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active online payment gateway resolution (Cashfree PG, Razorpay PG, or UPI PG)
  const activeGateway = useMemo<PaymentCollectionMode>(() => {
    if (gwParam && ['cashfree', 'razorpay', 'upi_gateway'].includes(gwParam)) {
      return gwParam;
    }
    const mode = settings.paymentSettings?.collectionMode;
    if (mode && mode !== 'direct_upi') {
      return mode;
    }
    if (isGatewayActive('cashfree', settings.paymentSettings)) return 'cashfree';
    if (isGatewayActive('razorpay', settings.paymentSettings)) return 'razorpay';
    if (isGatewayActive('upi_gateway', settings.paymentSettings)) return 'upi_gateway';
    return 'cashfree';
  }, [gwParam, settings.paymentSettings]);

  // Gateway processing fee (2% for Cashfree PG and Razorpay PG, 0% for UPI PG / direct)
  const gatewayFeePercent = useMemo(() => {
    if (activeGateway === 'cashfree' || activeGateway === 'razorpay') {
      return 0.02;
    }
    return 0;
  }, [activeGateway]);

  const gatewayFeeAmount = useMemo(() => {
    if (!invoice || gatewayFeePercent === 0) return 0;
    return Math.round(invoice.total * gatewayFeePercent * 100) / 100;
  }, [invoice, gatewayFeePercent]);

  const totalPayableWithFee = useMemo(() => {
    if (!invoice) return 0;
    return Math.round((invoice.total + gatewayFeeAmount) * 100) / 100;
  }, [invoice, gatewayFeeAmount]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [txnRef, setTxnRef] = useState<string>('');
  const [lastGatewayTxnId, setLastGatewayTxnId] = useState<string>('');
  const [lastReceiptNo, setLastReceiptNo] = useState<string>('');
  const [lastReceiptImgUrl, setLastReceiptImgUrl] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const isPaymentHandledRef = React.useRef(false);

  // Cashfree API Integration States
  const [cfApiError, setCfApiError] = useState('');
  const [isCfLoading, setIsCfLoading] = useState(false);
  const [isMobileItemsExpanded, setIsMobileItemsExpanded] = useState(false);

  // Load invoice from context, localStorage, or server
  useEffect(() => {
    if (!invoiceId) {
      setIsLoading(false);
      return;
    }

    const isLinkDestroyed =
      typeof window !== 'undefined' &&
      (localStorage.getItem(`sk_destroyed_pay_link_${invoiceId}`) === 'true' ||
       localStorage.getItem(`sk_destroyed_pay_link_${decodeURIComponent(invoiceId)}`) === 'true');

    const settledRaw =
      typeof window !== 'undefined'
        ? localStorage.getItem(`sk_invoice_settled_${invoiceId}`) ||
          localStorage.getItem(`sk_invoice_settled_${decodeURIComponent(invoiceId)}`)
        : null;

    let allInvoices = invoices.length > 0 ? invoices : StorageService.getInvoices();
    if (allInvoices.length === 0 && typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('skp_invoices')) {
          try {
            const p = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(p) && p.length > 0) {
              allInvoices = p;
              break;
            }
          } catch {}
        }
      }
    }

    const found = allInvoices.find(
      (inv) => inv.id === invoiceId || inv.invoiceNumber === decodeURIComponent(invoiceId)
    );

    if (found) {
      const isActuallyPaid = found.status === 'paid' || isLinkDestroyed || !!settledRaw;
      const targetInv: Invoice = isActuallyPaid ? { ...found, status: 'paid', paidAmount: found.total } : found;
      setInvoice(targetInv);

      if (isActuallyPaid) {
        setPaymentSuccess(true);
        if (targetInv.receiptUrl) setLastReceiptImgUrl(targetInv.receiptUrl);

        // Read settled details from settledRaw or history/notes
        const targetSettledRaw =
          settledRaw ||
          (typeof window !== 'undefined' &&
            (localStorage.getItem(`sk_invoice_settled_${invoiceId}`) ||
              (found.id && localStorage.getItem(`sk_invoice_settled_${found.id}`)) ||
              (found.invoiceNumber && localStorage.getItem(`sk_invoice_settled_${found.invoiceNumber}`)))) ||
          null;

        if (targetSettledRaw) {
          try {
            const s = JSON.parse(targetSettledRaw);
            if (s.referenceNo && !s.referenceNo.startsWith('inv_')) setTxnRef(s.referenceNo);
            if (s.receiptNo && !s.receiptNo.includes(invoiceId)) setLastReceiptNo(s.receiptNo);
            if (s.gatewayTxnId) setLastGatewayTxnId(s.gatewayTxnId);
            if (s.receiptUrl) setLastReceiptImgUrl(s.receiptUrl);
          } catch {}
        }

        const histNote = targetInv.statusHistory?.[0]?.notes || targetInv.notes || '';
        if (histNote) {
          const matchUtr = histNote.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([A-Za-z0-9_-]+)/i);
          if (matchUtr && !matchUtr[1].startsWith('inv_')) {
            setTxnRef((curr) => (curr && !curr.startsWith('inv_') ? curr : matchUtr[1]));
          }
          const matchRec = histNote.match(/Receipt ID[:\s]+([A-Za-z0-9_-]+)/i);
          if (matchRec && !matchRec[1].includes(invoiceId)) {
            setLastReceiptNo((curr) => (curr && !curr.includes(invoiceId) ? curr : matchRec[1]));
          }
          const matchTxn = histNote.match(/Transaction ID[:\s]+([A-Za-z0-9_-]+)/i);
          if (matchTxn) {
            setLastGatewayTxnId((curr) => curr || matchTxn[1]);
          }
        }
      } else {
        setPaymentSuccess(false);
      }
    } else if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const paramAmount = parseFloat(sp.get('amount') || '0');
      if (paramAmount > 0) {
        const adhocInvoice: Invoice = {
          id: invoiceId,
          invoiceNumber: invoiceId.toUpperCase(),
          type: 'sales',
          customerId: sp.get('customerId') || 'cust_walkin',
          customerName: sp.get('name') || 'Valued Customer',
          customerPhone: sp.get('phone') || '',
          issueDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          items: [
            {
              id: 'item_1',
              name: sp.get('note') || 'Online Payment Collection',
              description: sp.get('note') || 'Direct online collection',
              quantity: 1,
              unitPrice: paramAmount,
              discountPercent: 0,
              taxPercent: 0,
              total: paramAmount,
            },
          ],
          subtotal: paramAmount,
          discountAmount: 0,
          taxAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: paramAmount,
          paidAmount: isLinkDestroyed ? paramAmount : 0,
          status: isLinkDestroyed ? 'paid' : 'unpaid',
          notes: sp.get('note') || 'Direct online collection',
          createdAt: new Date().toISOString(),
        };
        setInvoice(adhocInvoice);
        if (isLinkDestroyed) setPaymentSuccess(true);
      }
    }

    // Check with backend Supabase whether invoice was settled
    fetch(`/api/pay/confirm?invoiceId=${encodeURIComponent(invoiceId)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res && res.isPaid) {
          setPaymentSuccess(true);
          setInvoice((prev) => (prev ? { ...prev, status: 'paid', paidAmount: prev.total, receiptUrl: res.invoice?.receiptUrl || prev.receiptUrl } : prev));
          // Never overwrite valid true reference / receipt numbers with fallback values
          if (res.receipt?.referenceNo && !res.receipt.referenceNo.startsWith('inv_')) {
            setTxnRef((curr) => (curr && !curr.startsWith('inv_') ? curr : res.receipt.referenceNo));
          }
          if (res.receipt?.receiptNo && !res.receipt.receiptNo.includes(invoiceId) && !res.receipt.receiptNo.includes(found?.invoiceNumber || '')) {
            setLastReceiptNo((curr) => (curr && !curr.includes(invoiceId) ? curr : res.receipt.receiptNo));
          }
          if (res.receipt?.gatewayTxnId) {
            setLastGatewayTxnId((curr) => curr || res.receipt.gatewayTxnId);
          }
          if (res.invoice?.receiptUrl) {
            setLastReceiptImgUrl((curr) => curr || res.invoice.receiptUrl);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(`sk_destroyed_pay_link_${invoiceId}`, 'true');
          }
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [invoiceId, invoices]);

  // 10-Second Auto-Redirect Countdown Effect
  useEffect(() => {
    if (!paymentSuccess) {
      setRedirectCountdown(null);
      return;
    }
    if (redirectCountdown === null) {
      setRedirectCountdown(10);
      return;
    }
    if (redirectCountdown <= 0) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return;
    }
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentSuccess, redirectCountdown]);

  // Dynamic business & payment details resolved from Enterprise Information
  const merchantName = (settings.businessName || profile.businessName || currentUser?.businessName || 'Merchant').trim();
  const payeeName = (settings.paymentSettings?.payeeName || settings.businessName || profile.businessName || currentUser?.businessName || 'Merchant').trim();
  const merchantPhone = (settings.businessPhone || profile.phone || currentUser?.phone || '').trim();
  const merchantEmail = (settings.businessEmail || profile.email || currentUser?.email || '').trim();
  const merchantGst = (settings.paymentSettings?.businessGst || profile.businessGst || '').trim();
  const merchantAddress = (settings.businessAddress || profile.businessAddress || '').trim();
  const merchantLogo = settings.businessLogo || profile.avatarUrl || currentUser?.avatarUrl || '';
  const upiId = (settings.paymentSettings.upiId || (merchantPhone ? `${merchantPhone}@upi` : '')).trim();

  // Build deep links
  const upiDeepLink = useMemo(() => {
    if (!invoice || !upiId) return '';
    return buildUpiUri(upiId, payeeName, invoice.total, `Invoice_${invoice.invoiceNumber}`);
  }, [upiId, payeeName, invoice]);

  const qrCodeUrl = useMemo(() => {
    if (settings.paymentSettings.customQrUrl) return settings.paymentSettings.customQrUrl;
    if (!upiDeepLink) return '';
    return getQrCodeUrl(upiDeepLink, 320);
  }, [upiDeepLink, settings.paymentSettings.customQrUrl]);

  // Load Razorpay Checkout Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Load Cashfree JS SDK Script
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Cashfree) return resolve(true);

      let isResolved = false;
      const safeResolve = (val: boolean) => {
        if (!isResolved) {
          isResolved = true;
          resolve(val);
        }
      };

      const timeoutId = setTimeout(() => {
        safeResolve(!!(window as any).Cashfree);
      }, 5000);

      const existing = document.querySelector('script[src*="cashfree.js"]');
      if (existing) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if ((window as any).Cashfree) {
            clearInterval(interval);
            clearTimeout(timeoutId);
            safeResolve(true);
          } else if (attempts > 30) {
            clearInterval(interval);
            clearTimeout(timeoutId);
            safeResolve(false);
          }
        }, 50);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => {
        clearTimeout(timeoutId);
        safeResolve(!!(window as any).Cashfree);
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        safeResolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Payment completion handler
  const handleCompletePayment = async (
    gatewayName: string,
    bankRef: string,
    gatewayTxnId?: string,
    extraVerifyPayload?: {
      orderId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      cashfreeAppId?: string;
      cashfreeSecretKey?: string;
      cashfreeEnv?: string;
    }
  ) => {
    if (!invoice) return;
    if (isPaymentHandledRef.current) return;
    isPaymentHandledRef.current = true;
    setIsProcessing(false);

    const finalTxnId = (bankRef || '').trim() || `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const finalReceiptNo = `SKP-REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const onlineTxnId = `txn_online_${finalTxnId}`;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const formattedDateTime = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let cleanGwName = 'Cashfree';
    if (gatewayName.toLowerCase().includes('razorpay')) cleanGwName = 'Razorpay';
    else if (gatewayName.toLowerCase().includes('upi_gateway') || gatewayName.toLowerCase().includes('upi pg')) cleanGwName = 'UPI PG';
    else if (gatewayName.toLowerCase().includes('direct')) cleanGwName = 'Default UPI';

    const cleanPaymentNote = gatewayTxnId
      ? `Receipt ID: ${finalReceiptNo}\n${cleanGwName} - Bank Ref / UTR: ${finalTxnId}\nTransaction ID: ${gatewayTxnId}`
      : `Receipt ID: ${finalReceiptNo}\n${cleanGwName} - Bank Ref / UTR: ${finalTxnId}`;

    // 1. Generate high-resolution receipt canvas image
    let receiptImgUrl = '';
    try {
      receiptImgUrl = await generateReceiptCanvasBlob({
        receiptNo: finalReceiptNo,
        amount: totalPayableWithFee,
        dueAmount: invoice.total,
        gatewayFee: gatewayFeeAmount,
        payeeName: payeeName || merchantName,
        payeeUpi: upiId,
        customerName: invoice.customerName || 'Customer',
        customerPhone: invoice.customerPhone || '',
        customerEmail: (invoice as any).customerEmail || merchantEmail,
        dateTime: formattedDateTime,
        paymentMode: gatewayName,
        referenceNo: finalTxnId,
        gatewayTxnId: gatewayTxnId || '',
        websiteName: settings.websiteName || profile.businessName || 'SmartKhata',
      });
    } catch (e) {
      console.warn('Could not generate receipt canvas:', e);
    }

    // 2. Update invoice to PAID with attached receipt
    const historyEntry = {
      id: `hist_${Date.now()}`,
      status: 'paid' as const,
      date: todayDate,
      amount: invoice.total,
      notes: cleanPaymentNote,
      receiptUrl: receiptImgUrl || undefined,
      receiptName: `Payment_Receipt_${finalTxnId}.png`,
      receiptType: 'image' as const,
      updatedAt: nowIso,
    };

    const updatedInv: Invoice = {
      ...invoice,
      status: 'paid',
      paidAmount: invoice.total,
      paymentDate: todayDate,
      receiptUrl: receiptImgUrl || undefined,
      receiptName: `Payment_Receipt_${finalTxnId}.png`,
      receiptType: 'image',
      statusHistory: [historyEntry, ...(invoice.statusHistory || [])],
    };

    saveInvoice(updatedInv);
    setInvoice(updatedInv);

    // Mark link as destroyed & permanently settled in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`sk_destroyed_pay_link_${invoice.id}`, 'true');
        localStorage.setItem(`sk_destroyed_pay_link_${invoice.invoiceNumber}`, 'true');
        if (invoiceId) {
          localStorage.setItem(`sk_destroyed_pay_link_${invoiceId}`, 'true');
        }
        const settledPayload = JSON.stringify({
          receiptNo: finalReceiptNo,
          referenceNo: finalTxnId,
          gatewayTxnId: gatewayTxnId || '',
          paidAmount: invoice.total,
          receiptUrl: receiptImgUrl,
          settledAt: nowIso,
        });
        localStorage.setItem(`sk_invoice_settled_${invoice.id}`, settledPayload);
        localStorage.setItem(`sk_invoice_settled_${invoice.invoiceNumber}`, settledPayload);
        if (invoiceId) {
          localStorage.setItem(`sk_invoice_settled_${invoiceId}`, settledPayload);
        }

        // Clean up any scheduled payment reminder for this invoice in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('skp_reminders')) {
            try {
              const raw = localStorage.getItem(k);
              if (raw) {
                const remList = JSON.parse(raw);
                if (Array.isArray(remList)) {
                  const filtered = remList.filter((r: any) => {
                    if (r.id === `rem_inv_${invoice.id}` || r.id === `rem_inv_${invoice.invoiceNumber}`) return false;
                    if (invoice.invoiceNumber && (r.note?.includes(invoice.invoiceNumber) || r.messageTemplate?.includes(invoice.invoiceNumber))) return false;
                    return true;
                  });
                  localStorage.setItem(k, JSON.stringify(filtered));
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    // Direct localStorage update & realtime broadcast for Invoices
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('skp_invoices')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const invList = JSON.parse(raw);
              if (Array.isArray(invList)) {
                const idx = invList.findIndex((it: any) => it.id === updatedInv.id || it.invoiceNumber === updatedInv.invoiceNumber);
                if (idx !== -1) {
                  invList[idx] = updatedInv;
                } else {
                  invList.unshift(updatedInv);
                }
                localStorage.setItem(k, JSON.stringify(invList));
              }
            }
          } catch {}
        }
      }
      window.dispatchEvent(new CustomEvent('khatapro_invoices_updated', { detail: updatedInv }));
      localStorage.setItem('khatapro_realtime_ping', `inv_${Date.now()}`);
    } catch (e) {
      console.warn('Direct storage sync warning for invoices:', e);
    }

    // 3. Record in Digital Khata ledger & Payment Collection Hub
    const receiptAttachment = JSON.stringify({
      name: `Payment_Receipt_${finalTxnId}.png`,
      url: receiptImgUrl,
      size: 'Settled Receipt',
      type: 'image',
    });

    const newTxn = {
      id: onlineTxnId,
      customerId: invoice.customerId || 'cust_walkin',
      customerName: invoice.customerName || 'Customer',
      type: 'debit' as const, // "Payment Received" in Digital Khatabook!
      amount: invoice.total,
      date: nowIso,
      category: 'Payment Received',
      note: cleanPaymentNote,
      paymentMode: (gatewayName.toLowerCase().includes('card') ? 'card' : 'upi') as PaymentMode,
      referenceNo: finalTxnId,
      gatewayTxnId: gatewayTxnId || '',
      attachments: receiptImgUrl ? [receiptAttachment] : [],
      status: 'completed' as const,
      createdBy: merchantName || payeeName || 'SmartKhata Online Checkout',
      createdAt: nowIso,
    };

    try {
      addTransaction(newTxn);
    } catch (e) {
      console.warn('Local context addTransaction fallback:', e);
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('skp_transactions')) {
          try {
            const rawTxns = localStorage.getItem(k);
            const list = rawTxns ? JSON.parse(rawTxns) : [];
            if (Array.isArray(list)) {
              if (!list.some((t: any) => t.id === newTxn.id || (t.referenceNo && t.referenceNo === finalTxnId))) {
                list.unshift(newTxn);
                localStorage.setItem(k, JSON.stringify(list));
              }
            }
          } catch {}
        }
      }

      if (invoice.customerId) {
        const rawCusts = localStorage.getItem('skp_customers');
        if (rawCusts) {
          const custList = JSON.parse(rawCusts);
          const cIdx = custList.findIndex((c: any) => c.id === invoice.customerId);
          if (cIdx !== -1) {
            const currentDue = Number(custList[cIdx].outstandingBalance ?? custList[cIdx].outstanding_balance ?? 0);
            const updatedDue = Math.max(0, currentDue - invoice.total);
            custList[cIdx].outstandingBalance = updatedDue;
            custList[cIdx].outstanding_balance = updatedDue;
            localStorage.setItem('skp_customers', JSON.stringify(custList));
          }
        }
      }

      window.dispatchEvent(new CustomEvent('khatapro_transactions_updated', { detail: newTxn }));
      localStorage.setItem('khatapro_realtime_ping', `pay_${Date.now()}`);
    } catch (syncErr) {
      console.warn('Direct storage sync warning for transactions:', syncErr);
    }

    // 4. Server-side Supabase sync via /api/pay/confirm with gateway verification
    try {
      await fetch('/api/pay/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          amount: invoice.total,
          receiptNo: finalReceiptNo,
          referenceNo: finalTxnId,
          gatewayTxnId: gatewayTxnId || '',
          gateway: gatewayName,
          note: cleanPaymentNote,
          receiptUrl: receiptImgUrl,
          invoiceId: invoice.id,
          txnId: onlineTxnId,
          orderId: extraVerifyPayload?.orderId,
          razorpayOrderId: extraVerifyPayload?.razorpayOrderId,
          razorpayPaymentId: extraVerifyPayload?.razorpayPaymentId,
          razorpaySignature: extraVerifyPayload?.razorpaySignature,
          cashfreeAppId: extraVerifyPayload?.cashfreeAppId,
          cashfreeSecretKey: extraVerifyPayload?.cashfreeSecretKey,
          cashfreeEnv: extraVerifyPayload?.cashfreeEnv,
        }),
      });
    } catch (confirmErr) {
      console.warn('Server confirmation error:', confirmErr);
    }

    setTxnRef(finalTxnId);
    setLastGatewayTxnId(gatewayTxnId || '');
    setLastReceiptNo(finalReceiptNo);
    setLastReceiptImgUrl(receiptImgUrl);
    setPaymentSuccess(true);
    setRedirectCountdown(10);
    addToast('Payment Verified & Settled!', `Invoice #${invoice.invoiceNumber} has been marked as PAID.`, 'success');
  };

  // Download high-res vector Tax Invoice PDF (Universal for Paid & Unpaid)
  const handleDownloadInvoicePdf = async (customStatus?: 'paid' | 'unpaid') => {
    if (!invoice) return;
    try {
      setIsDownloadingPdf(true);
      addToast('Generating PDF', 'Generating official Tax Invoice PDF...', 'info');
      const merchantLogo = (
        settings.businessLogo ||
        profile.avatarUrl ||
        currentUser?.avatarUrl ||
        settings.websiteLogo ||
        '/brand-logo.png'
      ).trim();
      const qrDataUrl = await generateInvoiceQrWithLogo(upiDeepLink, merchantLogo, 320);
      const isPaid = customStatus
        ? customStatus === 'paid'
        : (paymentSuccess || invoice.status === 'paid');
      const targetInv: Invoice = {
        ...invoice,
        status: isPaid ? 'paid' : (invoice.status || 'unpaid'),
        paidAmount: isPaid ? invoice.total : (invoice.paidAmount || 0),
      };
      const activeTmpl = (settings as any)?.selectedInvoiceTemplate || 
        (typeof window !== 'undefined' ? (localStorage.getItem('skp_invoice_template') || localStorage.getItem('selectedInvoiceTemplate')) : null) || 
        'template_minimal';
      const pdfBlob = await generateInvoicePdfBlob(targetInv, settings, profile, qrDataUrl, activeTmpl);
      const safeInvNum = (invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Tax_Invoice_${safeInvNum}${isPaid ? '_PAID' : ''}.pdf`;
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      addToast('Downloaded', `Invoice #${invoice.invoiceNumber} downloaded successfully.`, 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadPaidInvoicePdf = () => handleDownloadInvoicePdf('paid');

  // Download settled payment receipt PNG
  const handleDownloadReceiptImage = () => {
    const targetUrl = lastReceiptImgUrl || invoice?.receiptUrl;
    if (!targetUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = targetUrl;
    downloadLink.download = `Payment_Receipt_${txnRef || invoice?.invoiceNumber || 'settled'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    addToast('Downloaded', 'Payment receipt image downloaded.', 'success');
  };

  // Trigger Razorpay Checkout Modal
  const handlePayWithRazorpay = async () => {
    if (!invoice) return;
    setIsRazorpayLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        addToast('Gateway Error', 'Unable to load Razorpay Checkout SDK. Please check your internet connection.', 'error');
        setIsRazorpayLoading(false);
        return;
      }

      const razorpayKey = settings.paymentSettings?.razorpayKeyId?.trim() || 'rzp_test_1DP5mmOlF5G5ag';

      const options = {
        key: razorpayKey,
        amount: Math.round(totalPayableWithFee * 100), // amount in paise
        currency: 'INR',
        name: merchantName || 'KhataPro Merchant',
        description: `Payment for Tax Invoice #${invoice.invoiceNumber}`,
        image: merchantLogo || 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
        handler: async function (response: any) {
          setIsRazorpayLoading(true);
          try {
            const vRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (vData.success && vData.verified) {
              await handleCompletePayment('Razorpay PG', response.razorpay_payment_id, response.razorpay_order_id, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            } else {
              addToast('Payment Error', vData.message || 'Razorpay payment verification failed.', 'error');
            }
          } catch {
            addToast('Verification Error', 'Unable to verify payment with Razorpay.', 'error');
          } finally {
            setIsRazorpayLoading(false);
          }
        },
        prefill: {
          name: invoice.customerName || '',
          contact: invoice.customerPhone || '',
          email: merchantEmail || (invoice as any).customerEmail || '',
        },
        notes: {
          invoice_number: invoice.invoiceNumber,
          customer_name: invoice.customerName,
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsRazorpayLoading(false);
            addToast('Checkout Closed', 'Payment window was closed.', 'info');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsRazorpayLoading(false);
        addToast('Payment Failed', resp.error?.description || 'Payment could not be completed.', 'error');
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      setIsRazorpayLoading(false);
      addToast('Payment Error', 'Failed to initialize Razorpay checkout.', 'error');
    }
  };

  // Connect to Admin on WhatsApp with Error Details
  const handleConnectAdminWhatsApp = (customError?: string) => {
    if (!invoice) return;
    const adminPhone = (merchantPhone || profile.phone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    const orderRef = lastOrderId || `INV_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    const invoiceUrl = typeof window !== 'undefined' ? window.location.href : '';
    const errText =
      customError ||
      cfApiError ||
      'Broken Link! localhost/domain is not enabled in Cashfree. Please whitelist domain or provide alternate payment method.';

    const message = `🚨 *Payment Assistance / Error Report*
------------------------------------------------
📄 *Invoice:* #${invoice.invoiceNumber}
💰 *Total Payable:* ${formatINR(totalPayableWithFee)}
👤 *Customer:* ${invoice.customerName || 'Customer'}
📱 *Customer Phone:* ${invoice.customerPhone || 'N/A'}
🏢 *Merchant:* ${merchantName}

⚠️ *Error Encountered:*
"${errText}"

🆔 *Order Reference:* ${orderRef}
🔗 *Payment URL:* ${invoiceUrl}
------------------------------------------------
_Hello, I encountered this error while trying to pay. Please assist._`;

    // Copy to clipboard for easy paste with screenshot image
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
    addToast('Connecting WhatsApp', 'Error details copied to clipboard & WhatsApp opened!', 'success');

    if (adminPhone) {
      const waUrl = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    }
  };

  // Check for Cashfree mobile redirect / return URL parameter (e.g. ?order_id=INV_...) across iOS, Android & Windows
  const redirectOrderId = searchParams?.get('order_id') || searchParams?.get('cf_order_id');
  useEffect(() => {
    if (!redirectOrderId || isPaymentHandledRef.current || !invoice) return;
    let isMounted = true;

    async function checkRedirectPayment() {
      setIsCfLoading(true);
      try {
        const verifyRes = await fetch('/api/cashfree/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: redirectOrderId }),
        });
        const verifyData = await verifyRes.json();
        if (isMounted && verifyData.success && verifyData.paymentStatus === 'SUCCESS') {
          const realBankRef = String(verifyData.bankReference || verifyData.cfPaymentId || redirectOrderId).trim();
          const cfTxnId = String(verifyData.cfPaymentId || '').trim();
          await handleCompletePayment('Cashfree Official PG', realBankRef, cfTxnId, {
            orderId: redirectOrderId || undefined,
          });
        } else if (isMounted) {
          const msg = verifyData.message || 'Payment not verified by gateway.';
          setCfApiError(msg);
          addToast('Payment Notice', msg, 'info');
        }
      } catch (err: any) {
        if (isMounted) {
          setCfApiError('Could not verify return payment status.');
        }
      } finally {
        if (isMounted) setIsCfLoading(false);
      }
    }

    checkRedirectPayment();
    return () => { isMounted = false; };
  }, [redirectOrderId, invoice]);

  // REAL CASHFREE API EXECUTION FUNCTION
  const executeCashfreeApiCheckout = async (
    customAmount?: number,
    target: '_modal' | '_self' = '_modal'
  ) => {
    if (!invoice) return;
    setIsCfLoading(true);
    setCfApiError('');

    const newOrderId = `INV_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    setLastOrderId(newOrderId);

    const appId = settings.paymentSettings?.cashfreeAppId?.trim();
    const secretKey = settings.paymentSettings?.cashfreeSecretKey?.trim();
    const env = settings.paymentSettings?.cashfreeEnv || 'production';
    const amountToPay = customAmount !== undefined ? customAmount : totalPayableWithFee;

    try {
      // 1. Create order on Cashfree server via our API route
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const res = await fetch('/api/cashfree/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderId,
          orderAmount: amountToPay,
          customerName: invoice.customerName || 'Customer',
          customerPhone: invoice.customerPhone || '9820111223',
          customerEmail: (invoice as any).customerEmail || merchantEmail || 'anantyadav8925@gmail.com',
          orderNote: (settings.websiteName || profile?.businessName || 'SmartKhata').trim(),
          brandDisplayName: (settings.websiteName || profile?.businessName || 'SmartKhata').trim(),
          appId: appId || undefined,
          secretKey: secretKey || undefined,
          env,
          returnUrl: currentUrl,
          customerId: invoice.customerId || undefined,
          merchantUserId: (invoice as any).userId || (invoice as any).user_id || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        const errorMsg = data.error || 'Failed to initialize Cashfree checkout session.';
        setCfApiError(errorMsg);
        setIsCfLoading(false);
        return;
      }

      // 2. Load official Cashfree SDK
      const sdkLoaded = await loadCashfreeScript();
      if (!sdkLoaded || !(window as any).Cashfree) {
        const errorMsg = 'Unable to load Cashfree checkout SDK. Please check your internet connection.';
        setCfApiError(errorMsg);
        setIsCfLoading(false);
        return;
      }

      // 3. Launch official Cashfree Checkout Modal / Redirect
      const checkoutEnv = data.env || env;
      const cashfree = typeof (window as any).Cashfree === 'function'
        ? (window as any).Cashfree({ mode: checkoutEnv === 'production' ? 'production' : 'sandbox' })
        : new (window as any).Cashfree({ mode: checkoutEnv === 'production' ? 'production' : 'sandbox' });

      const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const effectiveTarget: '_modal' | '_self' = target === '_modal' && isMobile ? '_self' : target;

      const cfTimer = setTimeout(() => {
        setIsCfLoading(false);
      }, 2000);

      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: effectiveTarget,
      }).then(async (result: any) => {
        clearTimeout(cfTimer);
        setIsCfLoading(false);
        if (result?.error) {
          const errorMsg = result.error.message || 'Payment was cancelled or closed.';
          setCfApiError(errorMsg);
          addToast('Payment Notice', errorMsg, 'info');
          return;
        }

        if (result?.paymentDetails) {
          // 4. STRICT verify payment with Cashfree Server API
          try {
            const verifyRes = await fetch('/api/cashfree/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId || newOrderId,
                appId: appId || undefined,
                secretKey: secretKey || undefined,
                env: checkoutEnv,
                customerId: invoice.customerId || undefined,
                merchantUserId: (invoice as any).userId || (invoice as any).user_id || undefined,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success && verifyData.paymentStatus === 'SUCCESS') {
              const realBankRef =
                (verifyData.bankReference ? String(verifyData.bankReference).trim() : '') ||
                (result.paymentDetails?.bankReference ? String(result.paymentDetails.bankReference).trim() : '') ||
                (verifyData.cfPaymentId ? String(verifyData.cfPaymentId).trim() : '') ||
                (result.paymentDetails?.cfPaymentId ? String(result.paymentDetails.cfPaymentId).trim() : '') ||
                `CF_${Date.now()}`;
              const cfTxnId =
                (verifyData.cfPaymentId ? String(verifyData.cfPaymentId).trim() : '') ||
                (result.paymentDetails?.cfPaymentId ? String(result.paymentDetails.cfPaymentId).trim() : '');

              await handleCompletePayment('Cashfree Official PG', realBankRef, cfTxnId, {
                orderId: data.orderId || newOrderId,
                cashfreeAppId: appId || undefined,
                cashfreeSecretKey: secretKey || undefined,
                cashfreeEnv: checkoutEnv,
              });
            } else {
              const msg = verifyData.message || 'Payment not verified by gateway.';
              setCfApiError(msg);
              addToast('Payment Notice', msg, 'info');
            }
          } catch {
            setCfApiError('Could not verify payment with Cashfree server.');
          }
        }
      }).catch((chkErr: any) => {
        clearTimeout(cfTimer);
        setIsCfLoading(false);
        if (effectiveTarget === '_modal') {
          try {
            cashfree.checkout({
              paymentSessionId: data.paymentSessionId,
              redirectTarget: '_self',
            });
          } catch (e) {
            setCfApiError('Could not open payment checkout modal.');
          }
        } else {
          setCfApiError('Could not open payment gateway.');
        }
      });
    } catch (err: any) {
      console.error('Cashfree API Error:', err);
      const errMsg = err.message || 'Error communicating with Cashfree API.';
      setCfApiError(errMsg);
      setIsCfLoading(false);
    }
  };

  // Main Handler when clicking "Proceed to Cashfree Checkout"
  const handleOpenCashfreeCheckout = () => {
    executeCashfreeApiCheckout();
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Unified Loading Screen
  if (isLoading) {
    return (
      <Loading
        variant="initializing"
        title="Initializing..."
        subtitle="Connecting to Payment Gateway"
        fullScreen
      />
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070B14]">
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Invoice Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested invoice payment link could not be located or may have expired. Please verify the link with the merchant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] py-3 sm:py-8 px-3 sm:px-6 lg:px-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-6 print:max-w-none print:m-0 print:p-0 print:space-y-0">

        {/* Top Trust & Branding Bar - HIDDEN IN PRINT */}
        <div className="glass-card p-3 sm:p-5 rounded-2xl flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {merchantLogo ? (
              <img
                src={merchantLogo}
                alt={merchantName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl fintech-gradient-primary text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shadow-indigo-500/20 shrink-0">
                {merchantName.charAt(0) || 'M'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {merchantName}
                </h1>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {[merchantPhone, merchantEmail, merchantGst ? `GSTIN: ${merchantGst}` : ''].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDownloadInvoicePdf()}
              disabled={isDownloadingPdf}
              title="Download Tax Invoice PDF"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Download className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isDownloadingPdf ? 'Downloading...' : 'Download Invoice'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold items-center gap-1.5 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 print:block print:w-full">

          {/* Left Column (7 cols): Official Tax Invoice Details (FULL WIDTH IN PRINT) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 print:w-full print:m-0 print:p-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full print:text-black print:space-y-4">
              
              {/* PRINT ONLY MERCHANT HEADER - Only visible when printing */}
              <div className="hidden print:flex justify-between items-start pb-4 border-b border-slate-300 gap-3">
                <div className="flex items-start gap-3">
                  {merchantLogo && (
                    <img
                      src={merchantLogo}
                      alt={merchantName}
                      className="w-14 h-14 object-contain border border-slate-200 p-0.5 rounded-lg shrink-0"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-black text-slate-900">{merchantName}</h1>
                    <p className="text-xs text-slate-600 mt-1">
                      {[merchantPhone, merchantEmail, merchantGst ? `GSTIN: ${merchantGst}` : ''].filter(Boolean).join(' • ')}
                    </p>
                    {merchantAddress && (
                      <p className="text-xs text-slate-500 mt-0.5">{merchantAddress}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black uppercase tracking-wider text-slate-800">
                    TAX INVOICE
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Original for Recipient</div>
                </div>
              </div>

              {/* Invoice Meta Header */}
              <div className="flex justify-between items-start pb-3.5 sm:pb-5 border-b border-slate-100 dark:border-slate-800 print:border-slate-300 print:pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg print:border print:border-indigo-300 print:text-indigo-900">
                    Official Tax Invoice
                  </span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-1.5 sm:mt-2 print:text-black">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-1 print:text-slate-700">
                    Issued on: <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 print:text-slate-700">
                    Due by: <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Small Download Invoice Icon Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoicePdf()}
                    disabled={isDownloadingPdf}
                    title="Download Official Tax Invoice PDF"
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer shadow-2xs transition-all active:scale-95 print:hidden"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
                    <span className="hidden xs:inline sm:inline">{isDownloadingPdf ? 'Downloading...' : 'PDF'}</span>
                  </button>

                  <span
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wide inline-flex items-center gap-1 print:border ${
                      invoice.status === 'paid' || paymentSuccess
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                        : invoice.status === 'overdue'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 print:bg-rose-50 print:text-rose-800 print:border-rose-500'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                    }`}
                  >
                    {invoice.status === 'paid' || paymentSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {invoice.status === 'paid' || paymentSuccess ? 'PAID' : invoice.status}
                  </span>
                </div>
              </div>

              {/* Mobile Quick Preview Summary Row (Takes only ~35px on mobile, hidden on desktop) */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80 text-xs lg:hidden">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Billed To</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block text-xs">
                    {invoice.customerName || 'Customer'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileItemsExpanded(!isMobileItemsExpanded)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-indigo-200/60 dark:border-indigo-800/50"
                  >
                    <span>{isMobileItemsExpanded ? 'Hide Bill Items' : `Bill Items (${invoice.items?.length || 1})`}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileItemsExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Collapsible Details on Mobile, Always Visible on Desktop (lg:block) & Print */}
              <div className={`${isMobileItemsExpanded ? 'block' : 'hidden'} lg:block print:block space-y-4 sm:space-y-6 pt-1`}>
                {/* Billed To Customer Card */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Billed To
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {invoice.customerName}
                  </div>
                  {invoice.customerAddress && (
                    <div className="text-slate-500">{invoice.customerAddress}</div>
                  )}
                  {invoice.customerPhone && (
                    <div className="text-slate-500">Phone: {invoice.customerPhone}</div>
                  )}
                  {invoice.customerGst && (
                    <div className="text-indigo-600 font-mono font-semibold">
                      GSTIN: {invoice.customerGst}
                    </div>
                  )}
                </div>

                {/* Itemized Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] rounded-xl">
                      <tr>
                        <th className="py-2.5 px-3 rounded-l-xl">Description</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-2 text-center">GST</th>
                        <th className="py-2.5 px-3 text-right rounded-r-xl">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatINR(item.unitPrice)}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {item.taxPercent}%
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Financial Breakdown */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(invoice.subtotal)}</span>
                  </div>
                  {Number(invoice.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Special Discount:</span>
                      <span className="font-mono font-semibold">-{formatINR(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {Number(invoice.cgst || 0) > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Central GST (CGST 9%):</span>
                      <span className="font-mono">+{formatINR(invoice.cgst)}</span>
                    </div>
                  )}
                  {Number(invoice.sgst || 0) > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>State GST (SGST 9%):</span>
                      <span className="font-mono">+{formatINR(invoice.sgst)}</span>
                    </div>
                  )}
                  {Number(invoice.igst || 0) > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Integrated GST (IGST 18%):</span>
                      <span className="font-mono">+{formatINR(invoice.igst)}</span>
                    </div>
                  )}
                  {invoice.appliedCharges && invoice.appliedCharges.length > 0 &&
                    invoice.appliedCharges
                      .filter((chg) => Number(chg.amount || 0) > 0)
                      .map((chg) => (
                        <div key={chg.id} className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{chg.name}:</span>
                          <span className="font-mono">+{formatINR(chg.amount)}</span>
                        </div>
                      ))}
                  {gatewayFeeAmount > 0 && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400 font-medium">
                      <span>Gateway Processing Fee (2%):</span>
                      <span className="font-mono">+{formatINR(gatewayFeeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                    <span>Total Payable:</span>
                    <span className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {formatINR(totalPayableWithFee)}
                    </span>
                  </div>
                </div>

                {/* Terms & Notes */}
                {(invoice.terms || invoice.notes) && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-[11px] text-slate-500 space-y-1">
                    {invoice.terms && <div><strong>Terms:</strong> {invoice.terms}</div>}
                    {invoice.notes && <div><strong>Notes:</strong> {invoice.notes}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Customer Payment Station (HIDDEN IN PRINT) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 print:hidden">

            {/* If Payment is Successful / Invoice Paid */}
            {paymentSuccess ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-emerald-200 dark:border-emerald-900/40 shadow-xl space-y-4 sm:space-y-5 text-center animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% PAID &amp; RECORDED
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Payment Completed!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Thank you! Your payment for Tax Invoice #{invoice.invoiceNumber} has been received and settled.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatINR(totalPayableWithFee)}
                    </span>
                  </div>
                  {lastReceiptNo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receipt ID:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lastReceiptNo}</span>
                    </div>
                  )}
                  {txnRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Ref / UTR:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{txnRef}</span>
                    </div>
                  )}
                  {lastGatewayTxnId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lastGatewayTxnId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beneficiary:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{payeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settlement Status:</span>
                    <span className="font-bold text-emerald-600">SETTLED IN LEDGER</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* Download Official Paid Tax Invoice PDF */}
                  <button
                    type="button"
                    onClick={handleDownloadPaidInvoicePdf}
                    disabled={isDownloadingPdf}
                    className="w-full py-3.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Paid Tax Invoice (PDF)'}</span>
                  </button>

                  {/* Download Payment Receipt PNG */}
                  {(lastReceiptImgUrl || invoice.receiptUrl) && (
                    <button
                      type="button"
                      onClick={handleDownloadReceiptImage}
                      className="w-full py-3 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Settled Payment Receipt (PNG)</span>
                    </button>
                  )}

                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Invoice</span>
                  </button>

                  {/* 10-Second Auto-Redirect Countdown & Link Destruction */}
                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-left space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        <span>Redirecting to Homepage</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-xs">
                        {redirectCountdown !== null ? redirectCountdown : 10}s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      This payment link is permanently settled and destroyed. It cannot be used again.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.location.href = '/';
                      }}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20 transition-all active:scale-98"
                    >
                      <span>Return to Homepage Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* If Payment is Pending / Unpaid: Online Payment Gateway Station */
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 sm:space-y-6">

                {/* Amount Due Banner */}
                <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/50 text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Amount Due
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {formatINR(totalPayableWithFee)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pay securely to <strong>{payeeName}</strong>
                    {gatewayFeeAmount > 0 && (
                      <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                        (Includes 2% gateway fee: +{formatINR(gatewayFeeAmount)})
                      </span>
                    )}
                  </p>
                </div>

                {/* Sleek, Compact & Stylish Payment Gateway & Channels Strip */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      activeGateway === 'cashfree'
                        ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400'
                        : activeGateway === 'razorpay'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {activeGateway === 'cashfree' ? (
                        <CreditCard className="w-3.5 h-3.5" />
                      ) : activeGateway === 'razorpay' ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                        <span>
                          {activeGateway === 'cashfree'
                            ? 'Cashfree PG'
                            : activeGateway === 'razorpay'
                            ? 'Razorpay PG'
                            : 'UPI Gateway'}
                        </span>
                        {gatewayFeePercent > 0 && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-200/80 dark:border-purple-800/50">
                            +2% Fee
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="hidden sm:inline font-medium text-slate-400">UPI &bull; Cards &bull; NetBanking</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                      <ShieldCheck className="w-3 h-3" /> 100% Secure
                    </span>
                  </div>
                </div>

                {/* Gateway Error Alert with WhatsApp Support */}
                {cfApiError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-2.5 animate-in fade-in">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-rose-900 dark:text-rose-200">Payment Gateway Notice</div>
                        <div className="text-[11px] font-mono leading-relaxed">{cfApiError}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConnectAdminWhatsApp(cfApiError)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Connect to Admin on WhatsApp (Send Error Details)</span>
                    </button>
                  </div>
                )}

                {/* Active Gateway Execution Buttons */}
                {activeGateway === 'cashfree' && (
                  <button
                    type="button"
                    onClick={handleOpenCashfreeCheckout}
                    disabled={isCfLoading}
                    className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    {isCfLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Cashfree PG Checkout...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay {formatINR(totalPayableWithFee)} via Cashfree PG</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {activeGateway === 'razorpay' && (
                  <button
                    type="button"
                    onClick={handlePayWithRazorpay}
                    disabled={isRazorpayLoading}
                    className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    {isRazorpayLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Pay {formatINR(totalPayableWithFee)} via Razorpay PG</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {activeGateway === 'upi_gateway' && (
                  <button
                    type="button"
                    onClick={handleOpenCashfreeCheckout}
                    disabled={isCfLoading}
                    className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay {formatINR(totalPayableWithFee)} via UPI Gateway</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>256-Bit SSL Encrypted &bull; PCI-DSS Level 1 Certified Checkout</span>
                </div>

                {/* Always-Accessible WhatsApp Support Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      handleConnectAdminWhatsApp(
                        cfApiError ||
                          `Payment Inquiry for Invoice #${invoice.invoiceNumber}`
                      )
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                    <span>Facing Payment Issue? Connect to Admin on WhatsApp</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default function CustomerPayInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-4">
          <div className="text-center text-xs text-slate-400 font-mono animate-pulse">
            INITIALIZING SECURE SESSION...
          </div>
        </div>
      }
    >
      <CustomerPayInvoiceContent />
    </Suspense>
  );
}
