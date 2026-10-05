'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { Expense, PaymentMode } from '@/types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  CreditCard,
  Tag,
  TrendingDown,
  PieChart as PieIcon,
  X,
  Sparkles,
  ArrowDownRight,
  Download,
  Pencil,
  Check,
  Upload,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, addToast, settings, updateSettings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Monthly Budget Cap Edit State
  const budgetCap = settings?.monthlyBudgetCap || 150000;
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Utilities');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMode, setFormMode] = useState<PaymentMode>('upi');
  const [formNotes, setFormNotes] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formTags, setFormTags] = useState('essential');
  const [formReceipts, setFormReceipts] = useState<string[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Rent',
    'Salaries',
    'Travel & Transport',
    'Utilities',
    'Hospitality',
    'Marketing',
    'Inventory',
    'Maintenance',
    'Tax & Legal',
    'Other',
  ];

  const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [expenses, searchTerm, selectedCategory]);

  // Analytics
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const percentUsed = budgetCap > 0 ? Math.round((totalExpense / budgetCap) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [expenses]);

  const handleSaveBudgetCap = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(tempBudget);
    if (isNaN(val) || val <= 0) {
      addToast('Invalid Budget Cap', 'Please enter a valid positive budget amount.', 'error');
      return;
    }
    updateSettings({
      ...settings,
      monthlyBudgetCap: val,
    });
    setIsEditingBudget(false);
    addToast('Budget Cap Updated', `Monthly budget cap set to ${formatINR(val)}`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - formReceipts.length;
    if (remainingSlots <= 0) {
      addToast('Limit Reached', 'You can upload a maximum of 4 receipt images.', 'warning');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        addToast('Invalid File', 'Only image files (JPG, PNG, WEBP) are supported.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        if (result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            setFormReceipts(prev => {
              if (prev.length >= 4) return prev;
              return [...prev, compressed];
            });
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveReceipt = (idxToRemove: number) => {
    setFormReceipts(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount.', 'error');
      return;
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      title: formTitle.trim(),
      amount: amt,
      category: formCategory,
      date: formDate,
      paymentMode: formMode,
      notes: formNotes.trim(),
      receiptUrl: formReceipts[0] || '',
      receiptUrls: formReceipts,
      isRecurring: formIsRecurring,
      tags: formTags.split(',').map(t => t.trim()),
      createdAt: new Date().toISOString(),
    };

    addExpense(newExpense);
    setIsModalOpen(false);
    setFormTitle('');
    setFormAmount('');
    setFormNotes('');
    setFormReceipts([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Expense & Outflow Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Categorized operational expenses, recurring payments, and monthly spending comparisons
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Expense
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Monthly Spend</div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Across {expenses.length} logged expense vouchers
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Cost Driver</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {categoryBreakdown[0]?.name || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {formatINR(categoryBreakdown[0]?.value || 0)} spent this cycle
          </div>
        </div>

        <div className="glass-card p-5 relative">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Budget Cap</div>
            {!isEditingBudget ? (
              <button
                type="button"
                onClick={() => {
                  setTempBudget(String(budgetCap));
                  setIsEditingBudget(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit Monthly Budget Cap"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSaveBudgetCap()}
                  className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer"
                  title="Save Budget Cap"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {!isEditingBudget ? (
            <>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(budgetCap)}
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold mt-2">
                <span className={percentUsed >= 100 ? 'text-rose-500' : percentUsed >= 80 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                  {percentUsed}% of recommended budget utilized
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentUsed >= 100
                      ? 'bg-rose-500'
                      : percentUsed >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  autoFocus
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBudgetCap();
                    if (e.key === 'Escape') setIsEditingBudget(false);
                  }}
                  placeholder="e.g. 150000"
                  className="w-full pl-7 pr-3 py-1.5 text-sm font-bold font-mono rounded-xl bg-white dark:bg-slate-900 border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-slate-400">Press Enter or click checkmark to save</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Chart & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Expenses Table */}
        <div className="lg:col-span-8 glass-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Title & Notes</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{exp.title}</div>
                      {exp.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{exp.notes}</div>}
                      {((exp.receiptUrls && exp.receiptUrls.length > 0) || exp.receiptUrl) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {(exp.receiptUrls && exp.receiptUrls.length > 0 ? exp.receiptUrls : [exp.receiptUrl!]).map((url, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={url}
                              alt="Receipt"
                              onClick={() => setViewingReceipt(url)}
                              className="w-6 h-6 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform shadow-xs"
                              title="Click to view full receipt"
                            />
                          ))}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(exp.receiptUrls?.length || 1)} bill{(exp.receiptUrls?.length || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-mono text-slate-500">
                      {exp.paymentMode}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pie Distribution */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              Category Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Visual proportion of your business expenses
            </p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 mt-2">
              {categoryBreakdown.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatINR(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Log New Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                Log Business Expense
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Warehouse electricity bill"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formMode}
                    onChange={(e: any) => setFormMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Receipt number or details..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              {/* Receipt / Bill Images Upload (Max 4 limit) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Receipt / Bill Images <span className="text-[11px] font-normal text-slate-400">({formReceipts.length}/4)</span>
                  </label>
                  {formReceipts.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Photo</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {formReceipts.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 border-2 border-dashed border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-xs font-medium">Upload bill or invoice photos (Max 4)</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {formReceipts.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imgUrl}
                          alt={`Receipt ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setViewingReceipt(imgUrl)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveReceipt(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {formReceipts.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500/60 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer"
                        title="Add another photo"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Add</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="recurring" className="text-xs text-slate-600 dark:text-slate-400">
                  Mark as Monthly Recurring Expense
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Full Receipt Image Viewer Modal */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setViewingReceipt(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setViewingReceipt(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white cursor-pointer shadow-lg"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={viewingReceipt}
              alt="Receipt Preview"
              className="max-h-[75vh] w-auto object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="w-full flex items-center justify-between pt-2 px-2 text-xs text-slate-500">
              <span className="font-semibold">Attached Expense Bill</span>
              <a
                href={viewingReceipt}
                download="expense-receipt.jpg"
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
