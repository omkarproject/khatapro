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


// Current Active User & Scoping Helper for strict multi-user isolation
export function getActiveUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('skp_auth_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id || null;
  } catch {
    return null;
  }
}

export function getScopedKey(baseKey: string): string {
  const userId = getActiveUserId();
  if (userId) {
    return `${baseKey}_${userId}`;
  }
  return baseKey;
}

// Safe localStorage helper for SSR
function getLocalItem<T>(rawKey: string, defaultValue: T): T {
  const key = getScopedKey(rawKey);
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setLocalItem<T>(rawKey: string, value: T): void {
  const key = getScopedKey(rawKey);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

export const getCleanDefaultSettings = (businessName: string = '', phone: string = '', email: string = ''): SystemSettings => ({
  backendProvider: 'mongodb',
  mongodbUri: 'mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0',
  mongodbDbName: 'smartkhata_db',
  businessName: businessName || '',
  businessTagline: 'Track Money, Manage Business, Grow Faster',
  businessPhone: phone || '',
  businessEmail: email || '',
  businessAddress: '',
  paymentSettings: {
    collectionMode: 'direct_upi',
    upiId: '', // Clean blank: user sets their own UPI ID
    payeeName: businessName || '',
    customQrUrl: '', // Clean blank: user sets/uploads their own QR
    isDefaultQrSaved: false,
    businessGst: '',
    currency: 'INR',
    enableSoundAlerts: true,
    cashfreeAppId: '', // Clean blank: user sets their own API keys
    cashfreeSecretKey: '',
    cashfreeEnv: 'production',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayWebhookSecret: '',
    razorpayEnv: 'live',
    upiGatewayProvider: 'Cashfree UPI Gateway',
    upiGatewayKey: '',
    upiGatewaySecret: '',
    upiGatewayWebhookUrl: '',
  },
  darkMode: false,
});

export const StorageService = {
  // Auth User Session (Per-User Isolation)
  getCurrentUser: (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('skp_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setCurrentUser: (user: UserProfile | null): void => {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem('skp_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('skp_auth_user');
    }
  },

  // Bulk set all user data from cloud MongoDB Atlas
  setAllUserData: (data: {
    customers?: Customer[];
    transactions?: Transaction[];
    products?: Product[];
    invoices?: Invoice[];
    expenses?: Expense[];
    savingsGoals?: SavingsGoal[];
    reminders?: PaymentReminder[];
    documents?: DocumentItem[];
    settings?: SystemSettings;
    user?: UserProfile;
  }) => {
    if (typeof window === 'undefined') return;
    if (data.customers !== undefined) setLocalItem(STORAGE_KEYS.CUSTOMERS, data.customers);
    if (data.transactions !== undefined) setLocalItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
    if (data.products !== undefined) setLocalItem(STORAGE_KEYS.PRODUCTS, data.products);
    if (data.invoices !== undefined) setLocalItem(STORAGE_KEYS.INVOICES, data.invoices);
    if (data.expenses !== undefined) setLocalItem(STORAGE_KEYS.EXPENSES, data.expenses);
    if (data.savingsGoals !== undefined) setLocalItem(STORAGE_KEYS.SAVINGS, data.savingsGoals);
    if (data.reminders !== undefined) setLocalItem(STORAGE_KEYS.REMINDERS, data.reminders);
    if (data.documents !== undefined) setLocalItem(STORAGE_KEYS.DOCUMENTS, data.documents);
    if (data.settings !== undefined) setLocalItem(STORAGE_KEYS.SETTINGS, data.settings);
    if (data.user !== undefined) setLocalItem(STORAGE_KEYS.PROFILE, data.user);
  },

  // Initialize clean user data if not already present (No pre-filled mock records)
  initializeDefaults: () => {
    if (typeof window === 'undefined') return;
    const curUser = StorageService.getCurrentUser();
    const isInit = localStorage.getItem(getScopedKey(STORAGE_KEYS.INITIALIZED));
    if (!isInit) {
      if (curUser) {
        setLocalItem(STORAGE_KEYS.PROFILE, curUser);
        setLocalItem(STORAGE_KEYS.SETTINGS, getCleanDefaultSettings(curUser.businessName, curUser.phone, curUser.email));
      }
      setLocalItem(STORAGE_KEYS.CUSTOMERS, []);
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, []);
      setLocalItem(STORAGE_KEYS.PRODUCTS, []);
      setLocalItem(STORAGE_KEYS.INVOICES, []);
      setLocalItem(STORAGE_KEYS.EXPENSES, []);
      setLocalItem(STORAGE_KEYS.SAVINGS, []);
      setLocalItem(STORAGE_KEYS.REMINDERS, []);
      setLocalItem(STORAGE_KEYS.DOCUMENTS, []);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.INITIALIZED), 'true');
    }
  },

  // Reset to clean user data
  resetDefaults: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getScopedKey(STORAGE_KEYS.INITIALIZED));
    StorageService.initializeDefaults();
  },

  // Profile
  getProfile: (): UserProfile => {
    const cur = StorageService.getCurrentUser();
    if (cur) return cur;
    return getLocalItem(STORAGE_KEYS.PROFILE, {
      id: 'guest',
      name: '',
      email: '',
      phone: '',
      role: 'business_owner',
      businessName: '',
      businessGst: '',
      businessAddress: '',
      createdAt: new Date().toISOString(),
    });
  },
  updateProfile: (profile: UserProfile): void => setLocalItem(STORAGE_KEYS.PROFILE, profile),

  // Settings & Persistent UPI / QR configuration
  getSettings: (): SystemSettings => {
    const curUser = StorageService.getCurrentUser();
    const defaults = getCleanDefaultSettings(curUser?.businessName, curUser?.phone, curUser?.email);
    const s = getLocalItem(STORAGE_KEYS.SETTINGS, defaults);
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
    return getLocalItem(STORAGE_KEYS.CUSTOMERS, []);
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
    // Also remove ledger transactions linked to this customer
    const txns = StorageService.getTransactions().filter(t => t.customerId !== id);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, txns);
    return customers;
  },

  // Transactions / Ledger Entries
  getTransactions: (): Transaction[] => {
    return getLocalItem(STORAGE_KEYS.TRANSACTIONS, []);
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
  getInvoices: (): Invoice[] => getLocalItem(STORAGE_KEYS.INVOICES, []),
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
  deleteInvoice: (id: string): Invoice[] => {
    const list = StorageService.getInvoices().filter(i => i.id !== id);
    setLocalItem(STORAGE_KEYS.INVOICES, list);
    return list;
  },

  // Products & Inventory
  getProducts: (): Product[] => getLocalItem(STORAGE_KEYS.PRODUCTS, []),
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
  deleteProduct: (id: string): Product[] => {
    const list = StorageService.getProducts().filter(p => p.id !== id);
    setLocalItem(STORAGE_KEYS.PRODUCTS, list);
    return list;
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
  getExpenses: (): Expense[] => getLocalItem(STORAGE_KEYS.EXPENSES, []),
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
  getSavingsGoals: (): SavingsGoal[] => getLocalItem(STORAGE_KEYS.SAVINGS, []),
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
  deleteSavingsGoal: (id: string): SavingsGoal[] => {
    const list = StorageService.getSavingsGoals().filter(g => g.id !== id);
    setLocalItem(STORAGE_KEYS.SAVINGS, list);
    return list;
  },

  // Payment Reminders
  getReminders: (): PaymentReminder[] => getLocalItem(STORAGE_KEYS.REMINDERS, []),
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
  deleteReminder: (id: string): PaymentReminder[] => {
    const list = StorageService.getReminders().filter(r => r.id !== id);
    setLocalItem(STORAGE_KEYS.REMINDERS, list);
    return list;
  },

  // Documents
  getDocuments: (): DocumentItem[] => getLocalItem(STORAGE_KEYS.DOCUMENTS, []),
  addDocument: (doc: DocumentItem): DocumentItem[] => {
    const list = StorageService.getDocuments();
    const updated = [doc, ...list];
    setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);
    return updated;
  },
  deleteDocument: (id: string): DocumentItem[] => {
    const list = StorageService.getDocuments().filter(d => d.id !== id);
    setLocalItem(STORAGE_KEYS.DOCUMENTS, list);
    return list;
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
