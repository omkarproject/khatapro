'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, openWhatsApp, isInvoicePaid } from '@/lib/utils';
import { StorageService } from '@/services/storage';
import { getActiveCurrency, t } from '@/lib/i18n';
import { PaymentReminder } from '@/types';
import {
  BellRing,
  Plus,
  Share2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Mail,
  Smartphone,
  X,
  Send,
  Sparkles,
  QrCode,
  Trash2,
  Search,
} from 'lucide-react';

export default function RemindersPage() {
  const {
    reminders,
    saveReminder,
    deleteReminder,
    customers,
    settings,
    addToast,
    openCollectModal,
    activeCurrency,
    activeLanguage,
    invoices,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [reminderType, setReminderType] = useState<'upcoming' | 'overdue' | 'custom'>('upcoming');
  const [messageTemplate, setMessageTemplate] = useState(
    'Friendly reminder regarding your pending balance. Kindly pay via UPI to keep your ledger up to date. Thank you!'
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-schedule payment reminders for any unpaid invoices & clean up paid/settled ones
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;
    invoices.forEach((inv) => {
      const remId = `rem_inv_${inv.id}`;
      const isPaid = isInvoicePaid(inv);

      if (isPaid) {
        // Find and remove ANY scheduled reminder for this paid invoice
        const toDelete = reminders.filter(
          (r) =>
            r.id === remId ||
            r.id === `rem_inv_${inv.invoiceNumber}` ||
            (inv.invoiceNumber && (r.note?.includes(inv.invoiceNumber) || r.messageTemplate?.includes(inv.invoiceNumber))) ||
            (r.customerId === inv.customerId && r.amount === inv.total)
        );
        toDelete.forEach((r) => {
          deleteReminder(r.id);
        });
      } else {
        // Unpaid invoice: check if user already dismissed or deleted this reminder
        const isDismissed =
          (typeof window !== 'undefined' &&
            (localStorage.getItem(`skp_dismissed_reminder_${remId}`) === 'true' ||
              (inv.invoiceNumber && localStorage.getItem(`skp_dismissed_reminder_${inv.invoiceNumber}`) === 'true'))) ||
          StorageService.getDeletedRecordIds('reminders').has(remId);

        if (isDismissed) return;

        const alreadyExists = reminders.some(
          (r) =>
            r.id === remId ||
            r.id === `rem_inv_${inv.invoiceNumber}` ||
            (inv.invoiceNumber && (r.note?.includes(inv.invoiceNumber) || r.messageTemplate?.includes(inv.invoiceNumber)))
        );
        if (!alreadyExists) {
          const cust = customers.find((c) => c.id === inv.customerId);
          const d = new Date(inv.dueDate);
          const formattedDueDate = isNaN(d.getTime())
            ? inv.dueDate
            : `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
          const newRem: PaymentReminder = {
            id: remId,
            customerId: inv.customerId,
            customerName: inv.customerName || cust?.name || 'Customer',
            customerPhone: inv.customerPhone || cust?.phone || '',
            customerEmail: (inv as any).customerEmail || cust?.email || '',
            amount: inv.total,
            dueDate: inv.dueDate,
            reminderType: inv.dueDate < todayStr ? 'overdue' : 'upcoming',
            channels: ['whatsapp', 'sms'],
            status: 'scheduled',
            messageTemplate: `Payment reminder for Tax Invoice #${inv.invoiceNumber} of ₹${inv.total}. Due Date: ${formattedDueDate}. Kindly settle to keep your ledger up to date. Thank you!`,
            note: `Tax Invoice #${inv.invoiceNumber} (${formattedDueDate})`,
          };
          saveReminder(newRem);
        }
      }
    });

    // Auto-clean reminders for customers that are fully settled in KhataBook with no pending unpaid invoices
    if (customers && customers.length > 0) {
      customers.forEach((cust) => {
        const normPhone = cust.phone ? cust.phone.replace(/\D/g, '').slice(-10) : '';
        const hasUnpaidInvoice = invoices.some(
          (i) =>
            (i.customerId === cust.id || (normPhone && i.customerPhone && i.customerPhone.replace(/\D/g, '').slice(-10) === normPhone)) &&
            !isInvoicePaid(i)
        );
        if (cust.outstandingBalance <= 0 && !hasUnpaidInvoice) {
          const settledReminders = reminders.filter(
            (r) =>
              r.customerId === cust.id ||
              (normPhone && r.customerPhone && r.customerPhone.replace(/\D/g, '').slice(-10) === normPhone)
          );
          settledReminders.forEach((r) => {
            deleteReminder(r.id);
          });
        }
      });
    }
  }, [invoices, reminders, customers, todayStr, saveReminder, deleteReminder]);

  const handleDeleteReminder = (rem: PaymentReminder) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`skp_dismissed_reminder_${rem.id}`, 'true');
      if (rem.id.startsWith('rem_inv_')) {
        localStorage.setItem(`skp_dismissed_reminder_${rem.id.replace('rem_inv_', '')}`, 'true');
      }
      const matchInvNo = rem.note?.match(/#(SKP\/[0-9]+\/[0-9]+)/i) || rem.messageTemplate?.match(/#(SKP\/[0-9]+\/[0-9]+)/i);
      if (matchInvNo?.[1]) {
        localStorage.setItem(`skp_dismissed_reminder_${matchInvNo[1]}`, 'true');
      }
    }
    deleteReminder(rem.id);
  };

  const activeReminders = React.useMemo(() => {
    return reminders.filter((r) => {
      // 1. If linked invoice is paid, hide immediately
      const linkedInvoice = invoices.find(
        (i) =>
          r.id === `rem_inv_${i.id}` ||
          r.id === `rem_inv_${i.invoiceNumber}` ||
          (i.invoiceNumber && (r.note?.includes(i.invoiceNumber) || r.messageTemplate?.includes(i.invoiceNumber)))
      );
      if (linkedInvoice && isInvoicePaid(linkedInvoice)) return false;

      // 2. If any paid invoice matches this customer and amount, and there are no unpaid invoices for that amount
      const matchingPaidInvoice = invoices.find(
        (i) =>
          (i.customerId === r.customerId ||
            (r.customerPhone && i.customerPhone && i.customerPhone.replace(/\D/g, '').slice(-10) === r.customerPhone.replace(/\D/g, '').slice(-10))) &&
          Number(i.total) === Number(r.amount) &&
          isInvoicePaid(i)
      );
      if (matchingPaidInvoice) {
        const hasUnpaidSameAmount = invoices.some(
          (i) =>
            (i.customerId === r.customerId ||
              (r.customerPhone && i.customerPhone && i.customerPhone.replace(/\D/g, '').slice(-10) === r.customerPhone.replace(/\D/g, '').slice(-10))) &&
            Number(i.total) === Number(r.amount) &&
            !isInvoicePaid(i)
        );
        if (!hasUnpaidSameAmount) return false;
      }

      // 3. If customer's Digital KhataBook balance is SETTLED (<= 0) and has no unpaid invoices
      const cust = customers.find(
        (c) =>
          c.id === r.customerId ||
          (r.customerPhone && c.phone && c.phone.replace(/\D/g, '').slice(-10) === r.customerPhone.replace(/\D/g, '').slice(-10))
      );
      if (cust && cust.outstandingBalance <= 0) {
        const normPhone = cust.phone ? cust.phone.replace(/\D/g, '').slice(-10) : '';
        const hasPendingUnpaid = invoices.some(
          (i) =>
            (i.customerId === cust.id || (normPhone && i.customerPhone && i.customerPhone.replace(/\D/g, '').slice(-10) === normPhone)) &&
            !isInvoicePaid(i)
        );
        if (!hasPendingUnpaid) return false;
      }

      // 4. If manually deleted/dismissed, hide immediately
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(`skp_dismissed_reminder_${r.id}`) === 'true') return false;
      }
      if (StorageService.getDeletedRecordIds('reminders').has(r.id)) return false;

      return true;
    });
  }, [reminders, invoices, customers]);

  const overdueCount = activeReminders.filter(r => (r.dueDate ? r.dueDate < todayStr : r.reminderType === 'overdue')).length;
  const upcomingCount = activeReminders.filter(r => (r.dueDate ? r.dueDate >= todayStr : r.reminderType !== 'overdue')).length;

  const filteredReminders = activeReminders.filter(r => {
    const isPastDue = r.dueDate ? r.dueDate < todayStr : r.reminderType === 'overdue';
    if (filter === 'overdue') return isPastDue;
    if (filter === 'upcoming') return !isPastDue;
    return true;
  });

  const searchedReminders = filteredReminders.filter((rem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      rem.customerName?.toLowerCase().includes(q) ||
      rem.customerPhone?.toLowerCase().includes(q) ||
      rem.messageTemplate?.toLowerCase().includes(q) ||
      rem.note?.toLowerCase().includes(q) ||
      rem.amount?.toString().includes(q)
    );
  });

  const handleSendWhatsApp = (rem: PaymentReminder) => {
    const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smartkhata.netsell.in';
    const tempPayId = Math.floor(Date.now() / 1000).toString();
    const shortPayUrl = `${appBaseUrl}/pay/${encodeURIComponent(rem.customerId)}/${tempPayId}`;
    const upiUri = buildUpiUri(settings.paymentSettings.upiId, settings.paymentSettings.payeeName, rem.amount, `Reminder ${rem.id}`);
    const fullMsg = `${rem.messageTemplate}\n\n👉 *Online Pay (Auto Settled)*:\n${shortPayUrl}\n\n⚡ *Direct UPI Link*:\n${upiUri}\n\nThank you,\n${settings.businessName}`;
    openWhatsApp(rem.customerPhone, fullMsg);

    // Mark as sent
    saveReminder({
      ...rem,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
    addToast('Reminder Sent', `WhatsApp message opened for ${rem.customerName}.`, 'success');
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    const computedType = reminderType === 'custom' ? 'custom' : (dueDate < todayStr ? 'overdue' : 'upcoming');
    const newRem: PaymentReminder = {
      id: `rem_${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerEmail: cust.email,
      amount: parseFloat(amount) || cust.outstandingBalance || 1000,
      dueDate,
      reminderType: computedType,
      channels: ['whatsapp', 'sms'],
      status: 'pending',
      messageTemplate,
    };

    saveReminder(newRem);
    setIsModalOpen(false);
    setAmount('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Payment Follow-up & Reminders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated WhatsApp and SMS payment follow-ups with embedded zero-fee UPI payment links
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm hover:shadow-md active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Reminder
        </button>
      </div>

      {/* Top Controls: Filter Tabs & Search Box */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            All Follow-ups ({activeReminders.length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:bg-rose-50/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'upcoming'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Upcoming Due ({upcomingCount})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px] max-w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, phone, note, amount..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reminders Cards Grid (50% Compact, Small Corner Curves, Hover Lift Cursor Effect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {searchedReminders.map((rem) => {
          const isPastDue = rem.dueDate ? rem.dueDate < todayStr : rem.reminderType === 'overdue';
          const isDueToday = rem.dueDate ? rem.dueDate === todayStr : false;
          const statusBadge = isPastDue
            ? { text: 'OVERDUE', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40' }
            : isDueToday
            ? { text: 'DUE TODAY', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40' }
            : { text: 'UPCOMING', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40' };

          return (
            <div
              key={rem.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {rem.customerName}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {rem.customerPhone || 'No phone'}
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0 ${statusBadge.cls}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-none">Amount Due</span>
                    <span className="font-mono font-bold text-rose-600 text-xs">
                      {formatINR(rem.amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block leading-none">Due Date</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      {formatDate(rem.dueDate)}
                    </span>
                  </div>
                </div>

                {rem.messageTemplate && (
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 italic line-clamp-2 leading-relaxed">
                    &ldquo;{rem.messageTemplate}&rdquo;
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[85px]">
                  {rem.status === 'sent' ? `Sent: ${formatDate(rem.sentAt || '')}` : 'Pending Send'}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCollectModal({
                        customerId: rem.customerId,
                        customerName: rem.customerName,
                        amount: rem.amount,
                        note: `Settlement against reminder`,
                      });
                    }}
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                    title="Collect UPI"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendWhatsApp(rem);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Share2 className="w-3 h-3" />
                    WhatsApp
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReminder(rem);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {searchedReminders.length === 0 && (
          <div className="col-span-full text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {searchQuery ? `No reminders match "${searchQuery}"` : 'No reminders found'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Clear search query
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Reminder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-indigo-500" />
                Schedule Payment Reminder
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const c = customers.find(item => item.id === e.target.value);
                    if (c && c.outstandingBalance > 0) {
                      setAmount(c.outstandingBalance.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: {formatINR(c.outstandingBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('amount', 'Amount')} ({getActiveCurrency().symbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Reminder Message Template
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
