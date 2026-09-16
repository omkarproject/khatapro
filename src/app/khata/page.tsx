'use client';

import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl, openWhatsApp } from '@/lib/utils';
import { Customer, Transaction, TransactionType } from '@/types';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Search,
  Share2,
  Phone,
  MapPin,
  MessageSquare,
  Trash2,
  Camera,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  FileText,
  Calendar,
  Mic,
  Plus,
  ArrowDown,
  ArrowUp,
  Delete,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  QrCode,
  User,
  X,
  Upload,
  Download,
  Image as ImageIcon,
  ExternalLink,
  Star,
  Printer,
  Mail,
  Copy,
  Smartphone
} from 'lucide-react';

function getCustomerRatingColor(rating: number = 5): string {
  if (rating <= 2) return 'text-rose-600 dark:text-rose-400';
  if (rating <= 3) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function getCustomerRatingBorder(rating: number = 5): string {
  if (rating <= 2) return 'ring-[2.5px] ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-2 border-rose-500/20';
  if (rating <= 3) return 'ring-[2.5px] ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-2 border-amber-400/20';
  return 'ring-[2.5px] ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-2 border-emerald-500/20';
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function KhataPageInner() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('id');

  const {
    customers,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateTransactionAttachments,
    saveCustomer,
    deleteCustomer,
    openCollectModal,
    settings,
    profile,
    addToast,
  } = useApp();

  const [isStatementBillModalOpen, setIsStatementBillModalOpen] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isUniversalSharing, setIsUniversalSharing] = useState(false);
  const [isUniversalShareModalOpen, setIsUniversalShareModalOpen] = useState(false);

  // Active customer selection - default to Datta More if available or first customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (customerIdParam) return customerIdParam;
    const datta = customers.find(c => c.name.includes('Datta More'));
    return datta ? datta.id : (customers[0]?.id || '');
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  // Screen View Mode: 'chat' (Screen 2), 'entry' (Screen 3), 'profile' (Screen 1)
  const [screenView, setScreenView] = useState<'chat' | 'entry' | 'profile'>('chat');
  const [mobileActivePanel, setMobileActivePanel] = useState<'directory' | 'ledger'>(() => {
    return customerIdParam ? 'ledger' : 'directory';
  });
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

interface AttachedBill {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'pdf';
  size?: string;
}

  // Entry screen state (Screen 3)
  const [entryType, setEntryType] = useState<'received' | 'given'>('received'); // received = You Got (Debit/Green), given = You Gave (Credit/Red)
  const [entryAmountStr, setEntryAmountStr] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryAttachments, setEntryAttachments] = useState<AttachedBill[]>([]);
  // Preview Gallery State (Holds list of items, current active index, navigation, and linked transactionId)
  const [previewGallery, setPreviewGallery] = useState<{
    items: AttachedBill[];
    currentIndex: number;
    transactionId?: string;
  } | null>(null);
  const billFileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit modal / sub-edit states (Screen 1)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Add Customer modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustBusiness, setNewCustBusiness] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Active Customer Object
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Sync profile edit temp fields when customer changes
  useEffect(() => {
    if (activeCustomer) {
      setTempName(activeCustomer.name);
      setTempPhone(activeCustomer.phone);
      setTempAddress(activeCustomer.address || '');
      setProfileAvatar(activeCustomer.avatar || null);
    }
  }, [activeCustomer]);

  // Sync searchParam customer if provided
  useEffect(() => {
    if (customerIdParam) {
      const found = customers.find(c => c.id === customerIdParam);
      if (found) {
        setSelectedCustomerId(found.id);
        setScreenView('chat');
        setMobileActivePanel('ledger');
      }
    }
  }, [customerIdParam, customers]);

  // Customer transactions history (Sorted chronologically so newest appears at the bottom / last in chat)
  const customerTransactions = useMemo(() => {
    if (!activeCustomer) return [];
    return transactions
      .filter(t => t.customerId === activeCustomer.id)
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) return timeA - timeB;
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdA - createdB;
      });
  }, [transactions, activeCustomer]);

  // Compute running balance for each transaction chronologically
  const enrichedTransactions = useMemo(() => {
    let running = 0;
    return customerTransactions.map((t) => {
      if (t.type === 'credit') {
        running += t.amount;
      } else if (t.type === 'debit' || t.type === 'collection') {
        running -= t.amount;
      }
      const balanceLabel =
        running > 0
          ? `₹${Math.abs(running).toLocaleString('en-IN')} Due`
          : running < 0
          ? `₹${Math.abs(running).toLocaleString('en-IN')} Advance`
          : '₹0 Due';

      return {
        ...t,
        runningBalance: running,
        balanceLabel,
      };
    });
  }, [customerTransactions]);

  // Filter by chat search query if user opened chat search
  const visibleTransactions = useMemo(() => {
    if (!chatSearchQuery.trim()) return enrichedTransactions;
    const q = chatSearchQuery.toLowerCase();
    return enrichedTransactions.filter(t =>
      t.note?.toLowerCase().includes(q) ||
      t.amount.toString().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [enrichedTransactions, chatSearchQuery]);

  // Auto-scroll chat to bottom ("last me") whenever entering chat or transactions change
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (screenView === 'chat') {
      const timer = setTimeout(() => scrollToBottom('smooth'), 120);
      return () => clearTimeout(timer);
    }
  }, [screenView, customerTransactions.length, selectedCustomerId]);

  // Group transactions by date for the chat stream (Screen 2)
  const groupedTransactions = useMemo(() => {
    const groups: { [dateKey: string]: typeof enrichedTransactions } = {};
    visibleTransactions.forEach((t) => {
      const d = new Date(t.date);
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      const dateLabel = isToday
        ? 'Today'
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(t);
    });
    return groups;
  }, [visibleTransactions]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.businessName && c.businessName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterType === 'credit') return matchSearch && c.outstandingBalance > 0;
      if (filterType === 'debit') return matchSearch && c.outstandingBalance < 0;
      return matchSearch;
    });
  }, [customers, searchTerm, filterType]);

  // Keypad click handlers (Screen 3)
  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setEntryAmountStr(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setEntryAmountStr('');
    } else if (val === '.') {
      if (!entryAmountStr.includes('.')) {
        setEntryAmountStr(prev => (prev ? prev + '.' : '0.'));
      }
    } else {
      // Numbers
      setEntryAmountStr(prev => {
        if (prev === '0') return val;
        if (prev.length >= 8) return prev; // max length
        return prev + val;
      });
    }
  };

  // Physical keyboard listener on entry screen
  useEffect(() => {
    if (screenView !== 'entry') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadPress('backspace');
      } else if (e.key === '.' && !entryAmountStr.includes('.')) {
        handleKeypadPress('.');
      } else if (e.key === 'Enter') {
        handleConfirmEntry();
      } else if (e.key === 'Escape') {
        setScreenView('chat');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenView, entryAmountStr]);

  // Gallery Navigation Handlers (Left/Right)
  const handlePrevPreview = () => {
    if (!previewGallery) return;
    setPreviewGallery(prev => {
      if (!prev) return null;
      const newIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.items.length - 1;
      return { ...prev, currentIndex: newIdx };
    });
  };

  const handleNextPreview = () => {
    if (!previewGallery) return;
    setPreviewGallery(prev => {
      if (!prev) return null;
      const newIdx = prev.currentIndex < prev.items.length - 1 ? prev.currentIndex + 1 : 0;
      return { ...prev, currentIndex: newIdx };
    });
  };

  // Keyboard navigation for Full-Screen Preview Lightbox
  useEffect(() => {
    if (!previewGallery) return;
    const handleGalleryKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevPreview();
      if (e.key === 'ArrowRight') handleNextPreview();
      if (e.key === 'Escape') setPreviewGallery(null);
    };
    window.addEventListener('keydown', handleGalleryKey);
    return () => window.removeEventListener('keydown', handleGalleryKey);
  }, [previewGallery]);

  // Remove an attachment item from preview gallery and persist deletion
  const handleRemovePreviewItem = (indexToRemove: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!previewGallery) return;

    const itemToRemove = previewGallery.items[indexToRemove];
    const updatedItems = previewGallery.items.filter((_, idx) => idx !== indexToRemove);

    // If all items removed, close lightbox
    if (updatedItems.length === 0) {
      setPreviewGallery(null);
    } else {
      let nextIndex = previewGallery.currentIndex;
      if (indexToRemove === previewGallery.currentIndex) {
        nextIndex = Math.min(indexToRemove, updatedItems.length - 1);
      } else if (indexToRemove < previewGallery.currentIndex) {
        nextIndex = previewGallery.currentIndex - 1;
      }
      setPreviewGallery({
        ...previewGallery,
        items: updatedItems,
        currentIndex: nextIndex,
      });
    }

    // Persist removal to transaction if attached to an existing ledger record
    if (previewGallery.transactionId) {
      const serialized = updatedItems.map(b => JSON.stringify(b));
      updateTransactionAttachments(previewGallery.transactionId, serialized);
    } else if (itemToRemove) {
      // If from new entry form
      setEntryAttachments(prev => prev.filter(att => att.id !== itemToRemove.id && att.url !== itemToRemove.url));
    }
  };

  // Open existing transaction for modification in Screen 3 (Keypad & Entry)
  const handleOpenEditTransaction = (txn: Transaction) => {
    setEditingTxnId(txn.id);
    const isReceivedType = txn.type === 'debit' || txn.type === 'collection';
    setEntryType(isReceivedType ? 'received' : 'given');
    setEntryAmountStr(txn.amount.toString());
    setEntryNotes(txn.note || '');
    setEntryDate(txn.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0]);

    // Parse attachments
    const parsedAttachments: AttachedBill[] = (txn.attachments || []).map((att, idx) => {
      try {
        const obj = JSON.parse(att);
        if (obj.url) return obj;
      } catch {}
      const isPdf = att.toLowerCase().includes('.pdf') || att.startsWith('data:application/pdf');
      return {
        id: `att_${idx}`,
        url: att,
        name: isPdf ? `Invoice_Bill_${idx + 1}.pdf` : `Bill_Photo_${idx + 1}.jpg`,
        type: isPdf ? 'pdf' : 'image',
        size: isPdf ? 'PDF Document' : 'Photo',
      };
    });
    setEntryAttachments(parsedAttachments);
    setScreenView('entry');
  };

  // Delete transaction currently being edited
  const handleDeleteEditingTransaction = () => {
    if (!editingTxnId) return;
    deleteTransaction(editingTxnId);
    setEditingTxnId(null);
    setEntryAmountStr('');
    setEntryNotes('');
    setEntryAttachments([]);
    setScreenView('chat');
  };

  // Handle Confirm / Save Entry (Screen 3 -> Screen 2)
  const handleConfirmEntry = () => {
    const num = parseFloat(entryAmountStr);
    if (!num || num <= 0) {
      addToast('Amount Required', 'Please enter a valid amount using the keypad.', 'warning');
      return;
    }
    if (!activeCustomer) return;

    const isGot = entryType === 'received';

    // Serialize attached bills to transaction attachments
    const serializedAttachments = entryAttachments.map(b => JSON.stringify(b));

    if (editingTxnId) {
      // Modifying existing transaction
      const originalTxn = transactions.find(t => t.id === editingTxnId);
      const originalDateOnly = originalTxn?.date ? originalTxn.date.split('T')[0] : '';
      const updatedDate = entryDate === originalDateOnly
        ? (originalTxn?.date || new Date().toISOString())
        : new Date(entryDate).toISOString();

      const updatedTxn: Transaction = {
        ...originalTxn,
        id: editingTxnId,
        type: isGot ? 'debit' : 'credit',
        amount: num,
        date: updatedDate,
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        category: isGot ? 'Payment Received' : 'Credit Given',
        paymentMode: originalTxn?.paymentMode || (isGot ? 'upi' : 'cash'),
        note: entryNotes || (isGot ? 'Payment received' : 'Goods on credit'),
        attachments: serializedAttachments,
        status: 'completed',
        createdBy: originalTxn?.createdBy || settings.businessName,
        createdAt: originalTxn?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updateTransaction(updatedTxn);
      addToast(
        'Transaction Updated',
        `₹${num.toLocaleString('en-IN')} updated in ${activeCustomer.name}'s Khata.`,
        'success'
      );
    } else {
      // New Transaction: Ensure timestamp is current so it appends at the bottom of today ("last me")
      const todayStr = new Date().toISOString().split('T')[0];
      const txnDateIso = entryDate === todayStr ? new Date().toISOString() : new Date(entryDate).toISOString();

      const newTxn: Transaction = {
        id: `txn_${Date.now()}`,
        type: isGot ? 'debit' : 'credit',
        amount: num,
        date: txnDateIso,
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        category: isGot ? 'Payment Received' : 'Credit Given',
        paymentMode: isGot ? 'upi' : 'cash',
        note: entryNotes || (isGot ? 'Payment received' : 'Goods on credit'),
        attachments: serializedAttachments,
        status: 'completed',
        createdBy: settings.businessName,
        createdAt: new Date().toISOString(),
      };

      addTransaction(newTxn);
      addToast(
        isGot ? 'Payment Received' : 'Credit Given',
        `₹${num.toLocaleString('en-IN')} added to ${activeCustomer.name}'s Khata.`,
        'success'
      );
    }

    // Reset and return to chat view
    setEditingTxnId(null);
    setEntryAmountStr('');
    setEntryNotes('');
    setEntryAttachments([]);
    setScreenView('chat');
  };

  // Convert number to Indian currency words
  const amountToWords = (amount: number): string => {
    if (!amount || amount === 0) return 'Zero Rupees Only';
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n] + ' ';
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + numToWords(n % 100000);
      return numToWords(Math.floor(n / 10000000)) + 'Crore ' + numToWords(n % 10000000);
    };

    const intPart = Math.floor(amount);
    const words = numToWords(intPart).trim();
    return (words ? words : 'Zero') + ' Rupees Only';
  };

  // Generate & Print Single Transaction PDF Bill
  const printSingleTxnBill = (txn: Transaction) => {
    if (!activeCustomer) return;
    const isGot = txn.type === 'debit' || txn.type === 'collection';
    const billTitle = isGot ? 'OFFICIAL PAYMENT RECEIPT' : 'CREDIT SALES INVOICE & BILL';
    const billDocNo = isGot
      ? `REC-${txn.id.slice(-6).toUpperCase()}`
      : `INV-${txn.id.slice(-6).toUpperCase()}`;
    const amountStr = txn.amount.toLocaleString('en-IN');
    const wordsStr = amountToWords(txn.amount);
    const dateFormatted = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = new Date(txn.date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const upiPayUri = !isGot
      ? buildUpiUri(
          settings.paymentSettings.upiId,
          settings.paymentSettings.payeeName,
          txn.amount,
          `Payment for Bill ${billDocNo}`
        )
      : '';
    const qrUrl = !isGot
      ? settings.paymentSettings.customQrUrl || getQrCodeUrl(upiPayUri, 150)
      : '';

    // Remove existing print frame
    const existingFrame = document.getElementById('smartkhata-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'smartkhata-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${billDocNo}_${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
    }
    .bill-card {
      max-width: 750px;
      margin: 0 auto;
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      padding: 24px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
    }
    .biz-name {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${isGot ? '#ecfdf5' : '#eef2ff'};
      color: ${isGot ? '#047857' : '#4338ca'};
      border: 1px solid ${isGot ? '#a7f3d0' : '#c7d2fe'};
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .party-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .party-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .items-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .items-table td {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .total-banner {
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${isGot ? '#ecfdf5' : '#fff1f2'};
      border: 1.5px solid ${isGot ? '#a7f3d0' : '#fecdd3'};
    }
    .qr-section {
      margin-top: 18px;
      padding: 12px 16px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .footer-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="bill-card">
    <!-- Header -->
    <div class="header-row">
      <div>
        <div class="biz-name">${settings.businessName || profile.businessName || 'SmartKhata Store'}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${profile.businessAddress || 'Official Merchant Store'}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Phone: <strong>${profile.phone || '+91 98000 00000'}</strong>
          ${profile.businessGst ? ` • GSTIN: <span style="font-family: monospace; font-weight: bold; color: #4338ca;">${profile.businessGst}</span>` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${billTitle}</span>
        <div style="font-family: monospace; font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 6px;">
          ${billDocNo}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Date: <strong style="color: #334155;">${dateFormatted}</strong>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">
          Time: ${timeFormatted}
        </div>
      </div>
    </div>

    <!-- Parties Info -->
    <div class="parties-grid">
      <div class="party-box">
        <div class="party-label">Billed By (Merchant)</div>
        <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${settings.businessName || profile.businessName}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Phone: ${profile.phone || 'N/A'}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 1px;">SmartKhata Verified Store</div>
      </div>
      <div class="party-box">
        <div class="party-label">Billed To (Customer)</div>
        <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${activeCustomer.name}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Phone: <strong>${activeCustomer.phone}</strong></div>
        ${activeCustomer.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">Address: ${activeCustomer.address}</div>` : ''}
        ${activeCustomer.businessName ? `<div style="font-size: 11px; color: #4338ca; font-weight: 600; margin-top: 1px;">Business: ${activeCustomer.businessName}</div>` : ''}
      </div>
    </div>

    <!-- Particulars Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 8%; text-align: center;">S.No.</th>
          <th style="width: 52%;">Particulars / Item Description</th>
          <th style="width: 20%; text-align: center;">Transaction Type</th>
          <th style="width: 20%; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: bold;">1</td>
          <td>
            <strong style="color: #0f172a; font-size: 13px;">${txn.note || (isGot ? 'Payment Received' : 'Goods / Service on Credit')}</strong>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
              Date: ${dateFormatted} • Status: ${txn.status || 'Completed'}
            </div>
          </td>
          <td style="text-align: center; font-weight: bold; color: ${isGot ? '#047857' : '#be123c'};">
            ${isGot ? '↓ You Got (Debit)' : '↑ You Gave (Credit)'}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 14px; font-weight: 900; color: ${isGot ? '#047857' : '#be123c'};">
            ₹${amountStr}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Total Banner -->
    <div class="total-banner">
      <div>
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isGot ? '#065f46' : '#9f1239'};">
          ${isGot ? 'Total Amount Received' : 'Total Bill Amount (Credit Given)'}
        </div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px; font-style: italic;">
          (${wordsStr})
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 22px; font-weight: 900; font-family: monospace; color: ${isGot ? '#047857' : '#be123c'};">
          ₹${amountStr}
        </span>
        <div style="font-size: 10px; font-weight: 800; color: ${isGot ? '#059669' : '#e11d48'};">
          ${isGot ? '✓ PAYMENT COMPLETED' : '⚠️ OUTSTANDING CREDIT'}
        </div>
      </div>
    </div>

    <!-- QR Code if Given (Credit) and UPI configured -->
    ${!isGot && settings.paymentSettings?.upiId ? `
      <div class="qr-section">
        <div>
          <div style="font-size: 12px; font-weight: 800; color: #312e81; text-transform: uppercase;">
            ⚡ Pay Bill Instantly via UPI
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Pay To: <strong>${settings.paymentSettings.payeeName}</strong>
          </div>
          <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #4338ca; margin-top: 2px;">
            UPI ID: ${settings.paymentSettings.upiId}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
            Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI app.
          </div>
        </div>
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center;">
          <img src="${qrUrl}" alt="UPI QR" style="width: 76px; height: 76px; object-fit: contain; display: block;" />
          <span style="font-size: 8.5px; font-weight: bold; color: #64748b; margin-top: 2px; display: block;">Scan to Pay</span>
        </div>
      </div>
    ` : ''}

    <!-- Footer Notice & Sign -->
    <div class="footer-section">
      <div>
        <strong style="color: #334155;">Terms & Conditions:</strong>
        <div>1. This is a computer-generated digital bill from SmartKhata Pro.</div>
        <div>2. Certified record of account transaction for ${activeCustomer.name}.</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; color: #0f172a; text-transform: uppercase;">${settings.businessName || profile.businessName}</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error, fallback to window.print', e);
        window.print();
      }
    }, 450);
  };

  // Handle "Create Bill": Save transaction to Khata AND generate single-transaction PDF Bill
  const handleCreateBillAndSave = (isEditing: boolean) => {
    const num = parseFloat(entryAmountStr);
    if (!num || num <= 0) {
      addToast('Amount Required', 'Please enter a valid amount using the keypad.', 'warning');
      return;
    }
    if (!activeCustomer) return;

    const isGot = entryType === 'received';
    const serializedAttachments = entryAttachments.map(b => JSON.stringify(b));

    let createdOrUpdatedTxn: Transaction;

    if (isEditing && editingTxnId) {
      const originalTxn = transactions.find(t => t.id === editingTxnId);
      const originalDateOnly = originalTxn?.date ? originalTxn.date.split('T')[0] : '';
      const updatedDate = entryDate === originalDateOnly
        ? (originalTxn?.date || new Date().toISOString())
        : new Date(entryDate).toISOString();

      createdOrUpdatedTxn = {
        ...originalTxn,
        id: editingTxnId,
        type: isGot ? 'debit' : 'credit',
        amount: num,
        date: updatedDate,
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        category: isGot ? 'Payment Received' : 'Credit Given',
        paymentMode: originalTxn?.paymentMode || (isGot ? 'upi' : 'cash'),
        note: entryNotes || (isGot ? 'Payment received' : 'Goods on credit'),
        attachments: serializedAttachments,
        status: 'completed',
        createdBy: originalTxn?.createdBy || settings.businessName,
        createdAt: originalTxn?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateTransaction(createdOrUpdatedTxn);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const txnDateIso = entryDate === todayStr ? new Date().toISOString() : new Date(entryDate).toISOString();

      createdOrUpdatedTxn = {
        id: `txn_${Date.now()}`,
        type: isGot ? 'debit' : 'credit',
        amount: num,
        date: txnDateIso,
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        category: isGot ? 'Payment Received' : 'Credit Given',
        paymentMode: isGot ? 'upi' : 'cash',
        note: entryNotes || (isGot ? 'Payment received' : 'Goods on credit'),
        attachments: serializedAttachments,
        status: 'completed',
        createdBy: settings.businessName,
        createdAt: new Date().toISOString(),
      };
      addTransaction(createdOrUpdatedTxn);
    }

    addToast(
      'Bill Generated',
      `₹${num.toLocaleString('en-IN')} added to Khata and PDF Bill generated!`,
      'success'
    );

    // Reset input fields and go back to chat ledger
    setEditingTxnId(null);
    setEntryAmountStr('');
    setEntryNotes('');
    setEntryAttachments([]);
    setScreenView('chat');

    // Generate & Print Single Transaction PDF Bill
    printSingleTxnBill(createdOrUpdatedTxn);
  };

  // Handle Multi-file & PDF Upload (Screen 3)
  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      let loadedCount = 0;
      const newItems: AttachedBill[] = [];

      fileList.forEach(file => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeFormatted = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        const reader = new FileReader();
        reader.onload = (evt) => {
          newItems.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            url: evt.target?.result as string,
            name: file.name,
            type: isPdf ? 'pdf' : 'image',
            size: sizeFormatted,
          });
          loadedCount++;
          if (loadedCount === fileList.length) {
            setEntryAttachments(prev => [...prev, ...newItems]);
            addToast('Bills Added', `${fileList.length} file(s) attached (Images & PDFs supported).`, 'success');
          }
        };
        reader.readAsDataURL(file);
      });
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setEntryAttachments(prev => prev.filter(item => item.id !== id));
  };

  // Handle Avatar Upload (Screen 1)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCustomer) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setProfileAvatar(base64);
        const updated = { ...activeCustomer, avatar: base64 };
        saveCustomer(updated);
        addToast('Photo Updated', 'Customer profile photo saved.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile edit fields (Screen 1)
  const handleSaveProfileField = (field: 'name' | 'phone' | 'address') => {
    if (!activeCustomer) return;
    let updated = { ...activeCustomer };
    if (field === 'name') {
      if (!tempName.trim()) return;
      updated.name = tempName.trim();
      setIsEditingName(false);
    } else if (field === 'phone') {
      if (!tempPhone.trim()) return;
      updated.phone = tempPhone.trim();
      setIsEditingPhone(false);
    } else if (field === 'address') {
      updated.address = tempAddress.trim();
      setIsEditingAddress(false);
    }
    saveCustomer(updated);
  };

  // Update Customer CRM Rating
  const handleUpdateCustomerRating = (rating: number) => {
    if (!activeCustomer) return;
    const updated = { ...activeCustomer, rating };
    saveCustomer(updated);
    addToast('Rating Updated', `${activeCustomer.name}'s rating set to ${rating} Star(s).`, 'success');
  };

  // Handle Delete Customer (Screen 1)
  const handleDeleteCurrentCustomer = () => {
    if (!activeCustomer) return;
    if (confirm(`Are you sure you want to delete ${activeCustomer.name}? All ledger records will be removed.`)) {
      deleteCustomer(activeCustomer.id);
      setScreenView('chat');
      setMobileActivePanel('directory');
      if (customers.length > 1) {
        const next = customers.find(c => c.id !== activeCustomer.id);
        if (next) setSelectedCustomerId(next.id);
      }
    }
  };

  // Handle Add Customer Modal Submit
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const created: Customer = {
      id: `cust_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '+91 98000 00000',
      email: '',
      businessName: newCustBusiness.trim(),
      address: newCustAddress.trim(),
      creditLimit: 100000,
      outstandingBalance: 0,
      category: 'Regular',
      status: 'active',
      rating: 5,
      createdAt: new Date().toISOString(),
    };

    saveCustomer(created);
    setSelectedCustomerId(created.id);
    setIsAddCustomerOpen(false);
    setScreenView('chat');
    setMobileActivePanel('ledger');
    setNewCustName('');
    setNewCustPhone('');
    setNewCustBusiness('');
    setNewCustAddress('');
  };

  // Customer specific ledger entries and calculations for Due Bill & Statement
  // Sorted chronologically (oldest at the top -> newest at the bottom, so ledger flows top-to-bottom)
  const activeCustomerTransactions = useMemo(() => {
    if (!activeCustomer) return [];
    return transactions
      .filter(t => t.customerId === activeCustomer.id)
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) return timeA - timeB;
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdA - createdB;
      });
  }, [transactions, activeCustomer]);

  const customerTotalGiven = useMemo(() => {
    return activeCustomerTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activeCustomerTransactions]);

  const customerTotalReceived = useMemo(() => {
    return activeCustomerTransactions
      .filter(t => t.type === 'debit' || t.type === 'collection')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activeCustomerTransactions]);

  // Paginate statement into exactly 25 transactions per PDF page
  const STATEMENT_PAGE_SIZE = 25;
  const statementPages = useMemo(() => {
    if (activeCustomerTransactions.length === 0) {
      return [[] as Transaction[]];
    }
    const pages: Transaction[][] = [];
    for (let i = 0; i < activeCustomerTransactions.length; i += STATEMENT_PAGE_SIZE) {
      pages.push(activeCustomerTransactions.slice(i, i + STATEMENT_PAGE_SIZE));
    }
    return pages;
  }, [activeCustomerTransactions]);

  const getPageSummary = (pageTxns: Transaction[]) => {
    const received = pageTxns
      .filter(t => t.type === 'debit' || t.type === 'collection')
      .reduce((sum, t) => sum + t.amount, 0);
    const given = pageTxns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const net = given - received; // > 0 = Due to Pay, < 0 = Advance, === 0 = Settled
    return { received, given, net };
  };

  // Export Customer Statement to Native Excel (.xlsx) with full formatting, colors, column widths, and bold centered headings
  const handleExportExcel = async () => {
    if (!activeCustomer) return;

    try {
      addToast('Preparing Excel', 'Generating styled Excel (.xlsx) sheet...', 'info');
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartKhata Pro';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Khata Statement', {
        views: [{ showGridLines: true }],
      });

      // 1. Column Definitions with Generous Widths (Eliminating "########" forever)
      worksheet.columns = [
        { key: 'date', width: 16 },       // Date: 16 chars wide
        { key: 'type', width: 22 },       // Transaction Type: 22 chars wide
        { key: 'note', width: 38 },       // Particulars: 38 chars wide
        { key: 'debit', width: 22 },      // Debit / Received: 22 chars wide
        { key: 'credit', width: 22 },     // Credit / Given: 22 chars wide
        { key: 'mode', width: 16 },       // Payment Mode: 16 chars wide
        { key: 'status', width: 16 },     // Status: 16 chars wide
      ];

      // Styling Palette
      const NAVY_BANNER = '1E3A8A';
      const SUB_BLUE = '2563EB';
      const WHITE = 'FFFFFF';
      const DARK_TEXT = '0F172A';
      const MUTED_LABEL = '475569';
      const BORDER_COLOR = 'CBD5E1';
      const TH_SLATE = '1E293B';
      const GREEN_TEXT = '15803D';
      const GREEN_BG = 'DCFCE7';
      const RED_TEXT = 'B91C1C';
      const RED_BG = 'FEE2E2';

      // 2. Main Title Banner (Row 1-2 merged A1:G2)
      worksheet.mergeCells('A1:G2');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'SMARTKHATA PRO — CUSTOMER ACCOUNT STATEMENT & DUE BILL';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BANNER } };

      // Subtitle (Row 3 merged A3:G3)
      worksheet.mergeCells('A3:G3');
      const subCell = worksheet.getCell('A3');
      subCell.value = `OFFICIAL DIGITAL LEDGER • GENERATED ON ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
      subCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB_BLUE } };

      // 3. Customer & Store Information Section (Rows 5 to 8)
      const infoRows = [
        ['Customer Name:', activeCustomer.name, 'Business / Store:', settings.businessName || profile.businessName],
        ['Phone:', activeCustomer.phone, 'Address / City:', profile.businessAddress || 'Official Store Address'],
        ['Address:', activeCustomer.address || 'Local Customer', 'Store UPI ID:', settings.paymentSettings.upiId],
        ['Statement Date:', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 'GSTIN:', profile.businessGst || 'N/A'],
      ];

      infoRows.forEach((r, idx) => {
        const rowIdx = 5 + idx;
        const row = worksheet.getRow(rowIdx);
        row.height = 20;

        // Label 1
        const c1 = row.getCell(1);
        c1.value = r[0];
        c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: MUTED_LABEL } };
        c1.alignment = { horizontal: 'left', vertical: 'middle' };

        // Value 1 (merged cols 2 & 3)
        worksheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
        const c2 = row.getCell(2);
        c2.value = r[1];
        c2.font = { name: 'Calibri', size: 10, bold: idx === 0, color: { argb: DARK_TEXT } };
        c2.alignment = { horizontal: 'left', vertical: 'middle' };

        // Label 2
        const c4 = row.getCell(4);
        c4.value = r[2];
        c4.font = { name: 'Calibri', size: 10, bold: true, color: { argb: MUTED_LABEL } };
        c4.alignment = { horizontal: 'left', vertical: 'middle' };

        // Value 2 (merged cols 5 to 7)
        worksheet.mergeCells(`E${rowIdx}:G${rowIdx}`);
        const c5 = row.getCell(5);
        c5.value = r[3];
        c5.font = { name: 'Calibri', size: 10, bold: idx === 0 || idx === 2, color: { argb: idx === 2 ? SUB_BLUE : DARK_TEXT } };
        c5.alignment = { horizontal: 'left', vertical: 'middle' };
      });

      // 4. Prominent Net Due Banner (Row 10 merged A10:G10)
      const isDue = activeCustomer.outstandingBalance > 0;
      const isAdvance = activeCustomer.outstandingBalance < 0;
      const dueStatusText = isDue
        ? `⚠️ TOTAL DUE AMOUNT PAYABLE: ₹ ${activeCustomer.outstandingBalance.toLocaleString('en-IN')} (PAYMENT PENDING)`
        : isAdvance
        ? `✓ ADVANCE CREDIT BALANCE: ₹ ${Math.abs(activeCustomer.outstandingBalance).toLocaleString('en-IN')}`
        : '✓ ALL DUES SETTLED: ₹ 0';

      worksheet.mergeCells('A10:G10');
      const dueCell = worksheet.getCell('A10');
      dueCell.value = dueStatusText;
      dueCell.font = {
        name: 'Calibri',
        size: 12,
        bold: true,
        color: { argb: isDue ? RED_TEXT : isAdvance ? GREEN_TEXT : DARK_TEXT },
      };
      dueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      dueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isDue ? RED_BG : isAdvance ? GREEN_BG : 'F1F5F9' },
      };
      worksheet.getRow(10).height = 28;

      // 5. Embedded UPI Payment Card & QR Code Section (Rows 12 to 19)
      const upiAmount = Math.max(0, activeCustomer.outstandingBalance);
      const upiUri = buildUpiUri(
        settings.paymentSettings.upiId,
        settings.paymentSettings.payeeName,
        upiAmount,
        `Due settlement for ${activeCustomer.name}`
      );

      // Top Header for UPI Box
      worksheet.mergeCells('A12:D12');
      const upiHeaderLeft = worksheet.getCell('A12');
      upiHeaderLeft.value = '⚡ INSTANT UPI PAYMENT & SETTLEMENT';
      upiHeaderLeft.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: WHITE } };
      upiHeaderLeft.alignment = { horizontal: 'center', vertical: 'middle' };
      upiHeaderLeft.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } };

      worksheet.mergeCells('E12:G12');
      const upiHeaderRight = worksheet.getCell('E12');
      upiHeaderRight.value = 'SCAN TO PAY (UPI QR CODE)';
      upiHeaderRight.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: WHITE } };
      upiHeaderRight.alignment = { horizontal: 'center', vertical: 'middle' };
      upiHeaderRight.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } };
      worksheet.getRow(12).height = 24;

      // Set Heights for UPI Info & QR Area
      for (let r = 13; r <= 18; r++) {
        worksheet.getRow(r).height = 23;
      }

      // Left Column Info Rows (Rows 13-18)
      const upiDetails = [
        ['Payee Name:', settings.paymentSettings.payeeName],
        ['Store UPI ID (VPA):', settings.paymentSettings.upiId],
        ['Payable Due Amount:', `₹ ${activeCustomer.outstandingBalance.toLocaleString('en-IN')}`],
        ['Supported Apps:', 'Google Pay • PhonePe • Paytm • BHIM • Cred • Any UPI App'],
        ['Payment Link (Tap to Pay):', '👉 Click Here to Open UPI App & Pay Directly'],
        ['Transaction Reference:', `Due bill for ${activeCustomer.name}`],
      ];

      upiDetails.forEach((item, idx) => {
        const rowNum = 13 + idx;
        const row = worksheet.getRow(rowNum);

        // Label (Col A)
        const lbl = row.getCell(1);
        lbl.value = item[0];
        lbl.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '334155' } };
        lbl.alignment = { horizontal: 'left', vertical: 'middle' };
        lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };

        // Value (Cols B-D merged)
        worksheet.mergeCells(`B${rowNum}:D${rowNum}`);
        const val = row.getCell(2);
        val.alignment = { horizontal: 'left', vertical: 'middle' };

        if (idx === 1) {
          // UPI ID (VPA)
          val.value = item[1];
          val.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1D4ED8' } };
          val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
        } else if (idx === 2) {
          // Amount
          val.value = item[1];
          val.font = { name: 'Calibri', size: 11, bold: true, color: { argb: isDue ? RED_TEXT : GREEN_TEXT } };
          val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isDue ? 'FEF2F2' : 'F0FDF4' } };
        } else if (idx === 4) {
          // Clickable UPI Link
          val.value = { text: '👉 Click Here to Open UPI App & Pay Directly', hyperlink: upiUri };
          val.font = { name: 'Calibri', size: 10, bold: true, underline: true, color: { argb: '1D4ED8' } };
          val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
        } else {
          val.value = item[1];
          val.font = { name: 'Calibri', size: 9.5, bold: idx === 0, color: { argb: DARK_TEXT } };
          val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        }
      });

      // Right Column QR Code Area (Merged E13:G18)
      worksheet.mergeCells('E13:G18');
      const qrBoxCell = worksheet.getCell('E13');
      qrBoxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
      qrBoxCell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      };

      // Generate and Embed Real QR Code Image in Excel
      try {
        const QRCodeModule = await import('qrcode');
        const QRCode = QRCodeModule.default || QRCodeModule;
        const qrDataUrl = await QRCode.toDataURL(upiUri, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        const qrBase64 = qrDataUrl.split(',')[1];
        if (qrBase64) {
          const imageId = workbook.addImage({
            base64: qrBase64,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 4.4, row: 12.25 },
            ext: { width: 135, height: 135 },
          });
        }
      } catch (err) {
        console.warn('QR Code generation error for Excel:', err);
      }

      // QR Instruction Note below QR (Row 19)
      worksheet.mergeCells('E19:G19');
      const qrNote = worksheet.getCell('E19');
      qrNote.value = 'Scan this QR code with any UPI app on phone to settle instantly';
      qrNote.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: '64748B' } };
      qrNote.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(19).height = 18;

      // 6. Table Column Headers (Row 21)
      const headerRow = worksheet.getRow(21);
      headerRow.height = 26;
      const tableHeaders = [
        'Date',
        'Transaction Type',
        'Particulars / Notes',
        'Debit / Received (₹)',
        'Credit / Given (₹)',
        'Payment Mode',
        'Status',
      ];

      tableHeaders.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TH_SLATE } };
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER_COLOR } },
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
          left: { style: 'thin', color: { argb: BORDER_COLOR } },
          right: { style: 'thin', color: { argb: BORDER_COLOR } },
        };
      });

      // 7. Data Rows (Row 22 onwards)
      let currentRow = 22;
      activeCustomerTransactions.forEach((t) => {
        const row = worksheet.getRow(currentRow);
        row.height = 22;
        const isGot = t.type === 'debit' || t.type === 'collection';
        const dateFormatted = new Date(t.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        // Date (Centered)
        const dCell = row.getCell(1);
        dCell.value = dateFormatted;
        dCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dCell.font = { name: 'Calibri', size: 10 };

        // Type (Centered, Bold color)
        const tCell = row.getCell(2);
        tCell.value = isGot ? 'Payment Received' : 'Credit Given';
        tCell.alignment = { horizontal: 'center', vertical: 'middle' };
        tCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: isGot ? GREEN_TEXT : RED_TEXT } };
        tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isGot ? 'F0FDF4' : 'FEF2F2' } };

        // Particulars / Notes (Left)
        const nCell = row.getCell(3);
        nCell.value = t.note || (isGot ? 'Payment Received' : 'Credit Given');
        nCell.alignment = { horizontal: 'left', vertical: 'middle' };
        nCell.font = { name: 'Calibri', size: 10 };

        // Debit / Received (Right, Green)
        const debCell = row.getCell(4);
        debCell.value = isGot ? t.amount : null;
        debCell.numFmt = '₹ #,##0.00';
        debCell.alignment = { horizontal: 'right', vertical: 'middle' };
        debCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: isGot ? GREEN_TEXT : '94A3B8' } };
        if (isGot) debCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };

        // Credit / Given (Right, Red)
        const credCell = row.getCell(5);
        credCell.value = !isGot ? t.amount : null;
        credCell.numFmt = '₹ #,##0.00';
        credCell.alignment = { horizontal: 'right', vertical: 'middle' };
        credCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: !isGot ? RED_TEXT : '94A3B8' } };
        if (!isGot) credCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } };

        // Payment Mode (Centered)
        const mCell = row.getCell(6);
        mCell.value = (t.paymentMode || 'UPI').toUpperCase();
        mCell.alignment = { horizontal: 'center', vertical: 'middle' };
        mCell.font = { name: 'Calibri', size: 9, color: { argb: MUTED_LABEL } };

        // Status (Centered, Green)
        const sCell = row.getCell(7);
        sCell.value = (t.status || 'Completed').toUpperCase();
        sCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '16A34A' } };

        // Light row borders
        for (let c = 1; c <= 7; c++) {
          const cell = row.getCell(c);
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
        }

        currentRow++;
      });

      // 7. Totals Summary Row
      currentRow++;
      const totalRow = worksheet.getRow(currentRow);
      totalRow.height = 26;

      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      const totLabel = totalRow.getCell(1);
      totLabel.value = 'TOTAL LEDGER SUMMARIES:';
      totLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '334155' } };
      totLabel.alignment = { horizontal: 'right', vertical: 'middle' };

      const totDebCell = totalRow.getCell(4);
      totDebCell.value = customerTotalReceived;
      totDebCell.numFmt = '₹ #,##0.00';
      totDebCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: GREEN_TEXT } };
      totDebCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totDebCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };

      const totCredCell = totalRow.getCell(5);
      totCredCell.value = customerTotalGiven;
      totCredCell.numFmt = '₹ #,##0.00';
      totCredCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: RED_TEXT } };
      totCredCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totCredCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } };

      // 8. Final Net Outstanding Balance Row
      currentRow++;
      const finalRow = worksheet.getRow(currentRow);
      finalRow.height = 32;

      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const finalLabel = finalRow.getCell(1);
      finalLabel.value = isDue ? 'FINAL NET DUE BALANCE (CUSTOMER TO PAY):' : 'FINAL NET BALANCE:';
      finalLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: isDue ? RED_TEXT : GREEN_TEXT } };
      finalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

      worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
      const finalVal = finalRow.getCell(5);
      finalVal.value = activeCustomer.outstandingBalance;
      finalVal.numFmt = '₹ #,##0.00';
      finalVal.font = { name: 'Calibri', size: 13, bold: true, color: { argb: isDue ? RED_TEXT : GREEN_TEXT } };
      finalVal.alignment = { horizontal: 'center', vertical: 'middle' };
      finalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isDue ? RED_BG : GREEN_BG } };
      finalVal.border = {
        top: { style: 'medium', color: { argb: isDue ? RED_TEXT : GREEN_TEXT } },
        bottom: { style: 'medium', color: { argb: isDue ? RED_TEXT : GREEN_TEXT } },
        left: { style: 'medium', color: { argb: isDue ? RED_TEXT : GREEN_TEXT } },
        right: { style: 'medium', color: { argb: isDue ? RED_TEXT : GREEN_TEXT } },
      };

      // Write to Buffer & Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}_Khata_Statement_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Excel Downloaded', `${activeCustomer.name}'s official .xlsx spreadsheet downloaded with colors & styles.`, 'success');
    } catch (err) {
      console.error('Excel generation error:', err);
      addToast('Export Error', 'Failed to generate Excel sheet. Please retry.', 'error');
    }
  };

  // Print or Download Statement as PDF (Clean Single or Multi-Page 25-txn Print)
  const handlePrintPdf = () => {
    if (!activeCustomer) return;
    const billEl = document.getElementById('printable-due-bill');
    if (!billEl) {
      window.print();
      return;
    }

    // Remove any existing print frame
    const existingFrame = document.getElementById('smartkhata-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'smartkhata-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    // Clone bill content
    const billContent = billEl.innerHTML;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Due_Bill_${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    .screen-only {
      display: none !important;
    }
    .print-page {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      page-break-after: always !important;
      break-after: page !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .gap-1 { gap: 4px; }
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .gap-x-3 { column-gap: 12px; }
    .grid { display: grid; }
    .grid-cols-1, .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .col-span-7, .sm\\:col-span-7 { grid-column: span 7 / span 7; }
    .col-span-5, .sm\\:col-span-5 { grid-column: span 5 / span 5; }
    .sm\\:flex-row { flex-direction: row; }
    .w-full { width: 100%; }
    .w-14 { width: 56px; }
    .h-14 { height: 56px; }
    .w-16, .sm\\:w-16 { width: 64px; }
    .h-16, .sm\\:h-16 { height: 64px; }
    .p-1 { padding: 4px; }
    .p-2 { padding: 8px; }
    .p-2\\.5, .sm\\:p-3 { padding: 10px; }
    .p-3 { padding: 12px; }
    .p-4 { padding: 14px; }
    .p-5, .sm\\:p-7 { padding: 12px; }
    .pb-2 { padding-bottom: 8px; }
    .pb-2\\.5 { padding-bottom: 10px; }
    .pb-3 { padding-bottom: 12px; }
    .pt-1 { padding-top: 4px; }
    .pt-2 { padding-top: 8px; }
    .pt-3 { padding-top: 12px; }
    .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 6px; padding-bottom: 6px; }
    .py-2\\.5 { padding-top: 7px; padding-bottom: 7px; }
    .px-2\\.5 { padding-left: 8px; padding-right: 8px; }
    .px-3 { padding-left: 10px; padding-right: 10px; }
    .mt-0\\.5 { margin-top: 2px; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .ml-2 { margin-left: 8px; }
    .border { border: 1px solid #e2e8f0; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .border-t-2 { border-top: 2px solid #cbd5e1; }
    .border-slate-200, .border-slate-200\\/80 { border-color: #e2e8f0; }
    .border-slate-300 { border-color: #cbd5e1; }
    .border-slate-900 { border-color: #0f172a; }
    .border-indigo-100 { border-color: #e0e7ff; }
    .border-indigo-200 { border-color: #c7d2fe; }
    .border-emerald-200 { border-color: #a7f3d0; }
    .border-rose-200 { border-color: #fecdd3; }
    .rounded-md { border-radius: 6px; }
    .rounded-lg { border-radius: 8px; }
    .rounded-xl { border-radius: 12px; }
    .rounded-2xl { border-radius: 16px; }
    .bg-white { background-color: #ffffff; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100, .bg-slate-100\\/70, .bg-slate-100\\/80, .bg-slate-100\\/60 { background-color: #f1f5f9; }
    .bg-indigo-50, .bg-indigo-50\\/40, .bg-indigo-50\\/70 { background-color: #eef2ff; }
    .bg-emerald-50\\/80, .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-rose-50\\/80, .bg-rose-50 { background-color: #fff1f2; }
    .text-slate-900 { color: #0f172a; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-700 { color: #334155; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .text-indigo-600 { color: #4f46e5; }
    .text-indigo-700 { color: #4338ca; }
    .text-indigo-900 { color: #312e81; }
    .text-emerald-600 { color: #059669; }
    .text-emerald-700 { color: #047857; }
    .text-rose-600 { color: #e11d48; }
    .text-rose-700 { color: #be123c; }
    .text-rose-900 { color: #881337; }
    .font-normal { font-weight: 400; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-base { font-size: 14px; }
    .text-lg { font-size: 16px; }
    .text-xl { font-size: 18px; }
    .text-2xl, .sm\\:text-2xl { font-size: 20px; }
    .text-\\[9px\\] { font-size: 9px; }
    .text-\\[9\\.5px\\] { font-size: 9.5px; }
    .text-\\[10px\\] { font-size: 10px; }
    .text-\\[10\\.5px\\] { font-size: 10.5px; }
    .text-\\[11px\\] { font-size: 11px; }
    .text-right, .sm\\:text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .uppercase { text-transform: uppercase; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .space-y-4 > * + * { margin-top: 10px; }
    .space-y-1\\.5 > * + * { margin-top: 5px; }
    .space-y-0\\.5 > * + * { margin-top: 2px; }
    .inline-block { display: inline-block; }
    .overflow-hidden { overflow: hidden; }
    .whitespace-nowrap { white-space: nowrap; }
    .object-contain { object-fit: contain; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .italic { font-style: italic; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e2e8f0; }
    thead th { background-color: #f1f5f9 !important; }
    tr { page-break-inside: avoid; }
    @media print {
      body { margin: 0; padding: 0; }
      .screen-only { display: none !important; }
      .print-page {
        page-break-after: always !important;
        break-after: page !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  ${billContent}
</body>
</html>`);
    doc.close();

    // Give browser time to load images/fonts before calling print dialog
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error, fallback to window.print', e);
        window.print();
      }
    }, 450);
  };

  // Generate High-Res UPI QR Image Card with Red Total Due on top, QR in center, and UPI ID below
  const generateWhatsAppPaymentQrBlob = async (options: {
    dueAmount: number;
    upiId: string;
    payeeName: string;
    upiUri: string;
  }): Promise<Blob | null> => {
    const { dueAmount, upiId, payeeName, upiUri } = options;
    if (typeof window === 'undefined') return null;

    try {
      // 1. Generate QR data URL using QRCode library
      const qrDataUrl = await QRCode.toDataURL(upiUri, {
        width: 380,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      // 2. Load QR Image into Image element
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrDataUrl;
      await new Promise((resolve, reject) => {
        qrImage.onload = () => resolve(null);
        qrImage.onerror = reject;
      });

      // 3. Create Canvas
      const width = 600;
      const height = 740;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Safe rounded rectangle drawing helper
      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      // Canvas outer background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // Card Background with border
      drawRoundRect(20, 20, width - 40, height - 40, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // --- TOP HEADER (Above QR): TOTAL DUE IN BOLD RED ---
      const redBannerX = 40;
      const redBannerY = 44;
      const redBannerW = width - 80;
      const redBannerH = 100;

      drawRoundRect(redBannerX, redBannerY, redBannerW, redBannerH, 16);
      ctx.fillStyle = '#FEF2F2'; // Soft red-50
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FECDD3'; // Red-200 border
      ctx.stroke();

      // Top pill subtitle
      ctx.textAlign = 'center';
      ctx.fillStyle = '#EF4444'; // Red-500
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('OUTSTANDING DUE PAYMENT', width / 2, redBannerY + 34);

      // Total Due in BOLD RED
      const formattedDue = formatINR(dueAmount);
      ctx.fillStyle = '#DC2626'; // Deep Red-600
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`TOTAL DUE: ${formattedDue}`, width / 2, redBannerY + 76);

      // --- CENTER: QR CODE CONTAINER ---
      const qrContainerX = 110;
      const qrContainerY = 166;
      const qrContainerSize = 380;

      drawRoundRect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Draw QR Image in Center
      const qrPadding = 16;
      const qrSize = qrContainerSize - qrPadding * 2;
      ctx.drawImage(qrImage, qrContainerX + qrPadding, qrContainerY + qrPadding, qrSize, qrSize);

      // --- BELOW QR: UPI ID CONTAINER ---
      const upiPillX = 50;
      const upiPillY = 566;
      const upiPillW = width - 100;
      const upiPillH = 50;

      drawRoundRect(upiPillX, upiPillY, upiPillW, upiPillH, 12);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#CBD5E1';
      ctx.stroke();

      // UPI ID Text
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 19px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
      ctx.fillText(`UPI ID: ${upiId}`, width / 2, upiPillY + 32);

      // Payee Name
      ctx.fillStyle = '#475569';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Payee: ${payeeName}`, width / 2, 642);

      // Supported Apps Badge
      ctx.fillStyle = '#059669'; // Emerald-600
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('⚡ Accepted via GPay • PhonePe • Paytm • BHIM • Any UPI App', width / 2, 680);

      // Convert to Blob
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.95);
      });
    } catch (err) {
      console.error('Error generating QR Image Blob:', err);
      return null;
    }
  };

  // WhatsApp Share Statement & Payment QR Card
  const handleShareWhatsApp = async () => {
    if (!activeCustomer || isSharingWhatsApp) return;
    setIsSharingWhatsApp(true);

    try {
      let targetPhone = activeCustomer.phone.replace(/[^0-9]/g, '');
      if (targetPhone.length === 10) {
        targetPhone = '91' + targetPhone;
      }

      // Outstanding Due Balance
      const numDue = activeCustomer.outstandingBalance !== 0 
        ? Math.abs(activeCustomer.outstandingBalance) 
        : 3000;
      const formattedDue = formatINR(numDue);

      // Sender Business Profile & Official Phone (from Settings / Enterprise Profile)
      const businessName = (settings.businessName || profile?.businessName || 'Sharma Traders & Enterprise').trim();
      const officialPhone = (settings.businessPhone || profile?.phone || '8371838314').trim();
      const upiId = (settings.paymentSettings?.upiId || `${officialPhone}@upi`).trim();
      const payeeName = (settings.paymentSettings?.payeeName || businessName).trim();

      const upiUri = buildUpiUri(
        upiId,
        payeeName,
        numDue > 0 ? numDue : undefined,
        `Payment from ${activeCustomer.name}`
      );

      // Exact user requested message text format:
      // Your balance of ₹3,000 is Due.
      // Please pay at the earliest.
      // —
      // Business Name  (Official Phone Number)
      const messageText = `Your balance of ${formattedDue} is Due.\nPlease pay at the earliest.\n—\n${businessName}  (${officialPhone})`;

      // Generate the custom QR card image (Total Due on top in Red, QR in center, UPI ID below)
      const blob = await generateWhatsAppPaymentQrBlob({
        dueAmount: numDue,
        upiId,
        payeeName,
        upiUri,
      });

      if (blob) {
        const fileName = `Payment_QR_${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

        // 1. Copy image to Clipboard so user can simply press Ctrl+V (or Paste) in WhatsApp
        let copied = false;
        try {
          if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            copied = true;
          }
        } catch (clipErr) {
          console.warn('Clipboard write fallback:', clipErr);
        }

        // 2. Auto-download QR Image file to Gallery / Downloads
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);

        // 3. Launch WhatsApp directly via Android Native Intent Protocol / WhatsApp Protocol
        openWhatsApp(targetPhone, messageText);

        if (copied) {
          addToast(
            'WhatsApp Opening...',
            'QR Image copied to clipboard & downloaded! Paste (Ctrl+V) to send with message.',
            'success'
          );
        } else {
          addToast(
            'WhatsApp Opening...',
            'QR Image downloaded to gallery! Attach image and send message.',
            'success'
          );
        }
        return;
      }

      // Fallback if blob failed: open WhatsApp directly with message text
      openWhatsApp(targetPhone, messageText);
    } catch (err) {
      console.error('Error in handleShareWhatsApp:', err);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };
 
  // Universal Share for Customer Profile Header (Mobile Native Share Sheet / Desktop Fallback)
  const handleUniversalShare = async () => {
    if (!activeCustomer || isUniversalSharing) return;
    setIsUniversalSharing(true);

    try {
      const numDue = activeCustomer.outstandingBalance !== 0 
        ? Math.abs(activeCustomer.outstandingBalance) 
        : 3000;
      const formattedDue = formatINR(numDue);

      const businessName = (settings.businessName || profile?.businessName || 'Sharma Traders & Enterprise').trim();
      const officialPhone = (settings.businessPhone || profile?.phone || '8371838314').trim();
      const upiId = (settings.paymentSettings?.upiId || `${officialPhone}@upi`).trim();
      const payeeName = (settings.paymentSettings?.payeeName || businessName).trim();

      const upiUri = buildUpiUri(
        upiId,
        payeeName,
        numDue > 0 ? numDue : undefined,
        `Payment from ${activeCustomer.name}`
      );

      const shareText = `Your balance of ${formattedDue} is Due.\nPlease pay at the earliest.\n—\n${businessName}  (${officialPhone})`;

      // Generate the custom QR card image
      const blob = await generateWhatsAppPaymentQrBlob({
        dueAmount: numDue,
        upiId,
        payeeName,
        upiUri,
      });

      const fileName = `Payment_QR_${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

      // 1. Mobile Universal Web Share API (native OS share dialog: WhatsApp, SMS, Mail, Drive, Bluetooth, etc.)
      if (typeof navigator !== 'undefined' && navigator.share) {
        let fileObj: File | null = null;
        if (blob) {
          try {
            fileObj = new File([blob], fileName, { type: 'image/png' });
          } catch {
            fileObj = null;
          }
        }

        if (fileObj && navigator.canShare && navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            title: `Payment Summary - ${activeCustomer.name}`,
            text: shareText,
            files: [fileObj],
          });
          addToast('Shared Successfully', 'Balance summary and QR shared.', 'success');
          return;
        } else {
          await navigator.share({
            title: `Payment Summary - ${activeCustomer.name}`,
            text: shareText,
          });
          addToast('Shared Successfully', 'Balance summary shared.', 'success');
          return;
        }
      }

      // 2. Desktop Fallback: Copy to clipboard & auto-download image
      if (blob) {
        try {
          if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
          }
        } catch (clipErr) {
          console.warn('Clipboard write fallback:', clipErr);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      }

      addToast('Copied to Clipboard', 'Payment summary and QR copied! Ready to share anywhere.', 'info');
    } catch (err) {
      console.warn('Universal share canceled or failed:', err);
    } finally {
      setIsUniversalSharing(false);
    }
  };

  // Download Payment QR Card from Universal Share
  const handleDownloadQrCard = async () => {
    if (!activeCustomer) return;
    const numDue = activeCustomer.outstandingBalance !== 0 
      ? Math.abs(activeCustomer.outstandingBalance) 
      : 3000;

    const businessName = (settings.businessName || profile?.businessName || 'Sharma Traders & Enterprise').trim();
    const officialPhone = (settings.businessPhone || profile?.phone || '8371838314').trim();
    const upiId = (settings.paymentSettings?.upiId || `${officialPhone}@upi`).trim();
    const payeeName = (settings.paymentSettings?.payeeName || businessName).trim();

    const upiUri = buildUpiUri(
      upiId,
      payeeName,
      numDue > 0 ? numDue : undefined,
      `Payment from ${activeCustomer.name}`
    );

    const blob = await generateWhatsAppPaymentQrBlob({
      dueAmount: numDue,
      upiId,
      payeeName,
      upiUri,
    });

    if (blob) {
      const fileName = `Payment_QR_${activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      addToast('Downloaded', 'Payment QR Card saved to device.', 'success');
    }
  };

  const handleCopyShareText = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        addToast('Copied to Clipboard', 'Message text copied.', 'success');
      }
    } catch {
      addToast('Copy Failed', 'Please copy manually.', 'warning');
    }
  };

  const handleCopyUpiUri = async (uri: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(uri);
        addToast('UPI Link Copied', 'Direct UPI payment link copied to clipboard.', 'success');
      }
    } catch {
      addToast('Copy Failed', 'Please copy manually.', 'warning');
    }
  };

  const handleSendSms = (phone: string, text: string) => {
    const rawPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
    window.location.href = `sms:${targetPhone}?body=${encodeURIComponent(text)}`;
  };

  const handleSendEmail = (email: string, subject: string, body: string) => {
    window.location.href = `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Format Time for chat bubbles (e.g. "09:22 AM")
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '09:00 AM';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-6.5rem)] min-h-[680px]">
        
        {/* ================= LEFT COLUMN: CUSTOMER DIRECTORY ================= */}
        <div className={`lg:col-span-4 glass-card p-3 flex flex-col h-full ${
          mobileActivePanel === 'ledger' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Top Search & Add Customer */}
          <div className="space-y-2 p-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Customers ({customers.length})
              </h2>
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="px-2.5 py-1 text-xs font-bold rounded-xl text-white fintech-gradient-primary flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer name or phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 rounded-lg transition-colors ${filterType === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('credit')}
                className={`flex-1 py-1 rounded-lg transition-colors ${filterType === 'credit' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'}`}
              >
                Due
              </button>
              <button
                onClick={() => setFilterType('debit')}
                className={`flex-1 py-1 rounded-lg transition-colors ${filterType === 'debit' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'}`}
              >
                Advance
              </button>
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = cust.id === activeCustomer?.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    setScreenView('chat');
                    setMobileActivePanel('ledger');
                  }}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      : 'bg-white/50 dark:bg-slate-800/30 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-full bg-[#E57373] text-white font-extrabold flex items-center justify-center text-xs shrink-0 ${getCustomerRatingBorder(cust.rating)}`}>
                        {cust.avatar ? (
                          <img src={cust.avatar} alt={cust.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          cust.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${getCustomerRatingColor(cust.rating)}`}>
                          {cust.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                          <span>{cust.phone}</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-2.5 h-2.5 ${
                                  star <= (cust.rating || 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-bold font-mono ${
                        cust.outstandingBalance > 0 ? 'text-rose-600' :
                        cust.outstandingBalance < 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {formatINR(Math.abs(cust.outstandingBalance))}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                        {cust.outstandingBalance > 0 ? 'Due' : cust.outstandingBalance < 0 ? 'Advance' : 'Settled'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: INTERACTIVE KHATABOOK MOBILE SCREEN ================= */}
        <div className={`flex flex-col ${
          mobileActivePanel === 'directory'
            ? 'hidden lg:flex lg:col-span-8 lg:h-full lg:bg-white lg:dark:bg-[#0E1526] lg:rounded-[28px] lg:border lg:border-slate-200/80 lg:dark:border-slate-800 lg:shadow-xl lg:overflow-hidden lg:relative'
            : 'fixed inset-0 z-50 bg-[#F4F6F5] dark:bg-[#0B101D] h-[100dvh] w-full flex flex-col overflow-hidden lg:static lg:inset-auto lg:z-auto lg:col-span-8 lg:h-full lg:bg-white lg:dark:bg-[#0E1526] lg:rounded-[28px] lg:border lg:border-slate-200/80 lg:dark:border-slate-800 lg:shadow-xl lg:relative'
        }`}>
          
          {activeCustomer ? (
            <>
              {/* -------------------------------------------------------------
                  SCREEN 1: PROFILE EDIT SCREEN (Exact replica of Image 1)
              -------------------------------------------------------------- */}
              {screenView === 'profile' && (
                <div className="flex-1 flex flex-col bg-[#F6FAF8] dark:bg-slate-900 overflow-y-auto animate-in slide-in-from-right duration-200">
                  
                  {/* Top Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                    <button
                      onClick={() => setScreenView('chat')}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Profile
                    </h2>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600">
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-6 max-w-lg mx-auto w-full">
                    
                    {/* Big Avatar with Camera Button (Image 1) */}
                    <div className="flex flex-col items-center justify-center my-2">
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shadow-md ${getCustomerRatingBorder(activeCustomer.rating)}`}>
                          {profileAvatar ? (
                            <img src={profileAvatar} alt={activeCustomer.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-12 h-12 text-slate-400" />
                          )}
                        </div>
                        <input
                          type="file"
                          ref={avatarFileInputRef}
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg border-2 border-white"
                          title="Change Photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card 1: Name (Image 1) */}
                    <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl p-4 border border-[#D5ECE3] dark:border-slate-700 transition-all">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveProfileField('name')}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsEditingName(true)}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {activeCustomer.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>

                    {/* Section: Contact Information (Image 1) */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                        Contact Information
                      </div>

                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl border border-[#D5ECE3] dark:border-slate-700 divide-y divide-[#D5ECE3] dark:divide-slate-700 overflow-hidden">
                        {/* Phone row */}
                        <div className="p-4">
                          {isEditingPhone ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="tel"
                                value={tempPhone}
                                onChange={(e) => setTempPhone(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveProfileField('phone')}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => setIsEditingPhone(true)}
                              className="flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                  <Phone className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {activeCustomer.phone}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          )}
                        </div>

                        {/* Address row */}
                        <div className="p-4">
                          {isEditingAddress ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={tempAddress}
                                onChange={(e) => setTempAddress(e.target.value)}
                                placeholder="Enter full address"
                                className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveProfileField('address')}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => setIsEditingAddress(true)}
                              className="flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                  <MapPin className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {activeCustomer.address || 'Add Address'}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: Customer Rating & Risk Level */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                        CRM Rating & Credit Trust
                      </div>
                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl p-4 border border-[#D5ECE3] dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-extrabold ${getCustomerRatingColor(activeCustomer.rating)}`}>
                              {activeCustomer.rating <= 2 ? 'High Risk (Rating 1-2 • Red)' : activeCustomer.rating <= 3 ? 'Medium Risk (Rating 3 • Yellow)' : 'Trusted Client (Rating 4-5 • Green)'}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                            {(activeCustomer.rating || 5)}.0 / 5.0
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleUpdateCustomerRating(star)}
                              className="p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                              title={`Set rating to ${star} Star`}
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= (activeCustomer.rating || 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section: Communications (Image 1) */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                        Communications
                      </div>

                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl p-4 border border-[#D5ECE3] dark:border-slate-700 flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              SMS Settings
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Transactions SMS, Language
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Delete Card (Image 1) */}
                    <div
                      onClick={handleDeleteCurrentCustomer}
                      className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl p-4 border border-[#D5ECE3] dark:border-slate-700 flex items-center gap-3 cursor-pointer hover:bg-rose-50 transition-colors group"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-rose-600">
                        Delete
                      </span>
                    </div>

                  </div>
                </div>
              )}


              {/* -------------------------------------------------------------
                  SCREEN 2: KHATA CHAT / STREAM VIEW (Exact replica of Image 2)
              -------------------------------------------------------------- */}
              {screenView === 'chat' && (
                <div className="flex-1 flex flex-col h-full bg-[#F2F5F4] dark:bg-[#0B101D] overflow-hidden">
                  
                  {/* Top App Bar (Exact replica of Image 2) */}
                  <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Back button (on mobile returns to Customer Directory) */}
                      <button
                        type="button"
                        onClick={() => setMobileActivePanel('directory')}
                        className="p-1 -ml-1 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                        title="Back to Customers Directory"
                      >
                        <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
                      </button>

                      {/* Circular Avatar (with rating-based colored round border) - Click opens View Profile */}
                      <div
                        onClick={() => setScreenView('profile')}
                        className={`w-10 h-10 rounded-full bg-[#E57373] text-white font-extrabold flex items-center justify-center text-base shadow-xs shrink-0 select-none cursor-pointer hover:opacity-90 active:scale-95 transition-all ${getCustomerRatingBorder(activeCustomer.rating)}`}
                        title="Click to view/edit profile"
                      >
                        {activeCustomer.avatar ? (
                          <img src={activeCustomer.avatar} alt={activeCustomer.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          activeCustomer.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Customer Name (Color based on rating) + CRM Star Rating - Click opens View Profile */}
                      <div className="min-w-0">
                        <div
                          onClick={() => setScreenView('profile')}
                          className={`text-[17px] font-black leading-tight truncate cursor-pointer hover:opacity-85 transition-opacity ${getCustomerRatingColor(activeCustomer.rating)}`}
                          title="Click to view/edit profile"
                        >
                          {activeCustomer.name}
                        </div>
                        {/* Customer CRM Rating - Only Stars Visible */}
                        <div
                          onClick={() => setScreenView('profile')}
                          className="flex items-center gap-0.5 cursor-pointer -mt-0.5 py-0.5 hover:opacity-80 transition-opacity"
                          title="Customer CRM Rating (Click to view profile)"
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= (activeCustomer.rating || 5)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right action icons: Universal Share, Statement Bill & Search */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsUniversalShareModalOpen(true)}
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        title="Universal Share (WhatsApp, SMS, Email, System Share, Copy, QR)"
                      >
                        <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </button>
                      <button
                        onClick={() => setIsStatementBillModalOpen(true)}
                        className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Generate Due Bill & Statement (PDF / Excel)"
                      >
                        <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </button>
                      <button
                        onClick={() => setIsChatSearchOpen(prev => !prev)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isChatSearchOpen
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Search Ledger"
                      >
                        <Search className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Chat Search Bar */}
                  {isChatSearchOpen && (
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search note, amount, category..."
                        className="flex-1 bg-transparent text-xs font-semibold focus:outline-none text-slate-900 dark:text-white"
                        autoFocus
                      />
                      {chatSearchQuery && (
                        <button onClick={() => setChatSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Transactions Stream / Chat Area (Exact replica of Image 2) */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F2F5F4] dark:bg-[#0B101D]">
                    {Object.keys(groupedTransactions).length > 0 ? (
                      Object.entries(groupedTransactions).map(([dateBadge, txns]) => (
                        <div key={dateBadge} className="space-y-4">
                          
                          {/* Centered Date Badge Pill (e.g. "26 Aug 2026", "Today") */}
                          <div className="flex justify-center my-2">
                            <span className="px-3.5 py-0.5 rounded-full text-xs font-semibold bg-[#7E9E9B] text-white shadow-xs select-none">
                              {dateBadge}
                            </span>
                          </div>

                          {/* Chat Bubbles */}
                          {txns.map((t) => {
                            const isReceived = t.type === 'debit' || t.type === 'collection';

                            return (
                              <div
                                key={t.id}
                                className={`flex flex-col ${isReceived ? 'items-start' : 'items-end'}`}
                              >
                                {/* The Bubble Card */}
                                <div className="w-full max-w-[85%] sm:max-w-sm rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden p-3 space-y-2">
                                  
                                  {/* Header: Arrow + Amount + Time (Click amount to edit) */}
                                  <div
                                    onClick={() => handleOpenEditTransaction(t)}
                                    className="flex items-center justify-between cursor-pointer select-none pb-1 group/header"
                                    title="Click to edit entry"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {isReceived ? (
                                        <ArrowDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                      ) : (
                                        <ArrowUp className="w-5 h-5 text-rose-600 dark:text-rose-400 stroke-[3]" />
                                      )}
                                      <span className={`text-xl font-black tracking-tight ${
                                        isReceived
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}>
                                        ₹{t.amount.toLocaleString('en-IN')}
                                      </span>
                                      <span className="opacity-0 group-hover/header:opacity-100 text-[10px] font-bold text-slate-400 pl-1 transition-opacity">
                                        ✎
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium shrink-0 ml-2">
                                      <span>{formatDate(t.date)}, {formatTime(t.createdAt || t.date)}</span>
                                      <span>✓</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          printSingleTxnBill(t);
                                        }}
                                        className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                        title="Print Bill / Receipt for this transaction"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Multi-Attachments or Dark UPI Receipt Card */}
                                  {t.attachments && t.attachments.length > 0 ? (
                                    <div className="space-y-1.5 my-1">
                                      {(() => {
                                        const parsedList: AttachedBill[] = (t.attachments || []).map((raw, idx) => {
                                          try {
                                            const obj = JSON.parse(raw);
                                            if (obj.url) return obj;
                                          } catch {}
                                          const isPdf = raw.toLowerCase().includes('.pdf') || raw.startsWith('data:application/pdf');
                                          return {
                                            id: `att_${idx}`,
                                            url: raw,
                                            name: isPdf ? `Invoice_Bill_${idx + 1}.pdf` : `Bill_Photo_${idx + 1}.jpg`,
                                            type: isPdf ? 'pdf' : 'image',
                                            size: isPdf ? 'PDF Document' : 'Photo',
                                          };
                                        });

                                        const firstItem = parsedList[0];
                                        const totalCount = parsedList.length;
                                        const additionalCount = totalCount - 1;

                                        return (
                                          <div className="space-y-1.5">
                                            {firstItem.type === 'image' ? (
                                              <div
                                                onClick={() => setPreviewGallery({ items: parsedList, currentIndex: 0, transactionId: t.id })}
                                                className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 max-h-52 flex items-center justify-center shadow-xs"
                                              >
                                                <img
                                                  src={firstItem.url}
                                                  alt={firstItem.name}
                                                  className="w-full h-full max-h-52 object-cover group-hover:scale-102 transition-transform duration-200"
                                                />

                                                {/* Multiple Images Counter Tag (e.g. +1 or +4) */}
                                                {additionalCount > 0 && (
                                                  <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-md bg-black/80 text-white font-extrabold text-xs shadow-md border border-white/20 backdrop-blur-xs flex items-center gap-1">
                                                    <span>+{additionalCount}</span>
                                                  </div>
                                                )}

                                                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1 opacity-90">
                                                  <span>{firstItem.name}</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div
                                                onClick={() => setPreviewGallery({ items: parsedList, currentIndex: 0, transactionId: t.id })}
                                                className="relative group cursor-pointer p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between hover:bg-rose-100/80 transition-colors shadow-xs"
                                              >
                                                <div className="flex items-center gap-3 min-w-0">
                                                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                    <FileText className="w-5 h-5" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                      {firstItem.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                      {firstItem.size || 'PDF Document'} • Click to preview
                                                    </div>
                                                  </div>
                                                </div>

                                                {additionalCount > 0 && (
                                                  <div className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-xs shrink-0 ml-2">
                                                    +{additionalCount}
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {totalCount > 1 && (
                                              <div
                                                onClick={() => setPreviewGallery({ items: parsedList, currentIndex: 0, transactionId: t.id })}
                                                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center justify-between px-1"
                                              >
                                                <span>View all {totalCount} attached bills</span>
                                                <span>→</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ) : null}

                                  {/* Note Text (e.g. "bhopal jana tha isliye liya" or "Sumant Admission Diploma...") */}
                                  {t.note && (
                                    <div className="text-[13px] text-slate-700 dark:text-slate-300 px-0.5 pt-0.5 leading-snug">
                                      {t.note}
                                    </div>
                                  )}
                                </div>

                                {/* Running Balance Note below bubble: Left for Received, Right for Given */}
                                <div className={`text-xs text-slate-500 font-medium mt-1 px-1 ${isReceived ? 'text-left' : 'text-right'}`}>
                                  {t.balanceLabel}
                                </div>
                              </div>
                            );
                          })}

                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-400">
                          {chatSearchQuery ? 'No transactions match your search.' : `No transactions yet for ${activeCustomer.name}.`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Click &ldquo;Received&rdquo; or &ldquo;Given&rdquo; below to make an entry.
                        </p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Bottom Action Bar: Fixed at bottom with two floating white pill buttons */}
                  <div className="p-3.5 sm:p-4 bg-[#F4F9F6] dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shrink-0">
                    {/* Left: ↓ Received (White pill, Green text & arrow) */}
                    <button
                      onClick={() => {
                        setEditingTxnId(null);
                        setEntryType('received');
                        setEntryAmountStr('');
                        setEntryNotes('');
                        setEntryAttachments([]);
                        setScreenView('entry');
                      }}
                      className="flex-1 h-12 sm:h-13 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/80 dark:border-slate-700 text-[#1E7E34] dark:text-emerald-400 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowDown className="w-5 h-5 text-[#1E7E34] dark:text-emerald-400 stroke-[3]" />
                      <span>Received</span>
                    </button>

                    {/* Right: ↑ Given (White pill, Red text & arrow) */}
                    <button
                      onClick={() => {
                        setEditingTxnId(null);
                        setEntryType('given');
                        setEntryAmountStr('');
                        setEntryNotes('');
                        setEntryAttachments([]);
                        setScreenView('entry');
                      }}
                      className="flex-1 h-12 sm:h-13 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/80 dark:border-slate-700 text-[#D32F2F] dark:text-rose-500 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowUp className="w-5 h-5 text-[#D32F2F] dark:text-rose-500 stroke-[3]" />
                      <span>Given</span>
                    </button>
                  </div>

                </div>
              )}


              {/* -------------------------------------------------------------
                  SCREEN 3: KEYPAD & ENTRY SCREEN (Exact replica of Image 3)
              -------------------------------------------------------------- */}
              {screenView === 'entry' && (
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-bottom duration-200">
                  
                  {/* Top Bar (Image 3) */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                      onClick={() => {
                        setEditingTxnId(null);
                        setEntryAmountStr('');
                        setEntryNotes('');
                        setEntryAttachments([]);
                        setScreenView('chat');
                      }}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      title="Back to Chat"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#E57373] text-white font-extrabold flex items-center justify-center text-xs">
                        {activeCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{editingTxnId ? 'Edit Entry' : activeCustomer.name}</span>
                          {editingTxnId && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white uppercase tracking-wider">
                              Edit
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-rose-500 font-bold">
                          ₹{Math.abs(activeCustomer.outstandingBalance).toLocaleString('en-IN')} Due
                        </div>
                      </div>
                    </div>

                    {editingTxnId ? (
                      <button
                        type="button"
                        onClick={handleDeleteEditingTransaction}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete this transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-6" /> /* Spacer */
                    )}
                  </div>

                  {/* Scrollable Upper Section: Big Amount + Note + Date + Bill photo */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {/* Big Amount Input Display with Cursor (Image 3) */}
                    <div className="py-4 text-center">
                      <div className="inline-flex items-center justify-center text-4xl font-black font-mono tracking-tight">
                        <span className={entryType === 'received' ? 'text-emerald-700 dark:text-emerald-400 mr-1' : 'text-rose-600 mr-1'}>
                          ₹
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {entryAmountStr || '0'}
                        </span>
                        <span className={`w-0.5 h-9 ml-1 animate-pulse ${entryType === 'received' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      </div>
                      {/* Underline accent (Image 3) */}
                      <div className={`w-48 h-0.5 mx-auto mt-2 ${entryType === 'received' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {editingTxnId && (
                        <div className="mt-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                            ✏️ Editing Transaction • Modify amount or bills below
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Form Cards (Image 3) */}
                    <div className="space-y-3 max-w-sm mx-auto">
                      
                      {/* Card 1: Add Notes (Image 3) */}
                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-[#D5ECE3] dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={entryNotes}
                            onChange={(e) => setEntryNotes(e.target.value)}
                            placeholder="Add Notes"
                            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                          />
                        </div>
                        <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400 cursor-pointer shrink-0" />
                      </div>

                      {/* Card 2: Bill Date (Image 3) */}
                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-[#D5ECE3] dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <div>
                            <div className="text-[10px] text-slate-400">Bill Date</div>
                            <input
                              type="date"
                              value={entryDate}
                              onChange={(e) => setEntryDate(e.target.value)}
                              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* Card 3: Add Bills / Photos & PDFs (Image 3) */}
                      <div className="bg-[#EDF6F3] dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-[#D5ECE3] dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Camera className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {entryAttachments.length > 0
                                ? `${entryAttachments.length} Bill File(s) Attached`
                                : 'Add Bills (Images / PDFs)'}
                            </span>
                            {entryAttachments.length > 0 && (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                {entryAttachments.filter(a => a.type === 'image').length} Image(s), {entryAttachments.filter(a => a.type === 'pdf').length} PDF(s)
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="file"
                          ref={billFileInputRef}
                          accept="image/*,application/pdf"
                          multiple
                          onChange={handleBillUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => billFileInputRef.current?.click()}
                          className="p-1 rounded-lg text-emerald-600 font-bold hover:bg-emerald-50 flex items-center gap-1"
                          title="Attach Images or PDFs"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[11px] hidden sm:inline">Add More</span>
                        </button>
                      </div>

                      {/* Multiple Attachments Preview Cards (Images & PDFs) */}
                      {entryAttachments.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                            <span>Attached Invoices / Receipts</span>
                            <button
                              type="button"
                              onClick={() => setEntryAttachments([])}
                              className="text-rose-500 hover:underline capitalize"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {entryAttachments.map((att) => (
                              <div
                                key={att.id}
                                className="relative group p-2 rounded-xl bg-[#F0F7F4] dark:bg-slate-800 border border-[#D0E7DD] dark:border-slate-700 flex items-center gap-2 overflow-hidden"
                              >
                                {att.type === 'image' ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex flex-col items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                    <span className="text-[8px] font-bold uppercase">PDF</span>
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {att.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400">
                                    {att.size || (att.type === 'pdf' ? 'PDF Document' : 'Image')}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="p-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 shrink-0"
                                  title="Remove attachment"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Middle Action Buttons (Image 3) */}
                  <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 max-w-sm mx-auto w-full shrink-0">
                    {editingTxnId ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDeleteEditingTransaction}
                          className="py-2.5 px-3 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Entry
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCreateBillAndSave(true)}
                          className="py-2.5 px-3 rounded-full bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-[#C8E6C9] dark:border-emerald-800 active:scale-95 transition-all cursor-pointer"
                          title="Save changes and generate PDF Bill"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Create Bill
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmEntry}
                          className={`py-2.5 px-4 rounded-full text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                            entryType === 'received'
                              ? 'bg-[#1E7E34] hover:bg-[#155d27] shadow-emerald-600/20'
                              : 'bg-[#D32F2F] hover:bg-[#b71c1c] shadow-rose-600/20'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCreateBillAndSave(false)}
                          className="py-2.5 px-3 rounded-full bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-[#C8E6C9] dark:border-emerald-800 active:scale-95 transition-all cursor-pointer"
                          title="Add transaction to Khata & generate PDF Bill for this amount"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Create Bill
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmEntry}
                          className={`py-2.5 px-4 rounded-full text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                            entryType === 'received'
                              ? 'bg-[#1E7E34] hover:bg-[#155d27] shadow-emerald-600/20'
                              : 'bg-[#D32F2F] hover:bg-[#b71c1c] shadow-rose-600/20'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          Confirm
                        </button>
                      </>
                    )}
                  </div>

                  {/* Custom Mobile Keypad (Image 3) */}
                  <div className="p-3 bg-[#F2F6F5] dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 shrink-0 max-w-sm mx-auto w-full">
                    <div className="grid grid-cols-4 gap-2">
                      {/* Row 1 */}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('1')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('2')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        2
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('3')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        3
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('backspace')}
                        className="py-3 rounded-2xl bg-[#FFE4E6] dark:bg-rose-950/60 text-rose-600 flex items-center justify-center active:opacity-75 shadow-xs"
                      >
                        <Delete className="w-5 h-5" />
                      </button>

                      {/* Row 2 */}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('4')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        4
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('5')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('6')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        6
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('clear')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-base font-bold text-slate-500 shadow-xs active:bg-slate-100"
                      >
                        ×
                      </button>

                      {/* Row 3 */}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('7')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        7
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('8')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        8
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('9')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs active:bg-slate-100"
                      >
                        9
                      </button>
                      <button
                        type="button"
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-500 shadow-xs"
                      >
                        -
                      </button>

                      {/* Row 4 */}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('.')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs"
                      >
                        .
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white shadow-xs"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        className="py-3 rounded-2xl bg-[#C8E6C9] dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-lg font-bold shadow-xs"
                      >
                        =
                      </button>
                      <button
                        type="button"
                        className="py-3 rounded-2xl bg-white dark:bg-slate-900 text-lg font-bold text-slate-500 shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              Select or add a customer to open Khata.
            </div>
          )}

        </div>

      </div>

      {/* Modal: Add New Customer */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add New Khata Customer
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Datta More PUMP"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9960992747"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Pune Highway Petrol Pump"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full-screen Attachment Lightbox Carousel / PDF Viewer */}
      {previewGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative bg-slate-900 text-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 flex flex-col max-h-[96vh] overflow-hidden">
            {(() => {
              const currentItem = previewGallery.items[previewGallery.currentIndex];
              if (!currentItem) return null;

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      {currentItem.type === 'pdf' ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                            {currentItem.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-emerald-400 border border-slate-700 shrink-0">
                            {previewGallery.currentIndex + 1} / {previewGallery.items.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {currentItem.size || (currentItem.type === 'pdf' ? 'PDF Document' : 'Image Photo')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={currentItem.url}
                        download={currentItem.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleRemovePreviewItem(previewGallery.currentIndex, e)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                        title="Delete active item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                      <button
                        onClick={() => setPreviewGallery(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Preview Stage with Floating Prev / Next Buttons */}
                  <div className="relative flex-1 min-h-[50vh] max-h-[62vh] my-3 rounded-2xl bg-black/50 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                    {/* Previous Button (Left Arrow) */}
                    {previewGallery.items.length > 1 && (
                      <button
                        onClick={handlePrevPreview}
                        className="absolute left-3 z-10 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-95"
                        title="Previous (Left Arrow)"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}

                    {/* Next Button (Right Arrow) */}
                    {previewGallery.items.length > 1 && (
                      <button
                        onClick={handleNextPreview}
                        className="absolute right-3 z-10 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-95"
                        title="Next (Right Arrow)"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}

                    {/* Current Item Content */}
                    <div className="w-full h-full flex items-center justify-center p-2">
                      {currentItem.type === 'image' ? (
                        <img
                          src={currentItem.url}
                          alt={currentItem.name}
                          className="max-h-[58vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                        />
                      ) : (
                        /* PDF Preview: Embedded Iframe + View/Download Footer */
                        <div className="w-full h-[58vh] flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                          {currentItem.url.startsWith('data:application/pdf') || currentItem.url.startsWith('blob:') || currentItem.url.endsWith('.pdf') ? (
                            <iframe
                              src={currentItem.url}
                              className="w-full flex-1 border-0 rounded-t-xl bg-slate-900"
                              title={currentItem.name}
                            />
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-white">{currentItem.name}</h4>
                                <p className="text-xs text-slate-400 mt-1">
                                  {currentItem.size || 'PDF Document'}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between px-4 shrink-0">
                            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-rose-400" /> PDF Document Preview
                            </span>
                            <a
                              href={currentItem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Thumbnails Strip (Small Boxes with Cross Delete Button) */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        All Attachments ({previewGallery.items.length})
                      </span>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        Click × on any box to delete, or click box to jump
                      </span>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto p-1.5 scrollbar-thin">
                      {previewGallery.items.map((item, idx) => {
                        const isCurrent = idx === previewGallery.currentIndex;
                        return (
                          <div
                            key={item.id || idx}
                            className="relative shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewGallery(prev => (prev ? { ...prev, currentIndex: idx } : null))
                              }
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer block relative ${
                                isCurrent
                                  ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/40 scale-105'
                                  : 'border-slate-800 opacity-65 hover:opacity-100 hover:border-slate-600'
                              }`}
                            >
                              {item.type === 'image' ? (
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-1 text-rose-400">
                                  <FileText className="w-5 h-5" />
                                  <span className="text-[8px] font-bold text-slate-300 truncate max-w-full mt-0.5">
                                    PDF
                                  </span>
                                </div>
                              )}

                              {/* Number Tag in corner of small box */}
                              <div className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[9px] font-bold text-white leading-tight">
                                {idx + 1}
                              </div>
                            </button>

                            {/* Cross Delete Icon on thumbnail */}
                            <button
                              type="button"
                              onClick={(e) => handleRemovePreviewItem(idx, e)}
                              className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg border border-white cursor-pointer transition-transform hover:scale-110"
                              title="Delete/Remove this image"
                            >
                              <X className="w-3 h-3 stroke-[3]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= CUSTOMER DUE BILL & STATEMENT GENERATOR MODAL ================= */}
      {isStatementBillModalOpen && activeCustomer && (
        <div className="statement-modal-wrapper fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[28px] max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Top Bar (Controls: Print PDF, Export Excel, WhatsApp, Close) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 print:hidden shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Customer Due Bill & Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeCustomer.name} • {activeCustomerTransactions.length} transaction entries
                  </p>
                </div>
              </div>

              {/* Export & Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Print / Download PDF */}
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF Bill</span>
                </button>

                {/* Export Excel (.xlsx) */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Download styled Excel (.xlsx) spreadsheet with colors, bold headers & column widths"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>

                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={isSharingWhatsApp}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  title="Send Due Bill statement & Payment QR via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setIsStatementBillModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Bill Document Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/40">
              <div id="printable-due-bill" className="space-y-6 mx-auto max-w-2xl">
                {statementPages.map((pageTxns, pageIdx) => {
                  const isFirstPage = pageIdx === 0;
                  const isLastPage = pageIdx === statementPages.length - 1;
                  const pageSummary = getPageSummary(pageTxns);
                  const startTxnNum = pageIdx * STATEMENT_PAGE_SIZE + 1;
                  const endTxnNum = pageIdx * STATEMENT_PAGE_SIZE + pageTxns.length;

                  return (
                    <div key={pageIdx}>
                      {/* Screen-Only Page Divider between pages */}
                      {pageIdx > 0 && (
                        <div className="screen-only py-4 flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
                          <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1" />
                          <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-[11px]">
                            Page {pageIdx + 1} of {statementPages.length}
                          </span>
                          <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1" />
                        </div>
                      )}

                      <div className="print-page bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4">
                        {/* Header */}
                        {isFirstPage ? (
                          /* First Page Main Header */
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {settings.businessName || profile.businessName || 'SmartKhata Store'}
                              </h2>
                              <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                                {profile.businessAddress || 'Official Merchant Business Address'}
                              </p>
                              <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                                <span>Phone: {profile.phone || '+91 98000 00000'}</span>
                                {profile.businessGst && (
                                  <span className="font-mono font-semibold text-indigo-700">
                                    GSTIN: {profile.businessGst}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider border border-indigo-200">
                                KHATA DUE STATEMENT & BILL
                              </div>
                              <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                                BILL-KHATA-{activeCustomer.id.slice(-6).toUpperCase()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Date: <span className="font-mono font-semibold text-slate-700">{formatDate(new Date().toISOString())}</span>
                                {statementPages.length > 1 && (
                                  <span className="font-bold text-indigo-600 ml-2">• Page 1 of {statementPages.length}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Continuation Page Compact Header */
                          <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                            <div>
                              <span className="text-base font-black text-slate-900">
                                {settings.businessName || profile.businessName || 'SmartKhata Store'}
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                Customer: <strong className="text-slate-800">{activeCustomer.name}</strong> ({activeCustomer.phone})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border border-slate-200">
                                {isLastPage ? 'Final Statement' : 'Statement (Contd.)'} • Page {pageIdx + 1} of {statementPages.length}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* First Page Customer Box, Net Due Card, and UPI QR Code */}
                        {isFirstPage && (
                          <>
                            {/* Customer Details & Due Amount Highlight Banner */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              {/* Customer Info */}
                              <div className="sm:col-span-7 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  Billed Customer
                                </div>
                                <div className="text-sm font-extrabold text-slate-900">
                                  {activeCustomer.name}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Phone: <span className="font-mono font-semibold">{activeCustomer.phone}</span>
                                  {activeCustomer.businessName && (
                                    <span className="text-indigo-600 font-medium ml-2">• {activeCustomer.businessName}</span>
                                  )}
                                </div>
                                {activeCustomer.address && (
                                  <div className="text-[10px] text-slate-500 truncate">
                                    Address: {activeCustomer.address}
                                  </div>
                                )}
                              </div>

                              {/* Outstanding Net Due Card */}
                              <div className={`sm:col-span-5 p-3 rounded-xl border flex flex-col justify-between ${
                                activeCustomer.outstandingBalance > 0
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                                  : activeCustomer.outstandingBalance < 0
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}>
                                <div className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                                  {activeCustomer.outstandingBalance > 0
                                    ? 'Total Due Amount'
                                    : activeCustomer.outstandingBalance < 0
                                    ? 'Advance Credit'
                                    : 'Account Status'}
                                </div>
                                <div className={`text-xl font-black tracking-tight ${
                                  activeCustomer.outstandingBalance > 0
                                    ? 'text-rose-600'
                                    : activeCustomer.outstandingBalance < 0
                                    ? 'text-emerald-600'
                                    : 'text-slate-800'
                                }`}>
                                  ₹{Math.abs(activeCustomer.outstandingBalance).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] font-bold opacity-80">
                                  {activeCustomer.outstandingBalance > 0
                                    ? '⚠️ Payment Due by Customer'
                                    : activeCustomer.outstandingBalance < 0
                                    ? '✓ Advance Paid (Surplus)'
                                    : '✓ All Dues Cleared'}
                                </div>
                              </div>
                            </div>

                            {/* Direct Scan & Pay UPI QR Section (If Due > 0) */}
                            {activeCustomer.outstandingBalance > 0 && (
                              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-100 flex items-center justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-[11px] font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                                    Scan & Settle Instantly via UPI
                                  </div>
                                  <div className="text-[11px] text-slate-600 truncate">
                                    Pay To: <strong className="text-slate-900">{settings.paymentSettings.payeeName}</strong> • <span className="font-mono font-bold text-indigo-600">UPI ID: {settings.paymentSettings.upiId}</span>
                                  </div>
                                  <div className="text-[9.5px] text-slate-500">
                                    Supported on Google Pay, PhonePe, Paytm, BHIM & all UPI apps.
                                  </div>
                                </div>
                                <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                                  <img
                                    src={
                                      settings.paymentSettings.customQrUrl ||
                                      getQrCodeUrl(
                                        buildUpiUri(
                                          settings.paymentSettings.upiId,
                                          settings.paymentSettings.payeeName,
                                          activeCustomer.outstandingBalance,
                                          `Due settlement for ${activeCustomer.name}`
                                        ),
                                        140
                                      )
                                    }
                                    alt="UPI QR Code"
                                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-md"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Ledger Statement Table for this page */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>
                              TRANSACTION HISTORY {statementPages.length > 1 ? `(Page ${pageIdx + 1}: Txn ${startTxnNum} - ${endTxnNum} of ${activeCustomerTransactions.length})` : `(${activeCustomerTransactions.length})`}
                            </span>
                            <span className="text-[10px] font-normal text-slate-400">All amounts in INR (₹)</span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px] border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Note / Description</th>
                                  <th className="py-2 px-3 text-right">Received (Debit)</th>
                                  <th className="py-2 px-3 text-right">Given (Credit)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[11px]">
                                {pageTxns.length > 0 ? (
                                  pageTxns.map((t) => {
                                    const isGot = t.type === 'debit' || t.type === 'collection';
                                    return (
                                      <tr key={t.id} className="hover:bg-slate-50/50">
                                        <td className="py-1.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                          {new Date(t.date).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-800">
                                          {t.note || (isGot ? 'Payment Received' : 'Credit Given')}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600">
                                          {isGot ? `₹${t.amount.toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                                          {!isGot ? `₹${t.amount.toLocaleString('en-IN')}` : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                                      No transactions recorded for this customer yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>

                              {/* Table Footer: Subtotals and Totals */}
                              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                                {statementPages.length === 1 ? (
                                  // Single Page: Only 1 page of transactions
                                  <>
                                    <tr>
                                      <td colSpan={2} className="py-2 px-3 text-right text-[10px] uppercase tracking-wider text-slate-500">
                                        Total Summaries:
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                        ₹{customerTotalReceived.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                                        ₹{customerTotalGiven.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-slate-200 bg-slate-100/70">
                                      <td colSpan={3} className="py-2 px-3 text-right font-black uppercase text-[11px]">
                                        Net Due Balance:
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-black text-xs ${
                                        activeCustomer.outstandingBalance > 0
                                          ? 'text-rose-600'
                                          : activeCustomer.outstandingBalance < 0
                                          ? 'text-emerald-600'
                                          : 'text-slate-800'
                                      }`}>
                                        ₹{Math.abs(activeCustomer.outstandingBalance).toLocaleString('en-IN')}
                                        <span className="text-[9px] font-normal block">
                                          {activeCustomer.outstandingBalance > 0 ? '(Due to Pay)' : activeCustomer.outstandingBalance < 0 ? '(Advance)' : '(Settled)'}
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                ) : !isLastPage ? (
                                  // Intermediate Multi-Page: Shows ONLY this page's summary and this page's net due balance
                                  <>
                                    <tr className="bg-indigo-50/40">
                                      <td colSpan={2} className="py-2 px-3 text-right text-[10px] uppercase tracking-wider text-indigo-900 font-bold">
                                        Page {pageIdx + 1} Summary (Txn {startTxnNum} - {endTxnNum}):
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                        ₹{pageSummary.received.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                                        ₹{pageSummary.given.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-slate-200 bg-slate-100/80">
                                      <td colSpan={3} className="py-2 px-3 text-right font-black uppercase text-[11px] text-indigo-900">
                                        Page {pageIdx + 1} Net Due Balance:
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-black text-xs ${
                                        pageSummary.net > 0
                                          ? 'text-rose-600'
                                          : pageSummary.net < 0
                                          ? 'text-emerald-600'
                                          : 'text-slate-800'
                                      }`}>
                                        ₹{Math.abs(pageSummary.net).toLocaleString('en-IN')}
                                        <span className="text-[9px] font-normal block">
                                          {pageSummary.net > 0 ? '(Due to Pay)' : pageSummary.net < 0 ? '(Advance)' : '(Settled)'}
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  // Last Page of Multi-Page: Shows this page's summary + TOTAL OF ALL PAGES COMBINED
                                  <>
                                    {/* This Page's Own Summary */}
                                    <tr className="bg-indigo-50/40">
                                      <td colSpan={2} className="py-2 px-3 text-right text-[10px] uppercase tracking-wider text-indigo-900 font-bold">
                                        Page {pageIdx + 1} Summary (Txn {startTxnNum} - {endTxnNum}):
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                        ₹{pageSummary.received.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                                        ₹{pageSummary.given.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-slate-200 bg-slate-100/60">
                                      <td colSpan={3} className="py-2 px-3 text-right font-bold uppercase text-[10px] text-slate-700">
                                        Page {pageIdx + 1} Net Balance:
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-black text-xs ${
                                        pageSummary.net > 0
                                          ? 'text-rose-600'
                                          : pageSummary.net < 0
                                          ? 'text-emerald-600'
                                          : 'text-slate-800'
                                      }`}>
                                        ₹{Math.abs(pageSummary.net).toLocaleString('en-IN')}
                                        <span className="text-[9px] font-normal block">
                                          {pageSummary.net > 0 ? '(Due to Pay)' : pageSummary.net < 0 ? '(Advance)' : '(Settled)'}
                                        </span>
                                      </td>
                                    </tr>

                                    {/* GRAND TOTAL: Sabhi Pages Ka Combined Total */}
                                    <tr className="border-t-2 border-slate-900 bg-slate-100">
                                      <td colSpan={2} className="py-2.5 px-3 text-right text-[10.5px] uppercase tracking-wider font-black text-slate-900">
                                        Total Summaries (All {statementPages.length} Pages • {activeCustomerTransactions.length} Txns):
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-xs">
                                        ₹{customerTotalReceived.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 text-xs">
                                        ₹{customerTotalGiven.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                    <tr className={`border-t border-slate-300 ${
                                      activeCustomer.outstandingBalance > 0 ? 'bg-rose-50' : 'bg-emerald-50'
                                    }`}>
                                      <td colSpan={3} className="py-2.5 px-3 text-right font-black uppercase text-xs text-slate-900">
                                        Final Net Due Balance (All Pages):
                                      </td>
                                      <td className={`py-2.5 px-3 text-right font-mono font-black text-sm ${
                                        activeCustomer.outstandingBalance > 0
                                          ? 'text-rose-600'
                                          : activeCustomer.outstandingBalance < 0
                                          ? 'text-emerald-600'
                                          : 'text-slate-800'
                                      }`}>
                                        ₹{Math.abs(activeCustomer.outstandingBalance).toLocaleString('en-IN')}
                                        <span className="text-[9.5px] font-bold block">
                                          {activeCustomer.outstandingBalance > 0 ? '(Total Due to Pay)' : activeCustomer.outstandingBalance < 0 ? '(Total Advance)' : '(Settled)'}
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tfoot>
                            </table>
                          </div>

                          {/* Note on intermediate pages */}
                          {!isLastPage && (
                            <div className="text-[10px] text-slate-400 text-right italic pt-1">
                              Continued on Page {pageIdx + 2}...
                            </div>
                          )}
                        </div>

                        {/* Footer Notice & Sign on Last Page (or Single Page) */}
                        {isLastPage && (
                          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
                            <div>
                              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                              <p>This is a certified statement of customer ledger from SmartKhata Pro.</p>
                            </div>
                            <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                              <p className="font-bold text-slate-800 uppercase tracking-wide">
                                {settings.businessName || profile.businessName}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Authorized Signatory</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UNIVERSAL SHARE OPTIONS (Windows / Android / Mac / iPhone) ================= */}
      {isUniversalShareModalOpen && activeCustomer && (() => {
        const modalDueAmount = activeCustomer.outstandingBalance !== 0 
          ? Math.abs(activeCustomer.outstandingBalance) 
          : 3000;
        const modalFormattedDue = formatINR(modalDueAmount);
        const modalBusinessName = (settings.businessName || profile?.businessName || 'Sharma Traders & Enterprise').trim();
        const modalOfficialPhone = (settings.businessPhone || profile?.phone || '8371838314').trim();
        const modalUpiId = (settings.paymentSettings?.upiId || `${modalOfficialPhone}@upi`).trim();
        const modalPayeeName = (settings.paymentSettings?.payeeName || modalBusinessName).trim();
        const modalUpiUri = buildUpiUri(
          modalUpiId,
          modalPayeeName,
          modalDueAmount > 0 ? modalDueAmount : undefined,
          `Payment from ${activeCustomer.name}`
        );
        const modalShareText = `Your balance of ${modalFormattedDue} is Due.\nPlease pay at the earliest.\n—\n${modalBusinessName}  (${modalOfficialPhone})`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Universal Share Options
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeCustomer.name} • <span className="font-bold text-rose-600 dark:text-rose-400">Due: {modalFormattedDue}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUniversalShareModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 space-y-4 overflow-y-auto">
                
                {/* Reminder Preview Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Message Preview</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">⚡ Ready to Share</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-sans whitespace-pre-line leading-relaxed shadow-xs">
                    {modalShareText}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5 font-mono">
                    <span>UPI ID: <strong className="text-slate-800 dark:text-white">{modalUpiId}</strong></span>
                    <span>Payee: <strong className="text-slate-800 dark:text-white">{modalPayeeName}</strong></span>
                  </div>
                </div>

                {/* Share Channels Heading */}
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                  Choose Share Channel (All Devices)
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* 1. WhatsApp (Direct Intent / Web + QR Image) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleShareWhatsApp();
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-emerald-600 text-white text-[9px] font-bold">Fast</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Direct chat send with QR card & due text
                      </p>
                    </div>
                  </button>

                  {/* 2. Device Native Share (All Apps: Android / iOS / Mac / Win) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleUniversalShare();
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">System Share</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-bold">All Apps</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Phone / OS native sheet (Telegram, Drive, etc.)
                      </p>
                    </div>
                  </button>

                  {/* 3. SMS / Text Message */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSendSms(activeCustomer.phone, modalShareText);
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-950/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">SMS / Messages</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Open default SMS app with prefilled text
                      </p>
                    </div>
                  </button>

                  {/* 4. Email Reminder */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSendEmail(
                        activeCustomer.email || '',
                        `Payment Due Reminder - ${activeCustomer.name}`,
                        modalShareText
                      );
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Email</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Send via Outlook, Gmail, or Apple Mail
                      </p>
                    </div>
                  </button>

                  {/* 5. Download Payment QR Card */}
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadQrCard();
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Download QR Card</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Official scannable PNG image card
                      </p>
                    </div>
                  </button>

                  {/* 6. Copy Message Text */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyShareText(modalShareText);
                      setIsUniversalShareModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Copy Message</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Copy reminder text to clipboard
                      </p>
                    </div>
                  </button>

                </div>

                {/* Copy UPI Link Row */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Direct UPI Link</div>
                    <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 truncate">
                      {modalUpiUri}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyUpiUri(modalUpiUri)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI Link</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Global CSS for Clean PDF Printing */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Hide everything except printable due bill if printed directly from window */
          body > * {
            visibility: hidden;
          }
          .statement-modal-wrapper,
          .statement-modal-wrapper * {
            visibility: visible;
          }
          .statement-modal-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-due-bill {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            margin: 0 auto !important;
            padding: 16px !important;
          }
        }
      `}</style>

    </div>
  );
}

export default function KhataPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-400">Loading SmartKhata...</div>}>
      <KhataPageInner />
    </Suspense>
  );
}
