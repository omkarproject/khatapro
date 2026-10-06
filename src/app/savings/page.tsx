'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { SavingsGoal } from '@/types';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  ShieldCheck,
  Target,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function SavingsPage() {
  const { savingsGoals, saveSavingsGoal, deleteSavingsGoal, addToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState<'Emergency Fund' | 'Business Expansion' | 'Tax Reserve' | 'Equipment' | 'Personal'>('Emergency Fund');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setCategory('Emergency Fund');
    setDeadline(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNotes('');
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
      };

      saveSavingsGoal(updatedGoal);
      addToast('Fund Updated', `${updatedGoal.title} has been updated successfully.`, 'success');
    } else {
      const newGoal: SavingsGoal = {
        id: `goal_${Date.now()}`,
        title: title.trim(),
        targetAmount: tAmt,
        currentAmount: parseFloat(currentAmount) || 0,
        category,
        deadline,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      saveSavingsGoal(newGoal);
      addToast('Fund Created', `${newGoal.title} reserve fund created.`, 'success');
    }

    setIsModalOpen(false);
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setNotes('');
  };

  const handleConfirmDelete = () => {
    if (!goalToDelete) return;
    deleteSavingsGoal(goalToDelete.id);
    addToast('Fund Deleted', `${goalToDelete.title} has been removed from reserve funds.`, 'info');
    setGoalToDelete(null);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const dep = parseFloat(depositAmount);
    if (!dep || dep <= 0) {
      addToast('Invalid Deposit', 'Enter a valid amount to add.', 'error');
      return;
    }

    const updated: SavingsGoal = {
      ...activeGoal,
      currentAmount: activeGoal.currentAmount + dep,
    };

    saveSavingsGoal(updated);
    setIsDepositModalOpen(false);
    setDepositAmount('');
    addToast('Funds Added', `Added ${formatINR(dep)} to ${activeGoal.title}.`, 'success');
  };

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </div>

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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create First Fund
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsGoals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

            return (
              <div
                key={goal.id}
                className="glass-card p-6 space-y-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate">
                        {goal.category}
                      </span>
                    </div>

                    {/* Quick Action Icons next to Category (Emergency Fund, etc.) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        title="Edit Fund"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGoalToDelete(goal)}
                        title="Delete Fund"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

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

                  <div className="mt-5 space-y-2">
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
                      <span>Deadline: {formatDate(goal.deadline)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(goal)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setGoalToDelete(goal)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setActiveGoal(goal);
                      setIsDepositModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1.5 shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
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
                className="text-slate-400 hover:text-slate-600"
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
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
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Where funds are parked (e.g. Liquid FD)..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingGoal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  {editingGoal ? 'Update Fund' : 'Save Goal'}
                </button>
              </div>
            </form>
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Fund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Funds to Goal */}
      {isDepositModalOpen && activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add Funds to Goal
              </h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Depositing towards: <strong>{activeGoal.title}</strong>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
