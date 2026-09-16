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
  PaymentSettings
} from '@/types';

import {
  initialUserProfile,
  initialCustomers,
  initialTransactions,
  initialProducts,
  initialInvoices,
  initialExpenses,
  initialSavingsGoals,
  initialReminders,
  initialDocuments,
  initialSystemSettings
} from './mockData';

const STORAGE_KEYS = {
  PROFILE: 'skp_user_profile',
  CUSTOMERS: 'skp_customers',
  TRANSACTIONS: 'skp_transactions',
  PRODUCTS: 'skp_products',
  INVOICES: 'skp_invoices',
  EXPENSES: 'skp_expenses',
  SAVINGS: 'skp_savings',
  REMINDERS: 'skp_reminders',
  DOCUMENTS: 'skp_documents',
  SETTINGS: 'skp_settings',
  INITIALIZED: 'skp_db_v1_initialized',
};

// Safe localStorage helper for SSR
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

export const StorageService = {
  // Initialize default data if not already present
  initializeDefaults: () => {
    if (typeof window === 'undefined') return;
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      setLocalItem(STORAGE_KEYS.PROFILE, initialUserProfile);
      setLocalItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
      setLocalItem(STORAGE_KEYS.PRODUCTS, initialProducts);
      setLocalItem(STORAGE_KEYS.INVOICES, initialInvoices);
      setLocalItem(STORAGE_KEYS.EXPENSES, initialExpenses);
      setLocalItem(STORAGE_KEYS.SAVINGS, initialSavingsGoals);
      setLocalItem(STORAGE_KEYS.REMINDERS, initialReminders);
      setLocalItem(STORAGE_KEYS.DOCUMENTS, initialDocuments);
      setLocalItem(STORAGE_KEYS.SETTINGS, initialSystemSettings);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } else {
      // Migrate legacy "Rajesh Sharma" profile to "Anant Kumar Yadav"
      const existing = StorageService.getProfile();
      if (existing.name === 'Rajesh Sharma') {
        setLocalItem(STORAGE_KEYS.PROFILE, {
          ...existing,
          name: initialUserProfile.name,
          phone: initialUserProfile.phone,
          businessName: initialUserProfile.businessName,
        });
      }
      // Migrate legacy settings if needed (only if user hasn't saved custom settings)
      const existingSettings = StorageService.getSettings();
      if (
        !existingSettings.paymentSettings?.isDefaultQrSaved &&
        !existingSettings.paymentSettings?.cashfreeAppId &&
        (existingSettings.paymentSettings?.payeeName === 'Sharma Traders Enterprise' ||
          existingSettings.paymentSettings?.upiId === 'sharma.traders@okaxis' ||
          existingSettings.businessPhone === '8924024859' ||
          existingSettings.paymentSettings?.upiId === '8924024859@upi')
      ) {
        setLocalItem(STORAGE_KEYS.SETTINGS, {
          ...existingSettings,
          businessPhone: initialSystemSettings.businessPhone,
          paymentSettings: {
            ...existingSettings.paymentSettings,
            upiId: initialSystemSettings.paymentSettings.upiId,
            payeeName: initialSystemSettings.paymentSettings.payeeName,
            customQrUrl: initialSystemSettings.paymentSettings.customQrUrl,
          },
        });
      }
      // Auto-migrate gateway environment to production/live as test mode has been deprecated
      const currentSettings = StorageService.getSettings();
      if (
        currentSettings.paymentSettings?.cashfreeEnv === 'sandbox' ||
        currentSettings.paymentSettings?.razorpayEnv === 'test'
      ) {
        setLocalItem(STORAGE_KEYS.SETTINGS, {
          ...currentSettings,
          paymentSettings: {
            ...currentSettings.paymentSettings,
            cashfreeEnv: 'production',
            razorpayEnv: 'live',
          },
        });
      }
      if (!currentSettings.mongodbUri) {
        setLocalItem(STORAGE_KEYS.SETTINGS, {
          ...currentSettings,
          mongodbUri: initialSystemSettings.mongodbUri,
          mongodbDbName: initialSystemSettings.mongodbDbName,
        });
      }
    }
  },

  // Reset to default sample data
  resetDefaults: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    StorageService.initializeDefaults();
  },

  // Profile
  getProfile: (): UserProfile => getLocalItem(STORAGE_KEYS.PROFILE, initialUserProfile),
  updateProfile: (profile: UserProfile): void => setLocalItem(STORAGE_KEYS.PROFILE, profile),

  // Settings & Persistent UPI / QR configuration
  getSettings: (): SystemSettings => {
    const s = getLocalItem(STORAGE_KEYS.SETTINGS, initialSystemSettings);
    if (s.paymentSettings) {
      if (s.paymentSettings.cashfreeEnv === 'sandbox') {
        s.paymentSettings.cashfreeEnv = 'production';
      }
      if (s.paymentSettings.razorpayEnv === 'test') {
        s.paymentSettings.razorpayEnv = 'live';
      }
    }
    return s;
  },
  updateSettings: (settings: SystemSettings): void => setLocalItem(STORAGE_KEYS.SETTINGS, settings),
  
  // Custom UPI & QR quick save helper (as requested by user)
  saveDefaultUpiAndQr: (paymentSettings: Partial<PaymentSettings>): PaymentSettings => {
    const current = StorageService.getSettings();
    const updated: PaymentSettings = {
      ...current.paymentSettings,
      ...paymentSettings,
      isDefaultQrSaved: true,
    };
    StorageService.updateSettings({
      ...current,
      paymentSettings: updated,
    });
    return updated;
  },

  // Customers
  getCustomers: (): Customer[] => {
    const list = getLocalItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    if (!list.some(c => c.id === 'cust_datta_more')) {
      const datta = initialCustomers.find(c => c.id === 'cust_datta_more');
      if (datta) {
        const merged = [datta, ...list];
        setLocalItem(STORAGE_KEYS.CUSTOMERS, merged);
        return merged;
      }
    }
    return list;
  },
  saveCustomer: (customer: Customer): Customer[] => {
    const customers = StorageService.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    let updated: Customer[];
    if (idx >= 0) {
      updated = [...customers];
      updated[idx] = customer;
    } else {
      updated = [customer, ...customers];
    }
    setLocalItem(STORAGE_KEYS.CUSTOMERS, updated);
    return updated;
  },
  deleteCustomer: (id: string): Customer[] => {
    const customers = StorageService.getCustomers().filter(c => c.id !== id);
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customers;
  },

  // Transactions / Ledger Entries
  getTransactions: (): Transaction[] => {
    const list = getLocalItem(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
    if (!list.some(t => t.customerId === 'cust_datta_more')) {
      const dattaTxns = initialTransactions.filter(t => t.customerId === 'cust_datta_more');
      if (dattaTxns.length > 0) {
        const merged = [...dattaTxns, ...list];
        setLocalItem(STORAGE_KEYS.TRANSACTIONS, merged);
        return merged;
      }
    }
    return list;
  },
  addTransaction: (transaction: Transaction): Transaction[] => {
    const list = StorageService.getTransactions();
    const updated = [transaction, ...list];
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);

    // If transaction is linked to customer (credit, debit, collection), update customer balance
    if (transaction.customerId) {
      const customers = StorageService.getCustomers();
      const custIdx = customers.findIndex(c => c.id === transaction.customerId);
      if (custIdx >= 0) {
        const cust = { ...customers[custIdx] };
        if (transaction.type === 'credit') {
          cust.outstandingBalance += transaction.amount;
        } else if (transaction.type === 'debit' || transaction.type === 'collection') {
          cust.outstandingBalance -= transaction.amount;
        }
        customers[custIdx] = cust;
        setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return updated;
  },
  updateTransactionAttachments: (transactionId: string, attachments: string[]): Transaction[] => {
    const list = StorageService.getTransactions();
    const idx = list.findIndex(t => t.id === transactionId);
    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = {
        ...updated[idx],
        attachments,
      };
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);
      return updated;
    }
    return list;
  },
  updateTransaction: (updatedTxn: Transaction): Transaction[] => {
    const list = StorageService.getTransactions();
    const idx = list.findIndex(t => t.id === updatedTxn.id);
    if (idx < 0) return list;

    const oldTxn = list[idx];
    const updatedList = [...list];
    updatedList[idx] = updatedTxn;
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updatedList);

    // Re-adjust customer balance accurately
    if (updatedTxn.customerId) {
      const customers = StorageService.getCustomers();
      const custIdx = customers.findIndex(c => c.id === updatedTxn.customerId);
      if (custIdx >= 0) {
        const cust = { ...customers[custIdx] };
        // Reverse old transaction impact
        if (oldTxn.type === 'credit') {
          cust.outstandingBalance -= oldTxn.amount;
        } else if (oldTxn.type === 'debit' || oldTxn.type === 'collection') {
          cust.outstandingBalance += oldTxn.amount;
        }
        // Apply new transaction impact
        if (updatedTxn.type === 'credit') {
          cust.outstandingBalance += updatedTxn.amount;
        } else if (updatedTxn.type === 'debit' || updatedTxn.type === 'collection') {
          cust.outstandingBalance -= updatedTxn.amount;
        }
        customers[custIdx] = cust;
        setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return updatedList;
  },
  deleteTransaction: (transactionId: string): Transaction[] => {
    const list = StorageService.getTransactions();
    const txnToDelete = list.find(t => t.id === transactionId);
    if (!txnToDelete) return list;

    const updatedList = list.filter(t => t.id !== transactionId);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updatedList);

    // Reverse customer balance impact
    if (txnToDelete.customerId) {
      const customers = StorageService.getCustomers();
      const custIdx = customers.findIndex(c => c.id === txnToDelete.customerId);
      if (custIdx >= 0) {
        const cust = { ...customers[custIdx] };
        if (txnToDelete.type === 'credit') {
          cust.outstandingBalance -= txnToDelete.amount;
        } else if (txnToDelete.type === 'debit' || txnToDelete.type === 'collection') {
          cust.outstandingBalance += txnToDelete.amount;
        }
        customers[custIdx] = cust;
        setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return updatedList;
  },

  // Invoices
  getInvoices: (): Invoice[] => getLocalItem(STORAGE_KEYS.INVOICES, initialInvoices),
  saveInvoice: (invoice: Invoice): Invoice[] => {
    const list = StorageService.getInvoices();
    const idx = list.findIndex(i => i.id === invoice.id);
    let updated: Invoice[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = invoice;
    } else {
      updated = [invoice, ...list];
    }
    setLocalItem(STORAGE_KEYS.INVOICES, updated);
    return updated;
  },

  // Products & Inventory
  getProducts: (): Product[] => getLocalItem(STORAGE_KEYS.PRODUCTS, initialProducts),
  saveProduct: (product: Product): Product[] => {
    const list = StorageService.getProducts();
    const idx = list.findIndex(p => p.id === product.id);
    let updated: Product[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = product;
    } else {
      updated = [product, ...list];
    }
    setLocalItem(STORAGE_KEYS.PRODUCTS, updated);
    return updated;
  },
  adjustStock: (productId: string, quantityChange: number): Product[] => {
    const list = StorageService.getProducts();
    const idx = list.findIndex(p => p.id === productId);
    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = {
        ...updated[idx],
        currentStock: Math.max(0, updated[idx].currentStock + quantityChange),
        updatedAt: new Date().toISOString(),
      };
      setLocalItem(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    }
    return list;
  },

  // Expenses
  getExpenses: (): Expense[] => getLocalItem(STORAGE_KEYS.EXPENSES, initialExpenses),
  addExpense: (expense: Expense): Expense[] => {
    const list = StorageService.getExpenses();
    const updated = [expense, ...list];
    setLocalItem(STORAGE_KEYS.EXPENSES, updated);
    return updated;
  },
  deleteExpense: (id: string): Expense[] => {
    const list = StorageService.getExpenses().filter(e => e.id !== id);
    setLocalItem(STORAGE_KEYS.EXPENSES, list);
    return list;
  },

  // Savings Goals
  getSavingsGoals: (): SavingsGoal[] => getLocalItem(STORAGE_KEYS.SAVINGS, initialSavingsGoals),
  saveSavingsGoal: (goal: SavingsGoal): SavingsGoal[] => {
    const list = StorageService.getSavingsGoals();
    const idx = list.findIndex(g => g.id === goal.id);
    let updated: SavingsGoal[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = goal;
    } else {
      updated = [goal, ...list];
    }
    setLocalItem(STORAGE_KEYS.SAVINGS, updated);
    return updated;
  },

  // Payment Reminders
  getReminders: (): PaymentReminder[] => getLocalItem(STORAGE_KEYS.REMINDERS, initialReminders),
  saveReminder: (reminder: PaymentReminder): PaymentReminder[] => {
    const list = StorageService.getReminders();
    const idx = list.findIndex(r => r.id === reminder.id);
    let updated: PaymentReminder[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = reminder;
    } else {
      updated = [reminder, ...list];
    }
    setLocalItem(STORAGE_KEYS.REMINDERS, updated);
    return updated;
  },

  // Documents
  getDocuments: (): DocumentItem[] => getLocalItem(STORAGE_KEYS.DOCUMENTS, initialDocuments),
  addDocument: (doc: DocumentItem): DocumentItem[] => {
    const list = StorageService.getDocuments();
    const updated = [doc, ...list];
    setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);
    return updated;
  },

  // Full Database JSON Export / Import
  exportFullDatabaseJSON: (): string => {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: StorageService.getProfile(),
      settings: StorageService.getSettings(),
      customers: StorageService.getCustomers(),
      transactions: StorageService.getTransactions(),
      invoices: StorageService.getInvoices(),
      products: StorageService.getProducts(),
      expenses: StorageService.getExpenses(),
      savings: StorageService.getSavingsGoals(),
      reminders: StorageService.getReminders(),
      documents: StorageService.getDocuments(),
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreFullDatabaseJSON: (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profile) setLocalItem(STORAGE_KEYS.PROFILE, data.profile);
      if (data.settings) setLocalItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.customers) setLocalItem(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.transactions) setLocalItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.invoices) setLocalItem(STORAGE_KEYS.INVOICES, data.invoices);
      if (data.products) setLocalItem(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.expenses) setLocalItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.savings) setLocalItem(STORAGE_KEYS.SAVINGS, data.savings);
      if (data.reminders) setLocalItem(STORAGE_KEYS.REMINDERS, data.reminders);
      if (data.documents) setLocalItem(STORAGE_KEYS.DOCUMENTS, data.documents);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return true;
    } catch (e) {
      console.error('Failed to parse and restore database backup:', e);
      return false;
    }
  }
};
