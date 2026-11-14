'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { getActiveCurrency, t } from '@/lib/i18n';
import { Expense, PaymentMode } from '@/types';
import { uploadToDriveFiles } from '@/lib/driveUploadClient';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  CreditCard,
  Tag,
  Tags,
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
  Eye,
  RotateCcw
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
  const { expenses, addExpense, updateExpense, deleteExpense, addToast, settings, updateSettings, activeCurrency, activeLanguage } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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
  const [viewingExpenseReceipt, setViewingExpenseReceipt] = useState<{
    title: string;
    amount: number;
    category: string;
    date: string;
    urls: string[];
    activeIndex: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const DEFAULT_EXPENSE_CATEGORIES = useMemo(() => [
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
  ], []);

  const categories = useMemo(() => {
    if (settings.expenseCategories && Array.isArray(settings.expenseCategories) && settings.expenseCategories.length > 0) {
      return settings.expenseCategories;
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  }, [settings.expenseCategories, DEFAULT_EXPENSE_CATEGORIES]);

  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      addToast('Category Exists', `"${trimmed}" category pehle se mojood hai.`, 'info');
      return;
    }
    const updated = [...categories, trimmed];
    updateSettings({ ...settings, expenseCategories: updated });
    setNewCategoryInput('');
    setFormCategory(trimmed);
    addToast('Category Added! 🏷️', `"${trimmed}" category safaltapoorvak add ho gayi.`, 'success');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (categories.length <= 1) {
      addToast('Cannot Delete', 'Kam se kam ek category hona zaroori hai.', 'warning');
      return;
    }
    const updated = categories.filter(c => c !== catToRemove);
    updateSettings({ ...settings, expenseCategories: updated });
    if (formCategory === catToRemove) {
      setFormCategory(updated[0]);
    }
    if (selectedCategory === catToRemove) {
      setSelectedCategory('all');
    }
    addToast('Category Removed', `"${catToRemove}" category remove kar di gayi.`, 'info');
  };

  const handleResetCategories = () => {
    updateSettings({ ...settings, expenseCategories: DEFAULT_EXPENSE_CATEGORIES });
    setFormCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
    addToast('Categories Reset', 'Default categories restore ho gayi hain.', 'success');
  };

  const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  // All-time total
  const totalAllTime = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  // Compute available months with spend totals and record counts
  const availableMonths = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    expenses.forEach(e => {
      const monthKey = e.date ? e.date.substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = { total: 0, count: 0 };
      }
      map[monthKey].total += e.amount;
      map[monthKey].count += 1;
    });

    const keys = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return keys.map(key => {
      let label = key;
      let fullLabel = key;
      try {
        const [year, month] = key.split('-').map(Number);
        const d = new Date(year, month - 1, 1);
        label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        fullLabel = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      } catch {}
      return {
        key,
        label,
        fullLabel,
        total: map[key].total,
        count: map[key].count,
      };
    });
  }, [expenses]);

  // Selected month meta
  const selectedMonthData = useMemo(() => {
    if (selectedMonth === 'all') return null;
    return availableMonths.find(m => m.key === selectedMonth) || null;
  }, [availableMonths, selectedMonth]);

  // Scoped expenses by selected month
  const scopedExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter(e => e.date?.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Filtered expenses based on search, category, and payment mode within scoped month
  const filteredExpenses = useMemo(() => {
    return scopedExpenses.filter(e => {
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchMode = selectedMode === 'all' || e.paymentMode === selectedMode;
      return matchSearch && matchCat && matchMode;
    });
  }, [scopedExpenses, searchTerm, selectedCategory, selectedMode]);

  // Analytics scoped to selected month
  const totalExpense = scopedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const percentUsedFloat = budgetCap > 0 ? (totalExpense / budgetCap) * 100 : 0;
  const percentUsed = Math.round(percentUsedFloat);
  const percentUsedDisplay = percentUsedFloat % 1 === 0 ? percentUsedFloat.toFixed(0) : percentUsedFloat.toFixed(1);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    scopedExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    })).sort((a, b) => b.value - a.value);
  }, [scopedExpenses]);

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all' || selectedMonth !== 'all' || selectedMode !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedMonth('all');
    setSelectedMode('all');
  };

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

  const resetForm = () => {
    setFormTitle('');
    setFormAmount('');
    setFormCategory(categories[0] || 'Utilities');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMode('upi');
    setFormNotes('');
    setFormIsRecurring(false);
    setFormTags('essential');
    setFormReceipts([]);
    setEditingExpenseId(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setFormTitle(exp.title || '');
    setFormAmount(exp.amount ? exp.amount.toString() : '');
    setFormCategory(exp.category || categories[0] || 'Utilities');
    setFormDate(exp.date || new Date().toISOString().split('T')[0]);
    setFormMode(exp.paymentMode || 'upi');
    setFormNotes(exp.notes || '');
    setFormIsRecurring(Boolean(exp.isRecurring));
    setFormTags(exp.tags?.length ? exp.tags.join(', ') : 'essential');
    const existingReceipts = (exp.receiptUrls && exp.receiptUrls.length > 0)
      ? exp.receiptUrls
      : (exp.receiptUrl ? [exp.receiptUrl] : []);
    setFormReceipts(existingReceipts);
    setIsModalOpen(true);
  };

  const handleViewReceipt = (exp: Expense) => {
    const urls = (exp.receiptUrls && exp.receiptUrls.length > 0)
      ? exp.receiptUrls
      : (exp.receiptUrl ? [exp.receiptUrl] : []);

    if (urls.length === 0) {
      addToast(
        'No Receipt Attached',
        `"${exp.title}" ke sath koi receipt ya bill attach nahi hai. Edit button par click karke bill upload karein.`,
        'info'
      );
      return;
    }

    setViewingExpenseReceipt({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date,
      urls,
      activeIndex: 0,
    });
  };

  const handleDownloadReceipt = (url: string, title: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = (title || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      link.download = `receipt_${cleanTitle}_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Download Started', 'Receipt file download ho rahi hai.', 'success');
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount.', 'error');
      return;
    }

    // Upload receipts to Google Drive only now upon explicit save
    const uploadedReceipts: string[] = [];
    for (let i = 0; i < formReceipts.length; i++) {
      const receipt = formReceipts[i];
      if (receipt.startsWith('data:')) {
        try {
          const uploadRes = await uploadToDriveFiles(
            `expense_${Date.now()}_${i + 1}.jpg`,
            receipt,
            'image/jpeg',
            undefined,
            {
              category: 'Expenses',
              uploadedAt: new Date().toISOString(),
            }
          );
          if (uploadRes.success && uploadRes.fileId) {
            uploadedReceipts.push(`/api/backup/google-drive/view-file?fileId=${uploadRes.fileId}`);
            continue;
          }
        } catch (err) {
          console.warn('Error uploading expense receipt to drive:', err);
        }
      }
      uploadedReceipts.push(receipt);
    }

    if (editingExpenseId) {
      const existing = expenses.find(e => e.id === editingExpenseId);
      const updatedExpense: Expense = {
        id: editingExpenseId,
        title: formTitle.trim(),
        amount: amt,
        category: formCategory,
        date: formDate,
        paymentMode: formMode,
        notes: formNotes.trim(),
        receiptUrl: uploadedReceipts[0] || '',
        receiptUrls: uploadedReceipts,
        driveReceiptId: existing?.driveReceiptId,
        isRecurring: formIsRecurring,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      updateExpense(updatedExpense);
    } else {
      const newExpense: Expense = {
        id: `exp_${Date.now()}`,
        title: formTitle.trim(),
        amount: amt,
        category: formCategory,
        date: formDate,
        paymentMode: formMode,
        notes: formNotes.trim(),
        receiptUrl: uploadedReceipts[0] || '',
        receiptUrls: uploadedReceipts,
        isRecurring: formIsRecurring,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
      };

      addExpense(newExpense);
    }

    setIsModalOpen(false);
    resetForm();
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

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Manage Expense Categories"
          >
            <Tags className="w-4 h-4 text-indigo-500" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth === 'all' ? 'Total Spend (All Time)' : `Spend • ${selectedMonthData?.label || selectedMonth}`}
            </div>
            {selectedMonth !== 'all' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                Month Filtered
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Across {scopedExpenses.length} logged expense vouchers {selectedMonth !== 'all' ? `in ${selectedMonthData?.fullLabel || selectedMonth}` : ''}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Cost Driver</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {categoryBreakdown[0]?.name || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {formatINR(categoryBreakdown[0]?.value || 0)} spent {selectedMonth === 'all' ? 'across all time' : `in ${selectedMonthData?.label || 'selected month'}`}
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
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{getActiveCurrency().symbol}</span>
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
          
          {/* Month Wise Quick Breakdown Strip */}
          <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Month-Wise Spending Summary</span>
              </div>
              {selectedMonth !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Show All Months
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>All Months</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  selectedMonth === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold'
                }`}>
                  {formatINR(totalAllTime)}
                </span>
                <span className={`text-[10px] ${selectedMonth === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  ({expenses.length})
                </span>
              </button>

              {availableMonths.map((m) => {
                const isSelected = selectedMonth === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatINR(m.total)}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      ({m.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar with Search, Month, Category, Payment Mode & Clear button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses, notes..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Selector */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-xl border font-medium cursor-pointer transition-all ${
                    selectedMonth !== 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Filter by month"
                >
                  <option value="all">📅 All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      📅 {m.label} • {formatINR(m.total)} ({m.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-xl border font-medium cursor-pointer transition-all ${
                    selectedCategory !== 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Filter by category"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Payment Mode Selector */}
              <div className="relative">
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-xl border font-medium cursor-pointer transition-all ${
                    selectedMode !== 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Filter by payment mode"
                >
                  <option value="all">All Modes</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                  title="Reset all filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
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
                  <th className="py-2.5 px-3 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => (
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
                                onClick={() => handleViewReceipt(exp)}
                                className="w-6 h-6 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform shadow-xs"
                                title="Click to view & download full receipt"
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
                        {(() => {
                          const hasReceipt = Boolean((exp.receiptUrls && exp.receiptUrls.length > 0) || exp.receiptUrl);
                          const receiptCount = (exp.receiptUrls && exp.receiptUrls.length > 0) ? exp.receiptUrls.length : (exp.receiptUrl ? 1 : 0);
                          return (
                            <div className="flex items-center justify-center gap-1">
                              {/* View / Download Receipt Button (Eye Icon) */}
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(exp)}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  hasReceipt
                                    ? 'text-indigo-400 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/25 ring-1 ring-indigo-500/30 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 opacity-60'
                                }`}
                                title={hasReceipt ? `View & Download Receipt (${receiptCount} bill${receiptCount > 1 ? 's' : ''})` : 'No receipt attached (Click for details)'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Expense Button (Pencil Icon) */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(exp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-400/15 transition-all cursor-pointer"
                                title="Edit Expense Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Expense Button (Trash2 Icon) */}
                              <button
                                type="button"
                                onClick={() => deleteExpense(exp.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                      <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No expense records found</div>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {hasActiveFilters
                          ? 'No records match your selected month, category, or payment mode filters.'
                          : 'No expenses logged yet. Click "Log Expense" to record your first expense.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pie Distribution */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                Category Breakdown
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                {percentUsedDisplay}% / 100%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {selectedMonth === 'all'
                ? 'Visual proportion of your business expenses (All Time)'
                : `Visual proportion of expenses for ${selectedMonthData?.fullLabel || selectedMonth}`}
            </p>

            <div className="relative h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown.length > 0 ? categoryBreakdown : [{ name: 'No Expense', value: 1, color: '#334155' }]}
                    innerRadius={68}
                    outerRadius={94}
                    paddingAngle={categoryBreakdown.length > 1 ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryBreakdown.length > 0 ? (
                      categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    ) : (
                      <Cell key="empty" fill="#94a3b8" opacity={0.25} />
                    )}
                  </Pie>
                  {categoryBreakdown.length > 0 && (
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const itemVal = Number(data.value || 0);
                          const catPct = totalExpense > 0 ? Math.round((itemVal / totalExpense) * 100) : 0;
                          return (
                            <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white px-3.5 py-2.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs backdrop-blur-md pointer-events-none z-50 animate-fadeIn">
                              <div className="flex items-center gap-2 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.payload.color }} />
                                <span className="text-slate-100">{data.name}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 mt-1 font-mono">
                                <span className="text-emerald-400 font-extrabold">{formatINR(itemVal)}</span>
                                <span className="text-indigo-300 text-[11px] font-semibold">({catPct}% of spend)</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Hole: % / 100% of Budget Utilized */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${percentUsedFloat > 100 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {percentUsedDisplay}%
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  / 100% Budget
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                  {formatINR(totalExpense)} used
                </div>
              </div>
            </div>

            {/* Category Legend list */}
            <div className="space-y-2 mt-3 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
              {categoryBreakdown.map((item) => {
                const itemPercent = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({itemPercent}%)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                      {formatINR(item.value)}
                    </span>
                  </div>
                );
              })}
              {categoryBreakdown.length === 0 && (
                <div className="text-center py-2 text-xs text-slate-400">
                  No expense records logged yet
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Log / Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {editingExpenseId ? (
                  <>
                    <Pencil className="w-5 h-5 text-amber-500" />
                    <span>Edit Business Expense</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 text-indigo-500" />
                    <span>Log Business Expense</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
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
                    {t('amount', 'Amount')} ({getActiveCurrency().symbol}) *
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
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
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal (Add / Remove Categories) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Manage Expense Categories</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                      {categories.length} Total
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Category add ya remove karein, ye Log Expense me turant show hongi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New Category (e.g. Fuel, Raw Materials)..."
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!newCategoryInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Category Tags List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Categories ({categories.length})
              </div>
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                  >
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="ml-1 text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                      title={`Remove "${cat}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetCategories}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

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

      {/* Expense Receipt Preview & Download Modal (From Actions Eye Icon) */}
      {viewingExpenseReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setViewingExpenseReceipt(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl flex flex-col space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {viewingExpenseReceipt.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/40 shrink-0">
                      {viewingExpenseReceipt.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatINR(viewingExpenseReceipt.amount)} • {formatDate(viewingExpenseReceipt.date)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingExpenseReceipt(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Preview Area */}
            <div className="relative w-full max-h-[58vh] min-h-[260px] flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden p-2 border border-slate-800">
              <img
                src={viewingExpenseReceipt.urls[viewingExpenseReceipt.activeIndex]}
                alt={`Receipt ${viewingExpenseReceipt.activeIndex + 1}`}
                className="max-h-[54vh] max-w-full object-contain rounded-lg"
              />
            </div>

            {/* Multiple Receipts Selector Thumbnails (if > 1) */}
            {viewingExpenseReceipt.urls.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                {viewingExpenseReceipt.urls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setViewingExpenseReceipt({ ...viewingExpenseReceipt, activeIndex: idx })}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      viewingExpenseReceipt.activeIndex === idx
                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-mono py-0.5 text-white">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Modal Footer with Download Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-mono">
                Bill {viewingExpenseReceipt.activeIndex + 1} of {viewingExpenseReceipt.urls.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(
                    viewingExpenseReceipt.urls[viewingExpenseReceipt.activeIndex],
                    viewingExpenseReceipt.title,
                    viewingExpenseReceipt.activeIndex
                  )}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingExpenseReceipt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
