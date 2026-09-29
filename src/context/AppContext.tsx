'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  UserProfile,
  Customer,
  Transaction,
  Invoice,
  Product,
  Expense,
  SavingsGoal,
  PaymentReminder,
  DocumentItem,
  SystemSettings,
  PaymentSettings,
  UserRole
} from '@/types';
import { StorageService } from '@/services/storage';
import { initialUserProfile, initialSystemSettings } from '@/services/mockData';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  transaction?: Transaction;
}

interface AppContextType {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  customers: Customer[];
  transactions: Transaction[];
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  reminders: PaymentReminder[];
  documents: DocumentItem[];
  settings: SystemSettings;
  darkMode: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  toggleDarkMode: () => void;
  
  // Data actions
  saveCustomer: (cust: Customer) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (txn: Transaction) => void;
  updateTransaction: (txn: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTransactionAttachments: (transactionId: string, attachments: string[]) => void;
  saveInvoice: (inv: Invoice) => void;
  saveProduct: (prod: Product) => void;
  adjustStock: (productId: string, delta: number) => void;
  addExpense: (exp: Expense) => void;
  deleteExpense: (id: string) => void;
  saveSavingsGoal: (goal: SavingsGoal) => void;
  saveReminder: (rem: PaymentReminder) => void;
  addDocument: (doc: DocumentItem) => void;
  updateSettings: (settings: SystemSettings) => void;
  
  // UPI and QR Default Persistence (Key User Requirement)
  saveDefaultUpiAndQr: (data: { upiId: string; payeeName: string; customQrUrl?: string }) => void;
  
  // Quick Collect Modal State
  isCollectModalOpen: boolean;
  collectModalData: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    amount?: number;
    note?: string;
  };
  openCollectModal: (data?: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    amount?: number;
    note?: string;
  }) => void;
  closeCollectModal: () => void;

  // Global Toast Notifications
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error', transaction?: Transaction) => void;
  removeToast: (id: string) => void;

  // Cloud Auth & Per-User Isolation
  currentUser: UserProfile | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; businessName?: string; phone?: string; role?: UserRole }) => Promise<void>;
  logout: () => void;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  syncWithDatabase: () => Promise<void>;

  // Payment Details Modal & Sound Notification
  activePaymentDetail: Transaction | null;
  openPaymentDetail: (txn: Transaction) => void;
  closePaymentDetail: () => void;
  playPaymentNotificationSound: () => void;

  // Refresh / Reload
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfileState] = useState<UserProfile>(initialUserProfile);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [settings, setSettingsState] = useState<SystemSettings>(initialSystemSettings);
  const [darkMode, setDarkMode] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('business_owner');

  // Collect Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectModalData, setCollectModalData] = useState<{
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    amount?: number;
    note?: string;
  }>({});

  // Current Auth User & Cloud Sync
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => {
    return StorageService.getCurrentUser();
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Sync all in-memory data to MongoDB Atlas
  const syncWithDatabase = async (targetUser?: UserProfile | null) => {
    const activeU = targetUser !== undefined ? targetUser : currentUser;
    const userId = activeU?.id || 'usr_001';

    try {
      setCloudSyncStatus('syncing');
      const payload = {
        userId,
        data: {
          customers,
          transactions,
          products,
          invoices,
          expenses,
          savingsGoals,
          reminders,
          documents,
          settings,
          profile,
        },
      };

      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCloudSyncStatus('synced');
      } else {
        setCloudSyncStatus('error');
      }
    } catch (e) {
      console.warn('MongoDB background sync deferred:', e);
      setCloudSyncStatus('offline');
    }
  };

  // Load user data from MongoDB Atlas
  const loadUserDataFromCloud = async (userId: string) => {
    try {
      setCloudSyncStatus('syncing');
      const res = await fetch(`/api/db/sync?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          // If user has existing records in cloud MongoDB Atlas, load them
          if (d.customers && d.customers.length > 0) setCustomers(d.customers);
          if (d.transactions && d.transactions.length > 0) setTransactions(d.transactions);
          if (d.products && d.products.length > 0) setProducts(d.products);
          if (d.invoices && d.invoices.length > 0) setInvoices(d.invoices);
          if (d.expenses && d.expenses.length > 0) setExpenses(d.expenses);
          if (d.savingsGoals && d.savingsGoals.length > 0) setSavingsGoals(d.savingsGoals);
          if (d.reminders && d.reminders.length > 0) setReminders(d.reminders);
          if (d.documents && d.documents.length > 0) setDocuments(d.documents);
          if (d.settings) setSettingsState(d.settings);
          if (d.user) setProfileState(d.user);

          // Update local cache for 0ms offline availability
          StorageService.setAllUserData(d);
          setCloudSyncStatus('synced');
          return;
        }
      }
      setCloudSyncStatus('synced');
    } catch (err) {
      console.warn('Could not load user data from cloud:', err);
      setCloudSyncStatus('offline');
    }
  };

  // Login handler
  const login = async (loginEmail: string, loginPass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPass }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed. Please check your credentials.');
    }

    const user: UserProfile = data.user;
    setCurrentUserState(user);
    StorageService.setCurrentUser(user);

    // Refresh profile in memory
    setProfileState(user);
    if (user.role) setActiveRole(user.role);

    // Load isolated data from MongoDB Atlas for this user
    await loadUserDataFromCloud(user.id);
    addToast('Signed In Successfully', `Welcome back, ${user.name}! Your MongoDB Atlas ledger is loaded.`, 'success');
  };

  // Register handler
  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
    phone?: string;
    role?: UserRole;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Registration failed.');
    }

    const user: UserProfile = data.user;
    setCurrentUserState(user);
    StorageService.setCurrentUser(user);

    setProfileState(user);
    if (user.role) setActiveRole(user.role);

    // Load user's fresh database records from MongoDB Atlas
    await loadUserDataFromCloud(user.id);
    addToast('Account Created & Database Initialized', `Welcome, ${user.name}! Your isolated cloud ledger is active.`, 'success');
  };

  // Logout handler
  const logout = () => {
    setCurrentUserState(null);
    StorageService.setCurrentUser(null);
    refreshData();
    addToast('Signed Out', 'You have logged out of your account.', 'info');
  };

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Payment Details Modal
  const [activePaymentDetail, setActivePaymentDetail] = useState<Transaction | null>(null);

  const openPaymentDetail = (txn: Transaction) => {
    setActivePaymentDetail(txn);
  };

  const closePaymentDetail = () => {
    setActivePaymentDetail(null);
  };

  // Synthesize fintech chime using Web Audio API
  const playPaymentNotificationSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch (err) {
      console.warn('Audio playback not permitted yet:', err);
    }
  };

  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    transaction?: Transaction
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type, transaction }]);
    setTimeout(() => {
      removeToast(id);
    }, transaction ? 8000 : 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshData = () => {
    StorageService.initializeDefaults();
    setProfileState(StorageService.getProfile());
    setCustomers(StorageService.getCustomers());
    setTransactions(StorageService.getTransactions());
    setProducts(StorageService.getProducts());
    setInvoices(StorageService.getInvoices());
    setExpenses(StorageService.getExpenses());
    setSavingsGoals(StorageService.getSavingsGoals());
    setReminders(StorageService.getReminders());
    setDocuments(StorageService.getDocuments());
    const s = StorageService.getSettings();
    setSettingsState(s);
    setDarkMode(s.darkMode);
  };

  useEffect(() => {
    refreshData();
    setMounted(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'skp_transactions' && e.newValue) {
        try {
          const freshTxns: Transaction[] = JSON.parse(e.newValue);
          const oldTxns = StorageService.getTransactions();
          if (freshTxns.length > oldTxns.length) {
            const latest = freshTxns[0];
            if (latest && (latest.type === 'collection' || latest.type === 'credit' || latest.type === 'income')) {
              playPaymentNotificationSound();
              addToast(
                '💰 Payment Received!',
                `₹${latest.amount.toLocaleString('en-IN')} received from ${latest.customerName || 'Customer'}. Click to view details.`,
                'success',
                latest
              );
            }
          }
          refreshData();
        } catch {
          refreshData();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, mounted]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    const updated = { ...settings, darkMode: nextMode };
    setSettingsState(updated);
    StorageService.updateSettings(updated);
  };

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    StorageService.updateProfile(p);
    addToast('Profile Updated', 'Business and merchant profile saved successfully.', 'success');
  };

  const updateSettings = (newSettings: SystemSettings) => {
    setSettingsState(newSettings);
    StorageService.updateSettings(newSettings);
    addToast('Settings Saved', 'System configurations updated successfully.', 'success');
    syncWithDatabase();
  };

  // Dedicated Save Default UPI & QR
  const saveDefaultUpiAndQr = (data: { upiId: string; payeeName: string; customQrUrl?: string }) => {
    const updatedPaymentSettings = StorageService.saveDefaultUpiAndQr({
      upiId: data.upiId.trim(),
      payeeName: data.payeeName.trim(),
      customQrUrl: data.customQrUrl,
      isDefaultQrSaved: true,
    });
    setSettingsState(prev => ({
      ...prev,
      paymentSettings: updatedPaymentSettings,
    }));
    addToast(
      'Default UPI & QR Saved!',
      `UPI: ${data.upiId} will be loaded automatically for all payment collections.`,
      'success'
    );
  };

  const saveCustomer = (cust: Customer) => {
    const updated = StorageService.saveCustomer(cust);
    setCustomers(updated);
    addToast('Customer Saved', `${cust.name} record has been saved.`, 'success');
    syncWithDatabase();
  };

  const deleteCustomer = (id: string) => {
    const updated = StorageService.deleteCustomer(id);
    setCustomers(updated);
    addToast('Customer Deleted', 'Customer was removed from records.', 'info');
    syncWithDatabase();
  };

  const addTransaction = (txn: Transaction) => {
    const updatedTxns = StorageService.addTransaction(txn);
    setTransactions(updatedTxns);
    setCustomers(StorageService.getCustomers()); // balance changed
    syncWithDatabase();

    if (txn.type === 'collection' || txn.type === 'credit' || txn.type === 'income') {
      playPaymentNotificationSound();
      addToast(
        '💰 Payment Received!',
        `₹${txn.amount.toLocaleString('en-IN')} received from ${txn.customerName || 'Customer'}. Click to view details.`,
        'success',
        txn
      );
    } else {
      addToast('Transaction Recorded', `${txn.type.toUpperCase()}: ₹${txn.amount.toLocaleString('en-IN')} added.`, 'success');
    }
  };

  const updateTransaction = (txn: Transaction) => {
    const updatedTxns = StorageService.updateTransaction(txn);
    setTransactions(updatedTxns);
    setCustomers(StorageService.getCustomers()); // balance updated
    addToast('Transaction Updated', `₹${txn.amount.toLocaleString('en-IN')} updated successfully.`, 'success');
  };

  const deleteTransaction = (id: string) => {
    const updatedTxns = StorageService.deleteTransaction(id);
    setTransactions(updatedTxns);
    setCustomers(StorageService.getCustomers()); // balance updated
    addToast('Transaction Deleted', 'Transaction was removed from the ledger.', 'info');
  };

  const updateTransactionAttachments = (transactionId: string, attachments: string[]) => {
    const updatedTxns = StorageService.updateTransactionAttachments(transactionId, attachments);
    setTransactions(updatedTxns);
    addToast('Attachment Removed', 'File was removed from the bill record.', 'info');
  };

  const saveInvoice = (inv: Invoice) => {
    const updated = StorageService.saveInvoice(inv);
    setInvoices(updated);
    addToast('Invoice Saved', `Invoice #${inv.invoiceNumber} has been updated.`, 'success');
    syncWithDatabase();
  };

  const saveProduct = (prod: Product) => {
    const updated = StorageService.saveProduct(prod);
    setProducts(updated);
    addToast('Inventory Updated', `${prod.name} saved to stock.`, 'success');
    syncWithDatabase();
  };

  const adjustStock = (productId: string, delta: number) => {
    const updated = StorageService.adjustStock(productId, delta);
    setProducts(updated);
    addToast('Stock Adjusted', `Stock quantity modified by ${delta > 0 ? '+' : ''}${delta}.`, 'info');
  };

  const addExpense = (exp: Expense) => {
    const updated = StorageService.addExpense(exp);
    setExpenses(updated);
    addToast('Expense Logged', `₹${exp.amount.toLocaleString('en-IN')} logged under ${exp.category}.`, 'success');
    syncWithDatabase();
  };

  const deleteExpense = (id: string) => {
    const updated = StorageService.deleteExpense(id);
    setExpenses(updated);
    addToast('Expense Removed', 'Expense item deleted.', 'info');
  };

  const saveSavingsGoal = (goal: SavingsGoal) => {
    const updated = StorageService.saveSavingsGoal(goal);
    setSavingsGoals(updated);
    addToast('Savings Goal Saved', `${goal.title} updated.`, 'success');
  };

  const saveReminder = (rem: PaymentReminder) => {
    const updated = StorageService.saveReminder(rem);
    setReminders(updated);
    addToast('Reminder Scheduled', `Reminder for ${rem.customerName} saved.`, 'info');
  };

  const addDocument = (doc: DocumentItem) => {
    const updated = StorageService.addDocument(doc);
    setDocuments(updated);
    addToast('Document Uploaded', `${doc.title} uploaded successfully.`, 'success');
  };

  const openCollectModal = (data: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    amount?: number;
    note?: string;
  } = {}) => {
    setCollectModalData(data);
    setIsCollectModalOpen(true);
  };

  const closeCollectModal = () => {
    setIsCollectModalOpen(false);
    setCollectModalData({});
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        customers,
        transactions,
        products,
        invoices,
        expenses,
        savingsGoals,
        reminders,
        documents,
        settings,
        darkMode,
        activeRole,
        setActiveRole,
        toggleDarkMode,
        saveCustomer,
        deleteCustomer,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateTransactionAttachments,
        saveInvoice,
        saveProduct,
        adjustStock,
        addExpense,
        deleteExpense,
        saveSavingsGoal,
        saveReminder,
        addDocument,
        updateSettings,
        saveDefaultUpiAndQr,
        isCollectModalOpen,
        collectModalData,
        openCollectModal,
        closeCollectModal,
        toasts,
        addToast,
        removeToast,
        activePaymentDetail,
        openPaymentDetail,
        closePaymentDetail,
        playPaymentNotificationSound,
        currentUser,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        cloudSyncStatus,
        syncWithDatabase,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
