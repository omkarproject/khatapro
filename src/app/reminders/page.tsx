'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, openWhatsApp } from '@/lib/utils';
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
  QrCode
} from 'lucide-react';

export default function RemindersPage() {
  const { reminders, saveReminder, customers, settings, addToast, openCollectModal } = useApp();

  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderType, setReminderType] = useState<'upcoming' | 'overdue' | 'custom'>('overdue');
  const [messageTemplate, setMessageTemplate] = useState(
    'Friendly reminder regarding your pending balance. Kindly pay via UPI to keep your ledger up to date. Thank you!'
  );

  const filteredReminders = reminders.filter(r => {
    if (filter === 'overdue') return r.reminderType === 'overdue';
    if (filter === 'upcoming') return r.reminderType === 'upcoming';
    return true;
  });

  const handleSendWhatsApp = (rem: PaymentReminder) => {
    const upiUri = buildUpiUri(settings.paymentSettings.upiId, settings.paymentSettings.payeeName, rem.amount, `Reminder ${rem.id}`);
    const fullMsg = `${rem.messageTemplate}\n\n*Pay Now via UPI:*\n${upiUri}\n\nThank you,\n${settings.businessName}`;
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

    const newRem: PaymentReminder = {
      id: `rem_${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerEmail: cust.email,
      amount: parseFloat(amount) || cust.outstandingBalance || 1000,
      dueDate,
      reminderType,
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
          Overdue
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
          Upcoming Due
        </button>
      </div>

      {/* Reminders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReminders.map((rem) => {
          const isOverdue = rem.reminderType === 'overdue';

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
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isOverdue
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                  >
                    {rem.reminderType}
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
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 shadow-sm shadow-emerald-500/20 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
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
                      {c.name} (Due: ₹{c.outstandingBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Amount (₹) *
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
