'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { SavingsGoal, SavingsDeposit } from '@/types';
import {
  PiggyBank,
  Plus,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
  History,
  Paperclip,
  Eye,
  Download,
  Bell,
  Clock,
  FileText,
  Upload,
  FileCheck,
  Image as ImageIcon
} from 'lucide-react';

interface ReminderStatus {
  status: 'due' | 'upcoming' | 'paid_this_month' | 'expired';
  targetDay: number;
  dueDateThisMonth: string;
  message: string;
  daysRemaining?: number;
  depositFound?: boolean;
}

function getDaySuffix(d: number): string {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function getGoalReminderStatus(goal: SavingsGoal): ReminderStatus {
  if (!goal.deadline) {
    return { status: 'expired', targetDay: 1, dueDateThisMonth: '', message: 'No target date set' };
  }

  const now = new Date();
  const todayDay = now.getDate();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();

  // Parse YYYY-MM-DD
  const parts = goal.deadline.split('-');
  const deadYear = parseInt(parts[0], 10);
  const deadMonth = parseInt(parts[1], 10) - 1;
  const targetDay = parseInt(parts[2], 10) || 1;

  const deadlineDate = new Date(deadYear, deadMonth, targetDay, 23, 59, 59);

  // If deadline in the past, no reminder
  if (now.getTime() > deadlineDate.getTime()) {
    return {
      status: 'expired',
      targetDay,
      dueDateThisMonth: '',
      message: `Target reached (${formatDate(goal.deadline)})`,
    };
  }

  // Check if funds were already added in current calendar month
  const hasDepositedCurrentMonth = goal.deposits?.some((dep) => {
    if (!dep.date && !dep.createdAt) return false;
    const depDate = new Date(dep.date || dep.createdAt);
    return depDate.getFullYear() === todayYear && depDate.getMonth() === todayMonth;
  });

  const maxDaysThisMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
  const effectiveDay = Math.min(targetDay, maxDaysThisMonth);
  const dueDateThisMonthObj = new Date(todayYear, todayMonth, effectiveDay);
  const dueDateThisMonthStr = dueDateThisMonthObj.toISOString().split('T')[0];

  if (hasDepositedCurrentMonth) {
    const nextMonth = (todayMonth + 1) % 12;
    const nextYear = todayMonth === 11 ? todayYear + 1 : todayYear;
    const nextMonthName = new Date(nextYear, nextMonth, 1).toLocaleString('default', { month: 'short' });
    return {
      status: 'paid_this_month',
      targetDay,
      dueDateThisMonth: dueDateThisMonthStr,
      message: `✓ Added this month • Next reminder: ${String(targetDay).padStart(2, '0')} ${nextMonthName}`,
      depositFound: true,
    };
  }

  if (todayDay >= effectiveDay) {
    return {
      status: 'due',
      targetDay,
      dueDateThisMonth: dueDateThisMonthStr,
      message: `Monthly Deposit Due (${effectiveDay}${getDaySuffix(effectiveDay)} of each month)`,
      depositFound: false,
    };
  } else {
    const daysLeft = effectiveDay - todayDay;
    return {
      status: 'upcoming',
      targetDay,
      dueDateThisMonth: dueDateThisMonthStr,
      daysRemaining: daysLeft,
      message: `Next reminder on ${String(effectiveDay).padStart(2, '0')} this month (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`,
      depositFound: false,
    };
  }
}

export default function SavingsPage() {
  const { savingsGoals, saveSavingsGoal, deleteSavingsGoal, addToast } = useApp();

  // Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);

  // Form State: Create/Edit Goal
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState<'Emergency Fund' | 'Business Expansion' | 'Tax Reserve' | 'Equipment' | 'Personal'>('Emergency Fund');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [goalDocUrl, setGoalDocUrl] = useState<string | null>(null);
  const [goalDocName, setGoalDocName] = useState('');
  const [goalDocType, setGoalDocType] = useState('');
  const goalFileInputRef = useRef<HTMLInputElement>(null);

  // Form State: Add Deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNote, setDepositNote] = useState('');
  const [depositReceiptUrl, setDepositReceiptUrl] = useState<string | null>(null);
  const [depositReceiptName, setDepositReceiptName] = useState('');
  const [depositReceiptType, setDepositReceiptType] = useState('');
  const depositFileInputRef = useRef<HTMLInputElement>(null);

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Process File helper (Image or PDF up to 25MB)
  const processUploadedFile = (file: File, onSuccess: (url: string, name: string, type: string) => void) => {
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
      onSuccess(result, file.name, type);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setCategory('Emergency Fund');
    setDeadline(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNotes('');
    setGoalDocUrl(null);
    setGoalDocName('');
    setGoalDocType('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setCategory(goal.category as any);
    setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
    setNotes(goal.notes || '');
    setGoalDocUrl(goal.documentUrl || null);
    setGoalDocName(goal.documentName || '');
    setGoalDocType(goal.documentType || '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const tAmt = parseFloat(targetAmount);
    if (!tAmt || tAmt <= 0) {
      addToast('Invalid Target', 'Please enter a target amount.', 'error');
      return;
    }

    if (editingGoal) {
      const updatedGoal: SavingsGoal = {
        ...editingGoal,
        title: title.trim(),
        targetAmount: tAmt,
        currentAmount: parseFloat(currentAmount) || 0,
        category,
        deadline,
        notes: notes.trim(),
        documentUrl: goalDocUrl || undefined,
        documentName: goalDocName || undefined,
        documentType: goalDocType || undefined,
      };

      saveSavingsGoal(updatedGoal);
      addToast('Fund Updated', `${updatedGoal.title} has been updated successfully.`, 'success');
    } else {
      const initialAmt = parseFloat(currentAmount) || 0;
      const initialDeposits: SavingsDeposit[] = [];
      if (initialAmt > 0) {
        initialDeposits.push({
          id: `dep_init_${Date.now()}`,
          amount: initialAmt,
          date: new Date().toISOString().split('T')[0],
          notes: 'Initial Reserve Deposit',
          createdAt: new Date().toISOString(),
        });
      }

      const newGoal: SavingsGoal = {
        id: `goal_${Date.now()}`,
        title: title.trim(),
        targetAmount: tAmt,
        currentAmount: initialAmt,
        category,
        deadline,
        notes: notes.trim(),
        documentUrl: goalDocUrl || undefined,
        documentName: goalDocName || undefined,
        documentType: goalDocType || undefined,
        deposits: initialDeposits,
        createdAt: new Date().toISOString(),
      };

      saveSavingsGoal(newGoal);
      addToast('Fund Created', `${newGoal.title} reserve fund created.`, 'success');
    }

    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleConfirmDelete = () => {
    if (!goalToDelete) return;
    deleteSavingsGoal(goalToDelete.id);
    addToast('Fund Deleted', `${goalToDelete.title} has been removed from reserve funds.`, 'info');
    if (historyGoal?.id === goalToDelete.id) {
      setHistoryGoal(null);
    }
    setGoalToDelete(null);
  };

  const handleOpenDepositModal = (goal: SavingsGoal) => {
    setActiveGoal(goal);
    setDepositAmount('');
    setDepositDate(new Date().toISOString().split('T')[0]);
    setDepositNote('');
    setDepositReceiptUrl(null);
    setDepositReceiptName('');
    setDepositReceiptType('');
    setIsDepositModalOpen(true);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const dep = parseFloat(depositAmount);
    if (!dep || dep <= 0) {
      addToast('Invalid Deposit', 'Enter a valid amount to add.', 'error');
      return;
    }

    const newDeposit: SavingsDeposit = {
      id: `dep_${Date.now()}`,
      amount: dep,
      date: depositDate || new Date().toISOString().split('T')[0],
      notes: depositNote.trim() || undefined,
      receiptUrl: depositReceiptUrl || undefined,
      receiptName: depositReceiptName || undefined,
      receiptType: depositReceiptType || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated: SavingsGoal = {
      ...activeGoal,
      currentAmount: activeGoal.currentAmount + dep,
      deposits: [newDeposit, ...(activeGoal.deposits || [])],
    };

    saveSavingsGoal(updated);
    if (historyGoal?.id === updated.id) {
      setHistoryGoal(updated);
    }
    setIsDepositModalOpen(false);
    setDepositAmount('');
    setDepositNote('');
    setDepositReceiptUrl(null);
    addToast('Funds Added', `Added ${formatINR(dep)} to ${activeGoal.title}.`, 'success');
  };

  const handleDownloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Find all goals due for monthly reminder
  const dueGoals = savingsGoals.filter((g) => getGoalReminderStatus(g).status === 'due');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <PiggyBank className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Savings & Reserve Funds
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated emergency funds, capital expansion goals, advance tax reserves, and business cushions
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </div>

      {/* Monthly Reminder Alert Banner (if any goals are due this month) */}
      {dueGoals.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Monthly Savings Reminder ({dueGoals.length} {dueGoals.length === 1 ? 'fund' : 'funds'} due for deposit)
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {dueGoals.map((g) => {
                  const rem = getGoalReminderStatus(g);
                  return `${g.title} (due on ${rem.targetDay}${getDaySuffix(rem.targetDay)} of each month)`;
                }).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenDepositModal(dueGoals[0])}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto text-center cursor-pointer"
          >
            Add Funds Now
          </button>
        </div>
      )}

      {/* Overview Banner Card */}
      <div className="glass-card p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-indigo-500/10 to-cyan-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Total Accumulated Business Reserves
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
            {formatINR(totalSaved)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target Reserve: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatINR(totalTarget)}</span> ({overallProgress}% Achieved)
          </p>
        </div>

        {/* Circular Progress Display */}
        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-500">Capital Buffer</span>
            <span className="text-emerald-600 font-mono">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 text-right">
            Remaining to save: {formatINR(Math.max(0, totalTarget - totalSaved))}
          </div>
        </div>
      </div>

      {/* Goals Grid or Empty State */}
      {savingsGoals.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PiggyBank className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            No Savings & Reserve Funds Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Create an Emergency Fund, Tax Reserve, or Capital Expansion fund to protect and grow your business liquidity.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Fund
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsGoals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const reminder = getGoalReminderStatus(goal);

            return (
              <div
                key={goal.id}
                className="glass-card p-6 space-y-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all relative group"
              >
                <div>
                  {/* Top Bar: Icon, Category Badge & Action Icons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate">
                        {goal.category}
                      </span>
                      {goal.documentUrl && (
                        <button
                          onClick={() =>
                            setPreviewFile({
                              url: goal.documentUrl!,
                              name: goal.documentName || `${goal.title}_Doc`,
                              type: goal.documentType || 'file',
                            })
                          }
                          title={`View Attached Document: ${goal.documentName || 'File'}`}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="hidden sm:inline">Doc</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Action Icons: History, Edit, Delete next to Category */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setHistoryGoal(goal)}
                        title="Deposit History & Receipts"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        title="Edit Fund"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGoalToDelete(goal)}
                        title="Delete Fund"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {goal.title}
                    </h3>
                    {goal.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  {/* Amounts & Progress Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                        {formatINR(goal.currentAmount)}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        of {formatINR(goal.targetAmount)}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{progress}% Completed</span>
                      <span>Target: {formatDate(goal.deadline)}</span>
                    </div>
                  </div>

                  {/* Monthly Reminder Status Pill */}
                  <div className="mt-3.5">
                    {reminder.status === 'due' && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                          <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" />
                          <span>Deposit Due ({reminder.targetDay}{getDaySuffix(reminder.targetDay)} of month)</span>
                        </div>
                        <button
                          onClick={() => handleOpenDepositModal(goal)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                        >
                          Deposit
                        </button>
                      </div>
                    )}

                    {reminder.status === 'paid_this_month' && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{reminder.message}</span>
                      </div>
                    )}

                    {reminder.status === 'upcoming' && (
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{reminder.message}</span>
                      </div>
                    )}

                    {reminder.status === 'expired' && (
                      <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-[11px] text-slate-400">
                        <span>{reminder.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Add Funds button right aligned */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setHistoryGoal(goal)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    History ({goal.deposits?.length || (goal.currentAmount > 0 ? 1 : 0)})
                  </button>

                  <button
                    onClick={() => handleOpenDepositModal(goal)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Funds
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {editingGoal ? (
                  <>
                    <Pencil className="w-5 h-5 text-indigo-500" />
                    Edit Reserve Fund
                  </>
                ) : (
                  <>
                    <PiggyBank className="w-5 h-5 text-emerald-500" />
                    New Savings Goal
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingGoal(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Delivery Vehicle Fund"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {editingGoal ? 'Current Saved (₹)' : 'Initial Deposit (₹)'}
                  </label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Emergency Fund">Emergency Fund</option>
                    <option value="Business Expansion">Business Expansion</option>
                    <option value="Tax Reserve">Tax Reserve</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Monthly reminder will trigger on day <strong>{deadline ? deadline.split('-')[2] : '1'}</strong> of every month until the target date.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Where funds are parked (e.g. Liquid FD, Auto-Sweep)..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attach Images/PDF Option next to / below Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    Attach Document / Image / PDF (Optional)
                  </span>
                  {goalDocUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setGoalDocUrl(null);
                        setGoalDocName('');
                        setGoalDocType('');
                      }}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </label>

                <input
                  ref={goalFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0], (url, name, type) => {
                        setGoalDocUrl(url);
                        setGoalDocName(name);
                        setGoalDocType(type);
                      });
                    }
                  }}
                />

                {goalDocUrl ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-400 dark:border-emerald-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {goalDocType === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{goalDocName}</div>
                        <div className="text-[10px] text-emerald-600 uppercase font-semibold">{goalDocType} Attached</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: goalDocUrl, name: goalDocName, type: goalDocType })}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => goalFileInputRef.current?.click()}
                    className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-indigo-600"
                  >
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Click to attach FD certificate, agreement, image or PDF</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingGoal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingGoal ? 'Update Fund' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Funds to Goal */}
      {isDepositModalOpen && activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Add Funds to Goal
              </h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Depositing towards: <strong className="text-slate-800 dark:text-slate-200">{activeGoal.title}</strong>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deposit Date *
                </label>
                <input
                  type="date"
                  required
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Note / Reference
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="e.g. Monthly transfer, UPI ref, etc."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attach Images/PDF Receipt for this Deposit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    Attach Receipt / Proof (Image / PDF)
                  </span>
                  {depositReceiptUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setDepositReceiptUrl(null);
                        setDepositReceiptName('');
                        setDepositReceiptType('');
                      }}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </label>

                <input
                  ref={depositFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0], (url, name, type) => {
                        setDepositReceiptUrl(url);
                        setDepositReceiptName(name);
                        setDepositReceiptType(type);
                      });
                    }
                  }}
                />

                {depositReceiptUrl ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-400 dark:border-emerald-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {depositReceiptType === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{depositReceiptName}</div>
                        <div className="text-[9px] text-emerald-600 uppercase font-semibold">{depositReceiptType} Attached</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewFile({ url: depositReceiptUrl, name: depositReceiptName, type: depositReceiptType })}
                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => depositFileInputRef.current?.click()}
                    className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-[11px] text-slate-500 hover:text-indigo-600"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Attach Deposit Receipt or PDF</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deposit History */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Deposit History
                  </h3>
                  <p className="text-xs text-slate-400">{historyGoal.title}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryGoal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Goal Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Current Saved</div>
                <div className="text-base font-bold font-mono text-emerald-600">{formatINR(historyGoal.currentAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Target Goal</div>
                <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">{formatINR(historyGoal.targetAmount)}</div>
              </div>
            </div>

            {/* Attached Goal Document (if any) */}
            {historyGoal.documentUrl && (
              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Goal Document: {historyGoal.documentName || 'Attached File'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewFile({
                      url: historyGoal.documentUrl!,
                      name: historyGoal.documentName || `${historyGoal.title}_Doc`,
                      type: historyGoal.documentType || 'file',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
            )}

            {/* Deposits List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {(!historyGoal.deposits || historyGoal.deposits.length === 0) ? (
                historyGoal.currentAmount > 0 ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Initial Reserve Fund</div>
                      <div className="text-[10px] text-slate-400">{formatDate(historyGoal.createdAt)}</div>
                    </div>
                    <div className="text-sm font-black font-mono text-emerald-600">
                      +{formatINR(historyGoal.currentAmount)}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No deposit entries recorded yet.
                  </div>
                )
              ) : (
                historyGoal.deposits.map((dep, idx) => (
                  <div
                    key={dep.id || idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          +{formatINR(dep.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(dep.date || dep.createdAt)}
                        </span>
                      </div>
                      {dep.notes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {dep.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {dep.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              url: dep.receiptUrl!,
                              name: dep.receiptName || `Receipt_${formatDate(dep.date)}`,
                              type: dep.receiptType || 'file',
                            })
                          }
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Preview Receipt / PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No receipt</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = historyGoal;
                  setHistoryGoal(null);
                  handleOpenDepositModal(target);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add More Funds
              </button>

              <button
                type="button"
                onClick={() => setHistoryGoal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Document / Image / PDF Preview */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px]">
              {previewFile.url.startsWith('data:application/pdf') || previewFile.type === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[65vh] border-0 rounded-2xl"
                />
              ) : previewFile.url.startsWith('data:image/') || previewFile.type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
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
                {previewFile.type} Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile.url, previewFile.name)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Goal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Reserve Fund</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to delete this fund?</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">{goalToDelete.title}</div>
              <div className="text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Category: {goalToDelete.category}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatINR(goalToDelete.currentAmount)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This will remove the reserve fund record from your cloud and local storage. This action cannot be undone.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Fund
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
