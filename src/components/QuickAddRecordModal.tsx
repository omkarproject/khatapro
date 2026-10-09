'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import {
  X,
  Plus,
  ArrowLeft,
  FileSpreadsheet,
  BookOpen,
  Receipt,
  PiggyBank,
  FolderLock,
  Users,
  Check,
  Upload,
  Calendar,
  CreditCard,
  DollarSign,
  Building,
  Phone,
  Mail,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  Customer,
  Transaction,
  Invoice,
  Expense,
  SavingsGoal,
  SavingsDeposit,
  DocumentItem,
  PaymentMode,
  InvoiceItem
} from '@/types';

export type QuickAddOption =
  | 'invoice'
  | 'khata'
  | 'expense'
  | 'savings'
  | 'document'
  | 'customer';

interface QuickAddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOption?: QuickAddOption | null;
}

export default function QuickAddRecordModal({
  isOpen,
  onClose,
  initialOption = null
}: QuickAddRecordModalProps) {
  const {
    customers,
    saveCustomer,
    addTransaction,
    saveInvoice,
    addExpense,
    savingsGoals,
    saveSavingsGoal,
    addDocument,
    addToast
  } = useApp();

  const [activeOption, setActiveOption] = useState<QuickAddOption | null>(initialOption);

  // --- Khata Entry Form State ---
  const [khataCustId, setKhataCustId] = useState<string>('');
  const [khataIsNewCust, setKhataIsNewCust] = useState(false);
  const [khataNewCustName, setKhataNewCustName] = useState('');
  const [khataNewCustPhone, setKhataNewCustPhone] = useState('');
  const [khataType, setKhataType] = useState<'credit' | 'debit'>('debit'); // debit = Gave (दिया), credit = Got (मिला)
  const [khataAmount, setKhataAmount] = useState('');
  const [khataDate, setKhataDate] = useState(new Date().toISOString().split('T')[0]);
  const [khataMode, setKhataMode] = useState<PaymentMode>('upi');
  const [khataNote, setKhataNote] = useState('');

  // --- New Invoice Form State ---
  const [invCustId, setInvCustId] = useState<string>('');
  const [invCustName, setInvCustName] = useState('');
  const [invType, setInvType] = useState<'sales' | 'purchase' | 'quotation'>('sales');
  const [invIssueDate, setInvIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [invItemName, setInvItemName] = useState('');
  const [invItemQty, setInvItemQty] = useState('1');
  const [invItemPrice, setInvItemPrice] = useState('');
  const [invItemTax, setInvItemTax] = useState('0');
  const [invIsPaid, setInvIsPaid] = useState(false);

  // --- Expense Form State ---
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Utilities');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expMode, setExpMode] = useState<PaymentMode>('upi');
  const [expNotes, setExpNotes] = useState('');

  // --- Savings Goal & Fund Deposit Form State ---
  const [savingsMode, setSavingsMode] = useState<'add_fund' | 'create_goal'>('add_fund');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [savDepositAmount, setSavDepositAmount] = useState<string>('');
  const [savDepositDate, setSavDepositDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savDepositNote, setSavDepositNote] = useState<string>('');

  const [savTitle, setSavTitle] = useState('');
  const [savTarget, setSavTarget] = useState('');
  const [savCurrent, setSavCurrent] = useState('0');
  const [savDeadline, setSavDeadline] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [savCategory, setSavCategory] = useState<SavingsGoal['category']>('Emergency Fund');
  const [savNotes, setSavNotes] = useState('');

  // Automatically select first existing goal or default to create if none
  React.useEffect(() => {
    if (savingsGoals && savingsGoals.length > 0) {
      if (!selectedGoalId || !savingsGoals.some(g => g.id === selectedGoalId)) {
        setSelectedGoalId(savingsGoals[0].id);
      }
    } else {
      setSavingsMode('create_goal');
    }
  }, [savingsGoals, selectedGoalId]);

  // --- Document Vault Form State ---
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('tax');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docFileType, setDocFileType] = useState('application/pdf');
  const [docFileSize, setDocFileSize] = useState('0 KB');
  const [docRelatedName, setDocRelatedName] = useState('');

  // --- Customer CRM Form State ---
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custBusiness, setCustBusiness] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState('50000');
  const [custCategory, setCustCategory] = useState<Customer['category']>('Regular');
  const [custAddress, setCustAddress] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveOption(null);
    onClose();
  };

  // 1. Submit Khata Entry
  const handleSubmitKhata = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(khataAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid positive amount.', 'error');
      return;
    }

    let finalCustomerId = khataCustId;
    let finalCustomerName = '';

    if (khataIsNewCust) {
      if (!khataNewCustName.trim()) {
        addToast('Customer Name Required', 'Please enter customer name.', 'error');
        return;
      }
      const newCust: Customer = {
        id: `cust_${Date.now()}`,
        name: khataNewCustName.trim(),
        phone: khataNewCustPhone.trim() || '9876543210',
        email: '',
        creditLimit: 50000,
        outstandingBalance: 0,
        category: 'Regular',
        status: 'active',
        rating: 5,
        createdAt: new Date().toISOString(),
      };
      saveCustomer(newCust);
      finalCustomerId = newCust.id;
      finalCustomerName = newCust.name;
    } else {
      const selected = customers.find(c => c.id === khataCustId);
      if (!selected) {
        addToast('Select Customer', 'Please select a customer or add a new one.', 'error');
        return;
      }
      finalCustomerId = selected.id;
      finalCustomerName = selected.name;
    }

    const newTxn: Transaction = {
      id: `txn_${Date.now()}`,
      type: khataType,
      amount: amt,
      date: khataDate,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      category: khataType === 'debit' ? 'Credit Given (उधार)' : 'Payment Received (मिला)',
      paymentMode: khataMode,
      note: khataNote.trim() || (khataType === 'debit' ? 'Credit given from dashboard' : 'Payment received'),
      status: 'completed',
      createdBy: 'Dashboard Quick Add',
      createdAt: new Date().toISOString(),
    };

    addTransaction(newTxn);
    addToast(
      'Khata Entry Recorded',
      `${khataType === 'debit' ? 'You Gave' : 'You Got'} ${formatINR(amt)} for ${finalCustomerName}`,
      'success'
    );
    handleClose();
  };

  // 2. Submit New Invoice
  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(invItemQty) || 1;
    const price = parseFloat(invItemPrice);
    if (isNaN(price) || price <= 0) {
      addToast('Invalid Price', 'Please enter a valid item price.', 'error');
      return;
    }

    const subtotal = qty * price;
    const taxRate = parseFloat(invItemTax) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    let finalCustName = invCustName.trim();
    let finalCustId = invCustId;
    if (invCustId) {
      const c = customers.find(cust => cust.id === invCustId);
      if (c) {
        finalCustName = c.name;
        finalCustId = c.id;
      }
    }
    if (!finalCustName) {
      finalCustName = 'Walk-in Customer';
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const items: InvoiceItem[] = [
      {
        id: `item_${Date.now()}`,
        name: invItemName.trim() || 'General Sales Item',
        quantity: qty,
        unitPrice: price,
        discountPercent: 0,
        taxPercent: taxRate,
        total: total,
      },
    ];

    const newInv: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      type: invType,
      customerId: finalCustId || `walkin_${Date.now()}`,
      customerName: finalCustName,
      issueDate: invIssueDate,
      dueDate: invDueDate,
      items,
      subtotal,
      discountAmount: 0,
      taxAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      total,
      paidAmount: invIsPaid ? total : 0,
      status: invIsPaid ? 'paid' : 'unpaid',
      notes: 'Quick invoice created from Dashboard Hub',
      createdAt: new Date().toISOString(),
    };

    saveInvoice(newInv);
    addToast('Invoice Created', `Invoice ${invoiceNumber} created for ${formatINR(total)}`, 'success');
    handleClose();
  };

  // 3. Submit Expense
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid expense amount.', 'error');
      return;
    }
    if (!expTitle.trim()) {
      addToast('Title Required', 'Please provide an expense description.', 'error');
      return;
    }

    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      title: expTitle.trim(),
      amount: amt,
      category: expCategory,
      date: expDate,
      paymentMode: expMode,
      notes: expNotes.trim(),
      isRecurring: false,
      tags: ['dashboard-quick-add'],
      createdAt: new Date().toISOString(),
    };

    addExpense(newExp);
    addToast('Expense Logged', `Logged expense of ${formatINR(amt)} under ${expCategory}`, 'success');
    handleClose();
  };

  // 4A. Submit Add Funds to Existing Savings Goal
  const handleAddFundToGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGoalId = selectedGoalId || savingsGoals[0]?.id;
    const activeGoal = savingsGoals.find(g => g.id === targetGoalId);
    if (!activeGoal) {
      addToast('Goal Not Found', 'Please select a valid savings goal.', 'error');
      return;
    }
    const amt = parseFloat(savDepositAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid deposit amount greater than ₹0.', 'error');
      return;
    }

    const newDeposit: SavingsDeposit = {
      id: `dep_${Date.now()}`,
      amount: amt,
      date: savDepositDate || new Date().toISOString().split('T')[0],
      notes: savDepositNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedGoal: SavingsGoal = {
      ...activeGoal,
      currentAmount: (Number(activeGoal.currentAmount) || 0) + amt,
      deposits: [newDeposit, ...(activeGoal.deposits || [])],
    };

    saveSavingsGoal(updatedGoal);
    addToast('Funds Added', `Added ${formatINR(amt)} to "${activeGoal.title}". Total: ${formatINR(updatedGoal.currentAmount)}`, 'success');
    setSavDepositAmount('');
    setSavDepositNote('');
    handleClose();
  };

  // 4B. Submit Create New Savings Goal
  const handleSubmitSavings = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(savTarget);
    if (isNaN(target) || target <= 0) {
      addToast('Invalid Target', 'Please enter a valid target amount.', 'error');
      return;
    }
    if (!savTitle.trim()) {
      addToast('Title Required', 'Please enter a savings goal title.', 'error');
      return;
    }
    const current = parseFloat(savCurrent) || 0;

    const newGoal: SavingsGoal = {
      id: `goal_${Date.now()}`,
      title: savTitle.trim(),
      targetAmount: target,
      currentAmount: current,
      category: savCategory,
      deadline: savDeadline,
      notes: savNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    saveSavingsGoal(newGoal);
    addToast('Savings Goal Created', `Goal "${savTitle}" created with target ${formatINR(target)}`, 'success');
    handleClose();
  };

  // 5. Submit Document Vault
  const handleDocFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    setDocFileType(file.type || 'application/octet-stream');
    setDocFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      setDocFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      addToast('Title Required', 'Please provide a document title.', 'error');
      return;
    }

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      title: docTitle.trim(),
      category: docCategory,
      fileUrl: docFileUrl || 'https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=800&q=80',
      fileType: docFileType,
      fileSize: docFileSize || '24.5 KB',
      relatedEntityName: docRelatedName.trim() || undefined,
      uploadedAt: new Date().toISOString(),
    };

    addDocument(newDoc);
    addToast('Document Uploaded', `Document "${docTitle}" saved to Document Vault`, 'success');
    handleClose();
  };

  // 6. Submit Customer CRM
  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      addToast('Name Required', 'Please enter customer name.', 'error');
      return;
    }
    const limit = parseFloat(custCreditLimit) || 50000;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: custName.trim(),
      phone: custPhone.trim() || '9876543210',
      email: custEmail.trim(),
      businessName: custBusiness.trim(),
      creditLimit: limit,
      outstandingBalance: 0,
      category: custCategory,
      status: 'active',
      rating: 5,
      address: custAddress.trim(),
      createdAt: new Date().toISOString(),
    };

    saveCustomer(newCust);
    addToast('Customer Created', `${custName} added to CRM with ${formatINR(limit)} limit`, 'success');
    handleClose();
  };

  const optionsList = [
    {
      id: 'khata' as QuickAddOption,
      title: 'Khata Entry',
      subtitle: 'Record gave (उधार) or got (मिला) payment',
      badge: 'Core Ledger',
      icon: BookOpen,
      iconColor: 'text-emerald-500',
      bgGradient: 'hover:border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10',
    },
    {
      id: 'invoice' as QuickAddOption,
      title: 'New Invoice',
      subtitle: 'Create GST sales invoice or quotation',
      badge: 'Invoicing',
      icon: FileSpreadsheet,
      iconColor: 'text-indigo-500',
      bgGradient: 'hover:border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10',
    },
    {
      id: 'expense' as QuickAddOption,
      title: 'Expense Voucher',
      subtitle: 'Log business outflow, rent or utility bills',
      badge: 'Outflow',
      icon: Receipt,
      iconColor: 'text-rose-500',
      bgGradient: 'hover:border-rose-500/50 bg-rose-500/5 dark:bg-rose-500/10',
    },
    {
      id: 'customer' as QuickAddOption,
      title: 'Customers CRM',
      subtitle: 'Register new customer with credit limit',
      badge: 'CRM',
      icon: Users,
      iconColor: 'text-purple-500',
      bgGradient: 'hover:border-purple-500/50 bg-purple-500/5 dark:bg-purple-500/10',
    },
    {
      id: 'savings' as QuickAddOption,
      title: 'Savings Goal',
      subtitle: 'Set tax reserve, emergency or growth fund',
      badge: 'Reserve',
      icon: PiggyBank,
      iconColor: 'text-amber-500',
      bgGradient: 'hover:border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10',
    },
    {
      id: 'document' as QuickAddOption,
      title: 'Document Vault',
      subtitle: 'Upload GST, PAN, licenses & certificates',
      badge: 'Storage',
      icon: FolderLock,
      iconColor: 'text-cyan-500',
      bgGradient: 'hover:border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {activeOption ? (
              <button
                type="button"
                onClick={() => setActiveOption(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Plus className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {activeOption === 'khata'
                  ? 'Record Khata Entry'
                  : activeOption === 'invoice'
                  ? 'Create New Invoice'
                  : activeOption === 'expense'
                  ? 'Log Business Expense'
                  : activeOption === 'savings'
                  ? savingsMode === 'add_fund' && savingsGoals.length > 0
                    ? 'Add Funds to Savings Goal'
                    : 'Create Savings Goal'
                  : activeOption === 'document'
                  ? 'Store in Document Vault'
                  : activeOption === 'customer'
                  ? 'Add Customer to CRM'
                  : 'Quick Add Record'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {activeOption === 'savings'
                  ? savingsMode === 'add_fund' && savingsGoals.length > 0
                    ? 'Select an existing goal to deposit savings and grow reserves'
                    : 'Set a new financial savings target for your business'
                  : activeOption
                  ? 'Fill details to instantly record into your system'
                  : 'Select what you would like to add right from your dashboard'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* View 1: 6 Interactive Options Grid */}
          {!activeOption && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optionsList.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActiveOption(opt.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group ${opt.bgGradient}`}
                  >
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0 group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 ${opt.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {opt.title}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-slate-800/80 text-slate-500">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* View 2: Khata Entry Form */}
          {activeOption === 'khata' && (
            <form onSubmit={handleSubmitKhata} className="space-y-3.5">
              {/* Type Toggle: Gave (Debit) vs Got (Credit) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setKhataType('debit')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    khataType === 'debit'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>You Gave (दिया / उधार)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKhataType('credit')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    khataType === 'credit'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>You Got (मिला / Received)</span>
                </button>
              </div>

              {/* Customer Selector / New Customer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Customer *
                  </label>
                  <button
                    type="button"
                    onClick={() => setKhataIsNewCust(!khataIsNewCust)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {khataIsNewCust ? 'Select Existing' : '+ New Customer'}
                  </button>
                </div>

                {!khataIsNewCust ? (
                  <select
                    required
                    value={khataCustId}
                    onChange={(e) => setKhataCustId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - Due: {formatINR(c.outstandingBalance)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Customer Name *"
                      value={khataNewCustName}
                      onChange={(e) => setKhataNewCustName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile No."
                      value={khataNewCustPhone}
                      onChange={(e) => setKhataNewCustPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Amount & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="e.g. 2500"
                    value={khataAmount}
                    onChange={(e) => setKhataAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={khataMode}
                    onChange={(e) => setKhataMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={khataDate}
                    onChange={(e) => setKhataDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Notes / Bill Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grain supply invoice"
                    value={khataNote}
                    onChange={(e) => setKhataNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all active:scale-98 cursor-pointer ${
                  khataType === 'debit' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Record Khata Entry
              </button>
            </form>
          )}

          {/* View 3: New Invoice Form */}
          {activeOption === 'invoice' && (
            <form onSubmit={handleSubmitInvoice} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Invoice Type
                  </label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="sales">Sales Invoice</option>
                    <option value="purchase">Purchase Order</option>
                    <option value="quotation">Estimate / Quotation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer
                  </label>
                  <select
                    value={invCustId}
                    onChange={(e) => {
                      setInvCustId(e.target.value);
                      const sel = customers.find(c => c.id === e.target.value);
                      if (sel) setInvCustName(sel.name);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="">Walk-in / Enter Name below</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!invCustId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Customer / Company Name"
                    value={invCustName}
                    onChange={(e) => setInvCustName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* Line Item */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Item Details
                </label>
                <input
                  type="text"
                  required
                  placeholder="Item / Service description *"
                  value={invItemName}
                  onChange={(e) => setInvItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={invItemQty}
                      onChange={(e) => setInvItemQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1200"
                      value={invItemPrice}
                      onChange={(e) => setInvItemPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">GST %</label>
                    <select
                      value={invItemTax}
                      onChange={(e) => setInvItemTax(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates & Paid status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="invIsPaid"
                    checked={invIsPaid}
                    onChange={(e) => setInvIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="invIsPaid" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Mark as Paid Instantly
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Create &amp; Save Invoice
              </button>
            </form>
          )}

          {/* View 4: Expense Voucher Form */}
          {activeOption === 'expense' && (
            <form onSubmit={handleSubmitExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse electricity bill, Staff lunch"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
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
                    placeholder="e.g. 3500"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Travel & Transport">Travel &amp; Transport</option>
                    <option value="Tax & Legal">Tax &amp; Legal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={expMode}
                    onChange={(e) => setExpMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Receipt number or vendor notes"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Log Expense Voucher
              </button>
            </form>
          )}

          {/* View 5: Savings Goal & Fund Deposit Form */}
          {activeOption === 'savings' && (
            <div className="space-y-4">
              {/* Tab Selector: Add Funds vs Create New Goal */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSavingsMode('add_fund')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    savingsMode === 'add_fund'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Select Goal & Add Funds</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavingsMode('create_goal')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    savingsMode === 'create_goal'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Goal</span>
                </button>
              </div>

              {/* Mode A: Add Funds to Existing Goal */}
              {savingsMode === 'add_fund' && (
                <>
                  {savingsGoals.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-center space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Koi Existing Savings Goal Nahi Mila
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Funds add karne ke liye pehle ek naya Savings Goal banayein.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSavingsMode('create_goal')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Naya Savings Goal Banayein
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddFundToGoal} className="space-y-3.5">
                      {/* Select Existing Goal Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Select Savings Goal *
                          </label>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            {savingsGoals.length} Goal{savingsGoals.length > 1 ? 's' : ''} Available
                          </span>
                        </div>
                        <select
                          value={selectedGoalId || savingsGoals[0]?.id || ''}
                          onChange={(e) => setSelectedGoalId(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                        >
                          {savingsGoals.map((g) => {
                            const pct = Math.min(100, Math.round(((Number(g.currentAmount) || 0) / (Number(g.targetAmount) || 1)) * 100));
                            return (
                              <option key={g.id} value={g.id}>
                                {g.title} — {formatINR(g.currentAmount)} / {formatINR(g.targetAmount)} ({pct}%)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Selected Goal Snapshot Card */}
                      {(() => {
                        const activeGoal = savingsGoals.find(g => g.id === (selectedGoalId || savingsGoals[0]?.id));
                        if (!activeGoal) return null;
                        const pct = Math.min(100, Math.round(((Number(activeGoal.currentAmount) || 0) / (Number(activeGoal.targetAmount) || 1)) * 100));
                        const remaining = Math.max(0, activeGoal.targetAmount - activeGoal.currentAmount);

                        return (
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/70 dark:border-amber-800/40 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {activeGoal.title}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                {activeGoal.category}
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between text-xs">
                              <div>
                                <span className="text-[11px] text-slate-500">Currently Saved: </span>
                                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                  {formatINR(activeGoal.currentAmount)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500">Target: </span>
                                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                                  {formatINR(activeGoal.targetAmount)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium">
                                <span>{pct}% Completed</span>
                                <span>{remaining > 0 ? `${formatINR(remaining)} remaining` : '🎉 Goal Target Reached!'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Deposit Amount Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Amount to Add (₹) *
                          </label>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            placeholder="Enter deposit amount e.g. 5000"
                            value={savDepositAmount}
                            onChange={(e) => setSavDepositAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 text-base font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </div>

                        {/* Quick Amount Suggestion Chips */}
                        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                          {[500, 1000, 2000, 5000, 10000].map((chipVal) => (
                            <button
                              key={chipVal}
                              type="button"
                              onClick={() => {
                                const currentVal = parseFloat(savDepositAmount) || 0;
                                setSavDepositAmount((currentVal + chipVal).toString());
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all shrink-0 cursor-pointer"
                            >
                              +{formatINR(chipVal)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Deposit Date & Notes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Deposit Date
                          </label>
                          <input
                            type="date"
                            value={savDepositDate}
                            onChange={(e) => setSavDepositDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Note / Reason (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Daily profit, Bonus deposit"
                            value={savDepositNote}
                            onChange={(e) => setSavDepositNote(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/25 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <PiggyBank className="w-4 h-4" />
                        <span>
                          {savDepositAmount && Number(savDepositAmount) > 0
                            ? `Add ${formatINR(parseFloat(savDepositAmount))} to Goal`
                            : 'Add Funds to Selected Goal'}
                        </span>
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* Mode B: Create New Goal */}
              {savingsMode === 'create_goal' && (
                <form onSubmit={handleSubmitSavings} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Goal Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual GST Tax Reserve, New Machinery"
                      value={savTitle}
                      onChange={(e) => setSavTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Target Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 100000"
                        value={savTarget}
                        onChange={(e) => setSavTarget(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Initial Deposit (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={savCurrent}
                        onChange={(e) => setSavCurrent(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Category
                      </label>
                      <select
                        value={savCategory}
                        onChange={(e) => setSavCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
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
                        Target Deadline
                      </label>
                      <input
                        type="date"
                        value={savDeadline}
                        onChange={(e) => setSavDeadline(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Savings Goal</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* View 6: Document Vault Form */}
          {activeOption === 'document' && (
            <form onSubmit={handleSubmitDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST Certificate 2026, Shop Trade License"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Document Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="tax">Tax / GST / PAN</option>
                    <option value="contract">Contracts &amp; Deeds</option>
                    <option value="identity">Identity &amp; KYC</option>
                    <option value="invoice">Invoice Document</option>
                    <option value="bill">Utility Bill</option>
                    <option value="receipt">Payment Receipt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Related Entity (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank of Baroda, Vendor"
                    value={docRelatedName}
                    onChange={(e) => setDocRelatedName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Attach File (PDF, Image)
                </label>
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {docFileName || 'Click to upload document'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {docFileSize !== '0 KB' ? `${docFileSize} • Ready to store` : 'PDF, JPG, PNG up to 10MB'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDocFilePicker}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Upload &amp; Securely Save
              </button>
            </form>
          )}

          {/* View 7: Customer CRM Form */}
          {activeOption === 'customer' && (
            <form onSubmit={handleSubmitCustomer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar General Store"
                    value={custBusiness}
                    onChange={(e) => setCustBusiness(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Category
                  </label>
                  <select
                    value={custCategory}
                    onChange={(e) => setCustCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <option value="Regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  City / Address
                </label>
                <input
                  type="text"
                  placeholder="Market road, shop no..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Save Customer to CRM
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
