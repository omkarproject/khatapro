'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, openWhatsApp } from '@/lib/utils';
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

  // Auto-schedule payment reminders for any unpaid invoices
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;
    invoices.forEach((inv) => {
      const remId = `rem_inv_${inv.id}`;
      if (inv.status === 'paid') {
        const existing = reminders.find((r) => r.id === remId);
        if (existing && existing.status !== 'sent') {
          deleteReminder(remId);
        }
      } else {
        const alreadyExists = reminders.some(
          (r) =>
            r.id === remId ||
            (r.customerId === inv.customerId &&
              r.amount === inv.total &&
              r.dueDate === inv.dueDate)
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
  }, [invoices, reminders, customers, todayStr, saveReminder, deleteReminder]);

  const overdueCount = reminders.filter(r => (r.dueDate ? r.dueDate < todayStr : r.reminderType === 'overdue')).length;
  const upcomingCount = reminders.filter(r => (r.dueDate ? r.dueDate >= todayStr : r.reminderType !== 'overdue')).length;

  const filteredReminders = reminders.filter(r => {
    const isPastDue = r.dueDate ? r.dueDate < todayStr : r.reminderType === 'overdue';
    if (filter === 'overdue') return isPastDue;
    if (filter === 'upcoming') return !isPastDue;
    return true;
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Reminder
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All Follow-ups ({reminders.length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
            filter === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
            filter === 'upcoming'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Upcoming Due ({upcomingCount})
        </button>
      </div>

      {/* Reminders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReminders.map((rem) => {
          const isPastDue = rem.dueDate ? rem.dueDate < todayStr : rem.reminderType === 'overdue';
          const isDueToday = rem.dueDate ? rem.dueDate === todayStr : false;
          const statusBadge = isPastDue
            ? { text: 'OVERDUE', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' }
            : isDueToday
            ? { text: 'DUE TODAY', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' }
            : { text: 'UPCOMING', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' };

          return (
            <div
              key={rem.id}
              className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {rem.customerName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {rem.customerPhone}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadge.cls}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Amount Due</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      {formatINR(rem.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <span>Due Date</span>
                    <span className="font-mono">{formatDate(rem.dueDate)}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                  &ldquo;{rem.messageTemplate}&rdquo;
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  {rem.status === 'sent' ? `Sent: ${formatDate(rem.sentAt || '')}` : 'Pending Send'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      openCollectModal({
                        customerId: rem.customerId,
                        customerName: rem.customerName,
                        amount: rem.amount,
                        note: `Settlement against reminder`,
                      })
                    }
                    className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                    title="Collect UPI"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(rem)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete reminder for ${rem.customerName}?`)) {
                        deleteReminder(rem.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Reminder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
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
