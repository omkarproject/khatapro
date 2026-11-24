'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import {
  Search,
  Users,
  FileText,
  Package,
  ArrowRight,
  TrendingUp,
  CreditCard,
  X,
  Wallet,
  BookOpen,
  QrCode,
  Folder,
  CheckSquare,
  PiggyBank,
  Settings,
  Headphones,
  BellRing,
  BarChart3,
  StickyNote,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Command,
  CornerDownLeft,
  Filter
} from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchCategory = 'all' | 'khata' | 'invoices' | 'expenses' | 'inventory' | 'documents' | 'notes' | 'pages';

interface SearchResultItem {
  id: string;
  type: string;
  category: 'khata' | 'invoices' | 'expenses' | 'inventory' | 'documents' | 'notes' | 'pages';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: 'emerald' | 'rose' | 'indigo' | 'amber' | 'slate' | 'cyan' | 'purple' | 'teal';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  amount?: string;
  amountType?: 'credit' | 'debit' | 'neutral';
  onSelect: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const {
    customers,
    transactions,
    invoices,
    expenses,
    products,
    documents,
    notes,
    tasks,
    savingsGoals,
    openCollectModal,
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened & reset search state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keydown handler when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const cleanQuery = query.toLowerCase().trim();

  // All App Modules / Navigation Shortcuts
  const modulesList = useMemo(() => [
    {
      title: 'Digital KhataBook',
      subtitle: 'Customer ledger, credit & debit balance statements',
      path: '/khata',
      keywords: ['khata', 'khatabook', 'ledger', 'debit', 'credit', 'hisab', 'bahi', 'customer ledger'],
      icon: BookOpen,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Billing & Invoices',
      subtitle: 'Create GST bills, invoices & quotations',
      path: '/invoices',
      keywords: ['invoice', 'billing', 'bill', 'tax', 'gst', 'challan', 'slip', 'sale'],
      icon: FileText,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Expense Tracker',
      subtitle: 'Record business overheads, rent, fuel, daily expenses',
      path: '/expenses',
      keywords: ['expense', 'kharcha', 'spend', 'cost', 'fuel', 'rent', 'salary', 'utility', 'outflow'],
      icon: Wallet,
      iconBg: 'bg-rose-50 dark:bg-rose-950/60',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Quick Collect Payment',
      subtitle: 'Instant dynamic UPI QR code & payment link',
      action: () => openCollectModal(),
      keywords: ['collect', 'upi', 'qr', 'payment', 'phonepe', 'gpay', 'paytm', 'receive money'],
      icon: QrCode,
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      title: 'Payment Collection Hub',
      subtitle: 'Shop standee, soundbox, UPI & gateways',
      path: '/upi-collection',
      keywords: ['hub', 'standee', 'soundbox', 'qr standee', 'payment hub', 'gateway'],
      icon: CreditCard,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Customers CRM',
      subtitle: 'Directory of all parties, contacts & balances',
      path: '/customers',
      keywords: ['customer', 'party', 'client', 'crm', 'contact', 'people'],
      icon: Users,
      iconBg: 'bg-purple-50 dark:bg-purple-950/60',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Inventory & Stock',
      subtitle: 'Product catalog, SKU, stock count & barcodes',
      path: '/inventory',
      keywords: ['inventory', 'stock', 'product', 'item', 'goods', 'mal', 'saman'],
      icon: Package,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Document Vault & Receipts',
      subtitle: 'GST registration, supplier bills & contracts',
      path: '/documents',
      keywords: ['document', 'vault', 'receipt', 'contract', 'kyc', 'pan', 'gst cert', 'files'],
      icon: Folder,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      title: 'Savings & Reserve Funds',
      subtitle: 'Emergency funds, tax reserves & goals',
      path: '/savings',
      keywords: ['savings', 'reserve', 'fund', 'emergency', 'goal', 'bachat'],
      icon: PiggyBank,
      iconBg: 'bg-teal-50 dark:bg-teal-950/60',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Notes & Tasks',
      subtitle: 'Reminders, to-dos & business checklists',
      path: '/notes-tasks',
      keywords: ['notes', 'tasks', 'todo', 'checklist', 'reminder'],
      icon: CheckSquare,
      iconBg: 'bg-violet-50 dark:bg-violet-950/60',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Payment Reminders',
      subtitle: 'Automated WhatsApp payment reminder alerts',
      path: '/reminders',
      keywords: ['reminder', 'whatsapp', 'due alert', 'overdue reminder'],
      icon: BellRing,
      iconBg: 'bg-pink-50 dark:bg-pink-950/60',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
    {
      title: 'Financial Analytics',
      subtitle: 'Revenue charts, profit & loss reports',
      path: '/analytics',
      keywords: ['analytics', 'report', 'chart', 'profit', 'revenue', 'growth', 'metrics'],
      icon: BarChart3,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Settings & Cloud Backup',
      subtitle: 'Business profile, Google Drive backup & preferences',
      path: '/settings',
      keywords: ['settings', 'config', 'profile', 'backup', 'google drive', 'password', 'preferences'],
      icon: Settings,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-300',
    },
    {
      title: 'Live Support & Helpdesk',
      subtitle: 'Merchant tickets & technical assistance',
      path: '/support',
      keywords: ['support', 'help', 'ticket', 'inquiry', 'helpdesk', 'assistance'],
      icon: Headphones,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ], [openCollectModal]);

  // Comprehensive Search Evaluation across ALL Data Sources
  const allResults = useMemo(() => {
    if (!cleanQuery) return [];

    const results: SearchResultItem[] = [];

    // 1. Pages & Action Shortcuts
    modulesList.forEach(m => {
      const matchTitle = m.title.toLowerCase().includes(cleanQuery);
      const matchSub = m.subtitle.toLowerCase().includes(cleanQuery);
      const matchKw = m.keywords.some(k => k.includes(cleanQuery));
      if (matchTitle || matchSub || matchKw) {
        results.push({
          id: `module-${m.title}`,
          type: 'page',
          category: 'pages',
          title: m.title,
          subtitle: m.subtitle,
          badge: 'Page',
          badgeColor: 'indigo',
          icon: m.icon,
          iconBg: m.iconBg,
          iconColor: m.iconColor,
          onSelect: () => {
            if (m.action) {
              onClose();
              m.action();
            } else if (m.path) {
              handleNavigate(m.path);
            }
          },
        });
      }
    });

    // 2. Customers / Parties
    customers.forEach(c => {
      const matchName = c.name?.toLowerCase().includes(cleanQuery);
      const matchPhone = c.phone?.toLowerCase().includes(cleanQuery);
      const matchBiz = c.businessName?.toLowerCase().includes(cleanQuery);
      const matchAddr = c.address?.toLowerCase().includes(cleanQuery);
      if (matchName || matchPhone || matchBiz || matchAddr) {
        let badge = 'Settled';
        let badgeColor: 'slate' | 'rose' | 'emerald' = 'slate';
        if (c.outstandingBalance > 0) {
          badge = `Due: ${formatINR(c.outstandingBalance)}`;
          badgeColor = 'rose';
        } else if (c.outstandingBalance < 0) {
          badge = `Advance: ${formatINR(Math.abs(c.outstandingBalance))}`;
          badgeColor = 'emerald';
        }
        results.push({
          id: `cust-${c.id}`,
          type: 'customer',
          category: 'khata',
          title: c.name,
          subtitle: `${c.phone || 'No phone'}${c.businessName ? ` • ${c.businessName}` : ''}`,
          badge,
          badgeColor,
          icon: Users,
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          onSelect: () => handleNavigate(`/khata?customer=${c.id}`),
        });
      }
    });

    // 3. Transactions / Khata Entries
    transactions.forEach(t => {
      const noteText = t.note || '';
      const matchNote = noteText.toLowerCase().includes(cleanQuery);
      const matchCust = t.customerName?.toLowerCase().includes(cleanQuery);
      const matchCat = t.category?.toLowerCase().includes(cleanQuery);
      const matchMode = t.paymentMode?.toLowerCase().includes(cleanQuery);
      const matchRef = (t.referenceNo || '').toLowerCase().includes(cleanQuery) ||
                       (t.receiptNo || '').toLowerCase().includes(cleanQuery) ||
                       (t.gatewayTxnId || '').toLowerCase().includes(cleanQuery);
      const matchAmt = String(t.amount).includes(cleanQuery);

      if (matchNote || matchCust || matchCat || matchMode || matchRef || matchAmt) {
        const isCredit = t.type === 'credit';
        results.push({
          id: `txn-${t.id}`,
          type: 'transaction',
          category: 'khata',
          title: t.customerName ? `${isCredit ? 'Received from' : 'Given to'} ${t.customerName}` : (t.note || 'Khata Transaction'),
          subtitle: `${formatDate(t.date)}${t.note ? ` • "${t.note}"` : ''} • ${t.paymentMode || 'Cash'}`,
          amount: `${isCredit ? '+' : '-'}${formatINR(t.amount)}`,
          amountType: isCredit ? 'credit' : 'debit',
          badge: isCredit ? 'Received' : 'Given',
          badgeColor: isCredit ? 'emerald' : 'rose',
          icon: isCredit ? ArrowDownLeft : ArrowUpRight,
          iconBg: isCredit ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-rose-50 dark:bg-rose-950/60',
          iconColor: isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          onSelect: () => handleNavigate(t.customerId ? `/khata?customer=${t.customerId}` : '/khata'),
        });
      }
    });

    // 4. Invoices & Bills
    invoices.forEach(inv => {
      const matchNo = inv.invoiceNumber?.toLowerCase().includes(cleanQuery);
      const matchCust = inv.customerName?.toLowerCase().includes(cleanQuery);
      const matchPhone = inv.customerPhone?.toLowerCase().includes(cleanQuery);
      const matchItems = inv.items?.some(it =>
        it.name?.toLowerCase().includes(cleanQuery) ||
        it.description?.toLowerCase().includes(cleanQuery)
      );
      const matchAmt = String(inv.total).includes(cleanQuery);
      const matchStatus = inv.status?.toLowerCase().includes(cleanQuery);

      if (matchNo || matchCust || matchPhone || matchItems || matchAmt || matchStatus) {
        const isPaid = inv.status === 'paid';
        const isOverdue = inv.status === 'overdue';
        results.push({
          id: `inv-${inv.id}`,
          type: 'invoice',
          category: 'invoices',
          title: `${inv.invoiceNumber} - ${inv.customerName || 'Customer'}`,
          subtitle: `${inv.issueDate || 'Recent'}${inv.items?.length ? ` • ${inv.items.length} item(s)` : ''}`,
          amount: formatINR(inv.total),
          badge: inv.status?.toUpperCase() || 'INVOICE',
          badgeColor: isPaid ? 'emerald' : isOverdue ? 'rose' : 'amber',
          icon: FileText,
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          onSelect: () => handleNavigate('/invoices'),
        });
      }
    });

    // 5. Expenses
    expenses.forEach(exp => {
      const matchTitle = exp.title?.toLowerCase().includes(cleanQuery);
      const matchCat = exp.category?.toLowerCase().includes(cleanQuery);
      const matchNotes = exp.notes?.toLowerCase().includes(cleanQuery);
      const matchMode = exp.paymentMode?.toLowerCase().includes(cleanQuery);
      const matchAmt = String(exp.amount).includes(cleanQuery);

      if (matchTitle || matchCat || matchNotes || matchMode || matchAmt) {
        results.push({
          id: `exp-${exp.id}`,
          type: 'expense',
          category: 'expenses',
          title: exp.title || 'Expense',
          subtitle: `${exp.date || 'Recent'}${exp.category ? ` • ${exp.category}` : ''} • ${exp.paymentMode || 'Cash'}`,
          amount: `-${formatINR(exp.amount)}`,
          amountType: 'debit',
          badge: exp.category || 'EXPENSE',
          badgeColor: 'rose',
          icon: Wallet,
          iconBg: 'bg-rose-50 dark:bg-rose-950/60',
          iconColor: 'text-rose-600 dark:text-rose-400',
          onSelect: () => handleNavigate('/expenses'),
        });
      }
    });

    // 6. Products / Inventory
    products.forEach(p => {
      const matchName = p.name?.toLowerCase().includes(cleanQuery);
      const matchSku = p.sku?.toLowerCase().includes(cleanQuery);
      const matchBar = p.barcode?.toLowerCase().includes(cleanQuery);
      const matchCat = p.category?.toLowerCase().includes(cleanQuery);
      const matchPrice = String(p.sellingPrice).includes(cleanQuery);

      if (matchName || matchSku || matchBar || matchCat || matchPrice) {
        const isLowStock = (p.currentStock || 0) <= (p.minStock || 5);
        results.push({
          id: `prod-${p.id}`,
          type: 'product',
          category: 'inventory',
          title: p.name,
          subtitle: `SKU: ${p.sku || 'N/A'}${p.category ? ` • ${p.category}` : ''} • Stock: ${p.currentStock || 0} ${p.unit || 'pcs'}`,
          amount: formatINR(p.sellingPrice),
          badge: isLowStock ? 'Low Stock' : 'In Stock',
          badgeColor: isLowStock ? 'rose' : 'emerald',
          icon: Package,
          iconBg: 'bg-amber-50 dark:bg-amber-950/60',
          iconColor: 'text-amber-600 dark:text-amber-400',
          onSelect: () => handleNavigate('/inventory'),
        });
      }
    });

    // 7. Documents / Vault
    documents?.forEach(doc => {
      const matchTitle = doc.title?.toLowerCase().includes(cleanQuery);
      const matchCat = doc.category?.toLowerCase().includes(cleanQuery);
      const matchRelated = doc.relatedEntityName?.toLowerCase().includes(cleanQuery);

      if (matchTitle || matchCat || matchRelated) {
        results.push({
          id: `doc-${doc.id}`,
          type: 'document',
          category: 'documents',
          title: doc.title,
          subtitle: `${doc.fileType?.toUpperCase() || 'FILE'} • ${doc.fileSize || 'N/A'}${doc.relatedEntityName ? ` • ${doc.relatedEntityName}` : ''}`,
          badge: doc.category?.toUpperCase() || 'DOC',
          badgeColor: 'cyan',
          icon: Folder,
          iconBg: 'bg-sky-50 dark:bg-sky-950/60',
          iconColor: 'text-sky-600 dark:text-sky-400',
          onSelect: () => handleNavigate('/documents'),
        });
      }
    });

    // 8. Notes & Tasks
    notes?.forEach(n => {
      if (n.title?.toLowerCase().includes(cleanQuery) || n.description?.toLowerCase().includes(cleanQuery)) {
        results.push({
          id: `note-${n.id}`,
          type: 'note',
          category: 'notes',
          title: n.title,
          subtitle: n.description ? (n.description.slice(0, 75) + (n.description.length > 75 ? '...' : '')) : 'Personal/Business Note',
          badge: n.category || 'Note',
          badgeColor: 'purple',
          icon: StickyNote,
          iconBg: 'bg-purple-50 dark:bg-purple-950/60',
          iconColor: 'text-purple-600 dark:text-purple-400',
          onSelect: () => handleNavigate('/notes-tasks'),
        });
      }
    });

    tasks?.forEach(tsk => {
      if (tsk.title?.toLowerCase().includes(cleanQuery) || tsk.description?.toLowerCase().includes(cleanQuery)) {
        results.push({
          id: `task-${tsk.id}`,
          type: 'task',
          category: 'notes',
          title: tsk.title,
          subtitle: `Priority: ${tsk.priority || 'medium'}${tsk.dueDate ? ` • Due: ${tsk.dueDate}` : ''}`,
          badge: tsk.isCompleted ? 'Completed' : 'Pending',
          badgeColor: tsk.isCompleted ? 'emerald' : 'amber',
          icon: CheckSquare,
          iconBg: 'bg-violet-50 dark:bg-violet-950/60',
          iconColor: 'text-violet-600 dark:text-violet-400',
          onSelect: () => handleNavigate('/notes-tasks'),
        });
      }
    });

    // 9. Savings Goals
    savingsGoals?.forEach(sg => {
      if (sg.title?.toLowerCase().includes(cleanQuery) || sg.category?.toLowerCase().includes(cleanQuery)) {
        results.push({
          id: `sg-${sg.id}`,
          type: 'savings',
          category: 'pages',
          title: sg.title,
          subtitle: `Target: ${formatINR(sg.targetAmount)} • Saved: ${formatINR(sg.currentAmount || 0)}`,
          badge: sg.category || 'Fund',
          badgeColor: 'teal',
          icon: PiggyBank,
          iconBg: 'bg-teal-50 dark:bg-teal-950/60',
          iconColor: 'text-teal-600 dark:text-teal-400',
          onSelect: () => handleNavigate('/savings'),
        });
      }
    });

    return results;
  }, [cleanQuery, customers, transactions, invoices, expenses, products, documents, notes, tasks, savingsGoals, modulesList, onClose]);

  // Filtered by Selected Category Tab
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults;
    return allResults.filter(r => r.category === activeCategory);
  }, [allResults, activeCategory]);

  // Keyboard navigation up / down / enter
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;

    const handleArrowNav = (e: KeyboardEvent) => {
      if (filteredResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) {
          selected.onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, [isOpen, filteredResults, selectedIndex]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allResults.length,
      khata: 0,
      invoices: 0,
      expenses: 0,
      inventory: 0,
      documents: 0,
      notes: 0,
      pages: 0,
    };
    allResults.forEach(r => {
      if (counts[r.category] !== undefined) {
        counts[r.category]++;
      }
    });
    return counts;
  }, [allResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[26px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Top Search Input Box */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <Search className="w-5 h-5 text-indigo-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KhataBook, Invoices, Expenses, Customers, Inventory, Actions..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <span className="text-xs font-mono font-bold px-1 hidden sm:inline">ESC</span>
            <X className="w-4 h-4 sm:hidden" />
          </button>
        </div>

        {/* Category Filters Bar (When query is active) */}
        {cleanQuery && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({categoryCounts.all})
            </button>
            {categoryCounts.khata > 0 && (
              <button
                onClick={() => setActiveCategory('khata')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'khata'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Khata ({categoryCounts.khata})
              </button>
            )}
            {categoryCounts.invoices > 0 && (
              <button
                onClick={() => setActiveCategory('invoices')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Invoices ({categoryCounts.invoices})
              </button>
            )}
            {categoryCounts.expenses > 0 && (
              <button
                onClick={() => setActiveCategory('expenses')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'expenses'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Expenses ({categoryCounts.expenses})
              </button>
            )}
            {categoryCounts.inventory > 0 && (
              <button
                onClick={() => setActiveCategory('inventory')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'inventory'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Inventory ({categoryCounts.inventory})
              </button>
            )}
            {categoryCounts.documents > 0 && (
              <button
                onClick={() => setActiveCategory('documents')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'documents'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Documents ({categoryCounts.documents})
              </button>
            )}
            {categoryCounts.notes > 0 && (
              <button
                onClick={() => setActiveCategory('notes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'notes'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Notes & Tasks ({categoryCounts.notes})
              </button>
            )}
            {categoryCounts.pages > 0 && (
              <button
                onClick={() => setActiveCategory('pages')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'pages'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Pages ({categoryCounts.pages})
              </button>
            )}
          </div>
        )}

        {/* Results Container */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-1 divide-y divide-slate-100/50 dark:divide-slate-800/40">
          
          {/* Empty Query View: Quick Shortcuts & Frequently Used Modules */}
          {!cleanQuery && (
            <div className="space-y-4 py-1">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1.5 flex items-center justify-between">
                  <span>Quick Access Modules</span>
                  <span className="text-[10px] lowercase font-normal">Type to search anything</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleNavigate('/khata')}
                    className="flex items-center gap-3 p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Digital KhataBook <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">Customer ledger & transactions</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      openCollectModal();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Collect Payment (QR) <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">Instant UPI QR & Direct Link</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/invoices')}
                    className="flex items-center gap-3 p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Billing & Invoices <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">Create GST bills & quotations</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/expenses')}
                    className="flex items-center gap-3 p-2.5 rounded-xl text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Expense Tracker <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">Overheads, fuel, salary & rent</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Actions List */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                  More Business Tools
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavigate('/customers')}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span>Customers CRM & Directory</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{customers.length} Parties</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('/inventory')}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-amber-500" />
                      <span>Inventory & Stock Management</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{products.length} Items</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('/documents')}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-sky-500" />
                      <span>Document Vault & Receipts</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{documents?.length || 0} Files</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('/settings')}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Settings, Branding & Google Drive Backup</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filtered Search Results List */}
          {cleanQuery && filteredResults.length > 0 && (
            <div className="space-y-1 pt-1">
              {filteredResults.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 ring-1 ring-indigo-400/50 dark:ring-indigo-500/40 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <div className={`w-8 h-8 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              item.badgeColor === 'emerald'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : item.badgeColor === 'rose'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                : item.badgeColor === 'indigo'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                : item.badgeColor === 'amber'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                                : item.badgeColor === 'cyan'
                                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                                : item.badgeColor === 'purple'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                                : item.badgeColor === 'teal'
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount or Navigation Arrow */}
                    <div className="shrink-0 flex items-center gap-2 text-right">
                      {item.amount && (
                        <span className={`font-mono font-bold text-xs sm:text-sm ${
                          item.amountType === 'credit'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.amountType === 'debit'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.amount}
                        </span>
                      )}
                      <div className={`p-1 rounded-lg text-slate-400 ${isSelected ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-40'}`}>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Zero Results State */}
          {cleanQuery && filteredResults.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No matching results found
              </div>
              <div className="text-xs text-slate-400 max-w-sm mx-auto">
                No records matched &ldquo;<span className="text-indigo-500 font-semibold">{query}</span>&rdquo;. Try searching by customer name, phone, bill number, expense title, or inventory SKU.
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer Helper Info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">esc</kbd>
              <span>close</span>
            </span>
          </div>
          <div className="font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>All-In-One Business Search</span>
          </div>
        </div>

      </div>
    </div>
  );
}
