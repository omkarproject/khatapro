import {
  UserProfile,
  Customer,
  Transaction,
  Invoice,
  InvoiceItem,
  Product,
  Expense,
  SavingsGoal,
  PaymentReminder,
  DocumentItem,
  SystemSettings,
  PaymentSettings,
  CustomerDriveFolder,
  CustomerDriveFile,
  CustomerBankAccount,
  CustomerUpiDetail,
  NoteItem,
  TaskItem,
  PasswordItem,
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
  NOTES: 'skp_notes',
  TASKS: 'skp_tasks',
  PASSWORDS: 'skp_passwords',
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

export const getCleanDefaultSettings = (businessName: string = '', phone: string = '', email: string = ''): SystemSettings => {
  let globalWebName = 'SmartKhata';
  let globalWebLogo = '';
  let globalWebFavicon = '';
  let globalWebBadge = 'PRO';

  if (typeof window !== 'undefined') {
    try {
      if (typeof document !== 'undefined') {
        const badgeMatch = document.cookie.match(/(?:^|;\s*)skp_brand_badge=([^;]+)/);
        if (badgeMatch && badgeMatch[1]) {
          globalWebBadge = decodeURIComponent(badgeMatch[1]);
        }
        const nameMatch = document.cookie.match(/(?:^|;\s*)skp_brand_name=([^;]+)/);
        if (nameMatch && nameMatch[1]) {
          globalWebName = decodeURIComponent(nameMatch[1]);
        }
      }
      if (typeof localStorage !== 'undefined') {
        const storedBadge = localStorage.getItem('skp_brand_badge');
        if (storedBadge !== null && storedBadge !== undefined) globalWebBadge = storedBadge;
        const storedName = localStorage.getItem('skp_brand_name');
        if (storedName) globalWebName = storedName;
        const rawB = localStorage.getItem('skp_global_branding');
        if (rawB) {
          const b = JSON.parse(rawB);
          if (b.websiteName) globalWebName = b.websiteName;
          if (b.websiteLogo !== undefined) globalWebLogo = b.websiteLogo;
          if (b.websiteFavicon !== undefined) globalWebFavicon = b.websiteFavicon;
          if (b.websiteBadgeText !== undefined) globalWebBadge = b.websiteBadgeText;
        }
        const rawG = localStorage.getItem('skp_global_system_config');
        if (rawG) {
          const g = JSON.parse(rawG);
          if (g.websiteBranding) {
            if (g.websiteBranding.websiteName && (!rawB || !globalWebName)) globalWebName = g.websiteBranding.websiteName;
            if (g.websiteBranding.websiteLogo && !globalWebLogo) globalWebLogo = g.websiteBranding.websiteLogo;
            if (g.websiteBranding.websiteFavicon && !globalWebFavicon) globalWebFavicon = g.websiteBranding.websiteFavicon;
            if (g.websiteBranding.websiteBadgeText !== undefined && !rawB) globalWebBadge = g.websiteBranding.websiteBadgeText;
          }
        }
      }
    } catch {}
  }

  // If favicon is not explicitly set, use the website logo as the favicon!
  if (!globalWebFavicon && globalWebLogo) {
    globalWebFavicon = globalWebLogo;
  }

  return {
    backendProvider: 'supabase',
    supabaseUrl: 'https://axpbydzszykqwojamblh.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIzNTcsImV4cCI6MjEwNzI4ODM1N30.MOkM9DqTFr5nB4mYj-Z3n9FEta1Pi0tSSJ0tTWxsxF0',
    supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjM1NywiZXhwIjoyMTA3Mjg4MzU3fQ.oUgYxGo6-WWyioLkhmPuldiCWf4pANvEl7vnPyNyyNs',
    googleDriveSettings: {
      clientId: '997421467008-nbhomb8nrp56opa09og9od1t68pa049j.apps.googleusercontent.com',
      clientSecret: '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',
      redirectUri: 'https://khatapro-sandy.vercel.app/api/backup/google-drive/callback',
    },
    businessName: businessName || '',
    businessLogo: '',
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
    monthlyBudgetCap: 150000,
    darkMode: false,
    maintenanceMode: {
      enabled: false,
      durationMinutes: 15,
      reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
    },
    betaTestingEnabled: false,
    websiteName: globalWebName,
    websiteLogo: globalWebLogo,
    websiteFavicon: globalWebFavicon,
    websiteBadgeText: globalWebBadge,
  };
};

export const StorageService = {
  // Auth User Session (Per-User Isolation)
  getCurrentUser: (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('skp_auth_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      // STRICT ROLE RULE: Only system owner (anantyadav8924@gmail.com) can have super_admin.
      // Auto-correct any legacy merchant records accidentally cached as super_admin.
      if (user && (user.role === 'admin' || user.role === 'super_admin') && user.email !== 'anantyadav8924@gmail.com') {
        user.role = 'user';
        try { localStorage.setItem('skp_auth_user', JSON.stringify(user)); } catch {}
      }
      return user;
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
    notes?: NoteItem[];
    tasks?: TaskItem[];
    passwords?: PasswordItem[];
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
    if (data.notes !== undefined) setLocalItem(STORAGE_KEYS.NOTES, data.notes);
    if (data.tasks !== undefined) setLocalItem(STORAGE_KEYS.TASKS, data.tasks);
    if (data.passwords !== undefined) setLocalItem(STORAGE_KEYS.PASSWORDS, data.passwords);
    if (data.settings !== undefined) {
      const existingSettings = StorageService.getSettings();
      const existingProfile = StorageService.getProfile();
      const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
      const incomingLogo = data.settings?.businessLogo || data.user?.avatarUrl || (data.user as any)?.avatar_url || '';
      const finalLogo = incomingLogo || existingSettings?.businessLogo || existingProfile?.avatarUrl || globalLogo;

      if (finalLogo && typeof window !== 'undefined') {
        try { localStorage.setItem('khatapro_business_logo', finalLogo); } catch {}
      }

      const mergedPaymentSettings = {
        ...(existingSettings?.paymentSettings || {}),
        ...(data.settings.paymentSettings || {}),
        // Preserve saved UPI ID and QR if cloud returns empty
        upiId: (data.settings.paymentSettings?.upiId || '').trim() || existingSettings?.paymentSettings?.upiId || '',
        payeeName: (data.settings.paymentSettings?.payeeName || '').trim() || existingSettings?.paymentSettings?.payeeName || existingSettings?.businessName || '',
        customQrUrl: data.settings.paymentSettings?.customQrUrl || existingSettings?.paymentSettings?.customQrUrl || '',
        isDefaultQrSaved: data.settings.paymentSettings?.isDefaultQrSaved ?? existingSettings?.paymentSettings?.isDefaultQrSaved ?? false,
      };
      const mergedSettings = {
        ...existingSettings,
        ...data.settings,
        businessLogo: finalLogo,
        paymentSettings: mergedPaymentSettings,
      };
      setLocalItem(STORAGE_KEYS.SETTINGS, mergedSettings);

      if (
        data.settings.websiteName ||
        data.settings.websiteLogo ||
        data.settings.websiteFavicon ||
        data.settings.websiteBadgeText !== undefined
      ) {
        try {
          const brandObj = {
            websiteName: data.settings.websiteName || existingSettings?.websiteName || 'SmartKhata',
            websiteLogo: data.settings.websiteLogo || existingSettings?.websiteLogo || '',
            websiteFavicon: data.settings.websiteFavicon || existingSettings?.websiteFavicon || '',
            websiteBadgeText: data.settings.websiteBadgeText !== undefined ? data.settings.websiteBadgeText : (existingSettings?.websiteBadgeText || 'PRO'),
          };
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('skp_global_branding', JSON.stringify(brandObj));
            if (brandObj.websiteBadgeText !== undefined) localStorage.setItem('skp_brand_badge', brandObj.websiteBadgeText);
            if (brandObj.websiteName) localStorage.setItem('skp_brand_name', brandObj.websiteName);
          }
          if (typeof document !== 'undefined') {
            document.cookie = `skp_brand_badge=${encodeURIComponent(brandObj.websiteBadgeText)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            document.cookie = `skp_brand_name=${encodeURIComponent(brandObj.websiteName)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
          }
        } catch {}
      }
    }
    if (data.user !== undefined) {
      const existingProfile = StorageService.getProfile();
      const existingSettings = StorageService.getSettings();
      const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
      const incomingAvatar = data.user?.avatarUrl || (data.user as any)?.avatar_url || data.settings?.businessLogo || '';
      const finalAvatar = incomingAvatar || existingProfile?.avatarUrl || existingSettings?.businessLogo || globalLogo;

      const mergedUser: UserProfile = {
        ...existingProfile,
        ...data.user,
        avatarUrl: finalAvatar,
      };
      setLocalItem(STORAGE_KEYS.PROFILE, mergedUser);
      const cur = StorageService.getCurrentUser();
      if (cur) {
        StorageService.setCurrentUser({ ...cur, ...mergedUser, avatarUrl: finalAvatar });
      }
    }
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
      setLocalItem(STORAGE_KEYS.NOTES, []);
      setLocalItem(STORAGE_KEYS.TASKS, []);
      setLocalItem(STORAGE_KEYS.PASSWORDS, []);
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
    const stored = getLocalItem<UserProfile | null>(STORAGE_KEYS.PROFILE, null as any);
    const settings = getLocalItem<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null as any);
    let res: UserProfile;
    if (stored && (stored.businessName || stored.name || stored.email)) {
      res = cur ? { ...cur, ...stored } : stored;
    } else if (cur) {
      res = { ...cur };
    } else {
      res = {
        id: 'guest',
        name: '',
        email: '',
        phone: '',
        role: 'business_owner',
        businessName: '',
        businessGst: '',
        businessAddress: '',
        createdAt: new Date().toISOString(),
      };
    }
    // If settings has a specific businessName saved by the merchant, ensure profile mirrors it
    if (settings?.businessName && settings.businessName.trim()) {
      res.businessName = settings.businessName.trim();
    }
    return res;
  },
  updateProfile: (profile: UserProfile): void => {
    setLocalItem(STORAGE_KEYS.PROFILE, profile);
    const cur = StorageService.getCurrentUser();
    if (cur) {
      StorageService.setCurrentUser({ ...cur, ...profile });
    }
    const curSettings = StorageService.getSettings();
    const settingsUpdate: Partial<SystemSettings> = {};
    if (profile.businessName && profile.businessName.trim()) {
      settingsUpdate.businessName = profile.businessName.trim();
    }
    if (profile.avatarUrl !== undefined) {
      settingsUpdate.businessLogo = profile.avatarUrl;
      if (profile.avatarUrl) {
        try { localStorage.setItem('khatapro_business_logo', profile.avatarUrl); } catch {}
      }
    }
    if (Object.keys(settingsUpdate).length > 0) {
      setLocalItem(STORAGE_KEYS.SETTINGS, { ...curSettings, ...settingsUpdate });
    }
  },

  getSettings: (): SystemSettings => {
    const curUser = StorageService.getCurrentUser();
    const defaults = getCleanDefaultSettings(curUser?.businessName, curUser?.phone, curUser?.email);
    const s = getLocalItem(STORAGE_KEYS.SETTINGS, defaults);

    // Merge cached global system config (maintenanceMode & betaTestingEnabled & websiteBranding)
    if (typeof window !== 'undefined') {
      try {
        const rawGlobal = localStorage.getItem('skp_global_system_config');
        if (rawGlobal) {
          const globalConf = JSON.parse(rawGlobal);
          if (globalConf.maintenanceMode) {
            s.maintenanceMode = globalConf.maintenanceMode;
          }
          if (globalConf.betaTestingEnabled !== undefined) {
            s.betaTestingEnabled = Boolean(globalConf.betaTestingEnabled);
          }
          if (globalConf.websiteBranding) {
            if (globalConf.websiteBranding.websiteName) s.websiteName = globalConf.websiteBranding.websiteName;
            if (globalConf.websiteBranding.websiteLogo !== undefined) s.websiteLogo = globalConf.websiteBranding.websiteLogo;
            if (globalConf.websiteBranding.websiteFavicon !== undefined) s.websiteFavicon = globalConf.websiteBranding.websiteFavicon;
            if (globalConf.websiteBranding.websiteBadgeText !== undefined) s.websiteBadgeText = globalConf.websiteBranding.websiteBadgeText;
          }
        }
        const rawBranding = localStorage.getItem('skp_global_branding');
        if (rawBranding) {
          const brandConf = JSON.parse(rawBranding);
          if (brandConf.websiteName) s.websiteName = brandConf.websiteName;
          if (brandConf.websiteLogo !== undefined) s.websiteLogo = brandConf.websiteLogo;
          if (brandConf.websiteFavicon !== undefined) s.websiteFavicon = brandConf.websiteFavicon;
          if (brandConf.websiteBadgeText !== undefined) s.websiteBadgeText = brandConf.websiteBadgeText;
        }
      } catch {}
    }

    if (!s.websiteFavicon && s.websiteLogo) {
      s.websiteFavicon = s.websiteLogo;
    }

    return s;
  },
  updateSettings: (settings: Partial<SystemSettings>): SystemSettings => {
    const cur = StorageService.getSettings();
    const merged: SystemSettings = { ...cur, ...settings };
    setLocalItem(STORAGE_KEYS.SETTINGS, merged);
    
    const storedProfile = getLocalItem<UserProfile | null>(STORAGE_KEYS.PROFILE, null as any);
    const curUser = StorageService.getCurrentUser();

    if (merged.businessName && merged.businessName.trim()) {
      if (storedProfile) {
        setLocalItem(STORAGE_KEYS.PROFILE, { ...storedProfile, businessName: merged.businessName.trim() });
      }
      if (curUser) {
        StorageService.setCurrentUser({ ...curUser, businessName: merged.businessName.trim() });
      }
    }

    if (merged.businessLogo !== undefined) {
      if (merged.businessLogo) {
        try { localStorage.setItem('khatapro_business_logo', merged.businessLogo); } catch {}
      }
      if (storedProfile) {
        setLocalItem(STORAGE_KEYS.PROFILE, { ...storedProfile, avatarUrl: merged.businessLogo });
      }
      if (curUser) {
        StorageService.setCurrentUser({ ...curUser, avatarUrl: merged.businessLogo });
      }
    }

    if (
      merged.websiteName !== undefined ||
      merged.websiteLogo !== undefined ||
      merged.websiteFavicon !== undefined ||
      merged.websiteBadgeText !== undefined
    ) {
      try {
        const brandObj = {
          websiteName: merged.websiteName || 'SmartKhata',
          websiteLogo: merged.websiteLogo || '',
          websiteFavicon: merged.websiteFavicon || merged.websiteLogo || '',
          websiteBadgeText: merged.websiteBadgeText !== undefined ? merged.websiteBadgeText : 'PRO',
        };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('skp_global_branding', JSON.stringify(brandObj));
          const existingGlobal = localStorage.getItem('skp_global_system_config');
          const globalObj = existingGlobal ? JSON.parse(existingGlobal) : {};
          globalObj.websiteBranding = brandObj;
          localStorage.setItem('skp_global_system_config', JSON.stringify(globalObj));
          if (brandObj.websiteBadgeText !== undefined) {
            localStorage.setItem('skp_brand_badge', brandObj.websiteBadgeText);
          }
          if (brandObj.websiteName) {
            localStorage.setItem('skp_brand_name', brandObj.websiteName);
          }
        }
        if (typeof document !== 'undefined') {
          document.cookie = `skp_brand_badge=${encodeURIComponent(brandObj.websiteBadgeText)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
          document.cookie = `skp_brand_name=${encodeURIComponent(brandObj.websiteName)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
        }
      } catch {}
    }

    return merged;
  },
  
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

    // Inventory Stock Adjustment Logic
    const products = StorageService.getProducts();
    let productsChanged = false;
    const prodMap = new Map(products.map(p => [p.id, { ...p }]));

    const findProduct = (item: InvoiceItem): Product | undefined => {
      if (item.productId && prodMap.has(item.productId)) return prodMap.get(item.productId);
      const itemLowerName = (item.name || '').toLowerCase().trim();
      if (!itemLowerName) return undefined;
      for (const p of prodMap.values()) {
        if (
          p.name.toLowerCase().trim() === itemLowerName ||
          (p.sku && p.sku.toLowerCase().trim() === itemLowerName)
        ) {
          return p;
        }
      }
      return undefined;
    };

    if (invoice.type === 'sales') {
      const oldInv = idx >= 0 ? list[idx] : null;
      const isNowPaid = invoice.status === 'paid';
      const wasPaid = oldInv ? (oldInv.status === 'paid' || !!oldInv.stockDeducted) : false;

      if (isNowPaid && !wasPaid) {
        // Status changed to PAID: deduct stock!
        (invoice.items || []).forEach(newItem => {
          const p = findProduct(newItem);
          if (p) {
            p.currentStock = Math.max(0, p.currentStock - (newItem.quantity || 0));
            p.updatedAt = new Date().toISOString();
            productsChanged = true;
          }
        });
        invoice.stockDeducted = true;
      } else if (!isNowPaid && wasPaid) {
        // Status changed from PAID to UNPAID / other: RESTORE stock!
        const itemsToRestore = oldInv ? oldInv.items : invoice.items;
        (itemsToRestore || []).forEach(oldItem => {
          const p = findProduct(oldItem);
          if (p) {
            p.currentStock = p.currentStock + (oldItem.quantity || 0);
            p.updatedAt = new Date().toISOString();
            productsChanged = true;
          }
        });
        invoice.stockDeducted = false;
      } else if (isNowPaid && wasPaid) {
        // Was paid and remains paid: adjust differences in items if edited
        if (oldInv) {
          (oldInv.items || []).forEach(oldItem => {
            const p = findProduct(oldItem);
            if (p) {
              p.currentStock = p.currentStock + (oldItem.quantity || 0);
              p.updatedAt = new Date().toISOString();
              productsChanged = true;
            }
          });
        }
        (invoice.items || []).forEach(newItem => {
          const p = findProduct(newItem);
          if (p) {
            p.currentStock = Math.max(0, p.currentStock - (newItem.quantity || 0));
            p.updatedAt = new Date().toISOString();
            productsChanged = true;
          }
        });
        invoice.stockDeducted = true;
      } else {
        // Unpaid and remains unpaid: ensure stock is not deducted
        invoice.stockDeducted = false;
      }
    }

    if (productsChanged) {
      setLocalItem(STORAGE_KEYS.PRODUCTS, Array.from(prodMap.values()));
    }

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
    const list = StorageService.getInvoices();
    const invToDelete = list.find(i => i.id === id);
    if (invToDelete && invToDelete.type === 'sales' && invToDelete.stockDeducted) {
      const products = StorageService.getProducts();
      let productsChanged = false;
      const prodMap = new Map(products.map(p => [p.id, { ...p }]));

      const findProduct = (item: InvoiceItem): Product | undefined => {
        if (item.productId && prodMap.has(item.productId)) return prodMap.get(item.productId);
        const itemLowerName = (item.name || '').toLowerCase().trim();
        if (!itemLowerName) return undefined;
        for (const p of prodMap.values()) {
          if (
            p.name.toLowerCase().trim() === itemLowerName ||
            (p.sku && p.sku.toLowerCase().trim() === itemLowerName)
          ) {
            return p;
          }
        }
        return undefined;
      };

      (invToDelete.items || []).forEach(item => {
        const p = findProduct(item);
        if (p) {
          p.currentStock = p.currentStock + (item.quantity || 0);
          p.updatedAt = new Date().toISOString();
          productsChanged = true;
        }
      });

      if (productsChanged) {
        setLocalItem(STORAGE_KEYS.PRODUCTS, Array.from(prodMap.values()));
      }
    }

    const updated = list.filter(i => i.id !== id);
    setLocalItem(STORAGE_KEYS.INVOICES, updated);
    return updated;
  },
  reconcileInvoiceStock: (): boolean => {
    if (typeof window === 'undefined') return false;
    const invoices = StorageService.getInvoices();
    const products = StorageService.getProducts();
    let changed = false;
    const prodMap = new Map(products.map(p => [p.id, { ...p }]));

    const findProduct = (item: InvoiceItem): Product | undefined => {
      if (item.productId && prodMap.has(item.productId)) return prodMap.get(item.productId);
      const itemLowerName = (item.name || '').toLowerCase().trim();
      if (!itemLowerName) return undefined;
      for (const p of prodMap.values()) {
        if (
          p.name.toLowerCase().trim() === itemLowerName ||
          (p.sku && p.sku.toLowerCase().trim() === itemLowerName)
        ) {
          return p;
        }
      }
      return undefined;
    };

    const updatedInvoices = invoices.map(inv => {
      if (inv.type === 'sales') {
        if (inv.status === 'paid' && !inv.stockDeducted) {
          (inv.items || []).forEach(item => {
            const p = findProduct(item);
            if (p) {
              p.currentStock = Math.max(0, p.currentStock - (item.quantity || 0));
              p.updatedAt = new Date().toISOString();
              changed = true;
            }
          });
          return { ...inv, stockDeducted: true };
        } else if (inv.status !== 'paid' && inv.stockDeducted) {
          (inv.items || []).forEach(item => {
            const p = findProduct(item);
            if (p) {
              p.currentStock = p.currentStock + (item.quantity || 0);
              p.updatedAt = new Date().toISOString();
              changed = true;
            }
          });
          return { ...inv, stockDeducted: false };
        }
      }
      return inv;
    });

    if (changed) {
      setLocalItem(STORAGE_KEYS.PRODUCTS, Array.from(prodMap.values()));
      setLocalItem(STORAGE_KEYS.INVOICES, updatedInvoices);
    }
    return changed;
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

  // Customer Drive & Vault (Per-customer folders & documents)
  getCustomerDriveData: (customerId: string): { folders: CustomerDriveFolder[]; files: CustomerDriveFile[] } => {
    if (typeof window === 'undefined') return { folders: [], files: [] };
    const key = `skp_cust_drive_${customerId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to read customer drive', e);
    }
    // Default initial folders if none exist (matches Windows-style folders: AADHAR CARD, BILLS, DOCUMENTS)
    const defaultFolders: CustomerDriveFolder[] = [
      { id: 'fld_aadhar', name: 'AADHAR CARD', createdAt: new Date().toISOString() },
      { id: 'fld_bills', name: 'BILLS', createdAt: new Date().toISOString() },
      { id: 'fld_docs', name: 'DOCUMENTS', createdAt: new Date().toISOString() },
    ];
    const initial = { folders: defaultFolders, files: [] };
    try {
      localStorage.setItem(key, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  },
  saveCustomerDriveData: (customerId: string, data: { folders: CustomerDriveFolder[]; files: CustomerDriveFile[] }): void => {
    if (typeof window === 'undefined') return;
    const key = `skp_cust_drive_${customerId}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save customer drive', e);
    }
  },
  getCustomerBankingData: (customerId: string): { bankAccounts: CustomerBankAccount[]; upiDetails: CustomerUpiDetail[] } => {
    if (typeof window === 'undefined') return { bankAccounts: [], upiDetails: [] };
    const customers = StorageService.getCustomers();
    const cust = customers.find(c => c.id === customerId);
    if (cust && (cust.bankAccounts || cust.upiDetails)) {
      return {
        bankAccounts: cust.bankAccounts || [],
        upiDetails: cust.upiDetails || [],
      };
    }
    const key = `skp_cust_bank_${customerId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return { bankAccounts: [], upiDetails: [] };
  },
  saveCustomerBankingData: (customerId: string, data: { bankAccounts: CustomerBankAccount[]; upiDetails: CustomerUpiDetail[] }): void => {
    if (typeof window === 'undefined') return;
    const key = `skp_cust_bank_${customerId}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
    const customers = StorageService.getCustomers();
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      cust.bankAccounts = data.bankAccounts;
      cust.upiDetails = data.upiDetails;
      StorageService.saveCustomer(cust);
    }
  },

  // Notes Management
  getNotes: (): NoteItem[] => getLocalItem<NoteItem[]>(STORAGE_KEYS.NOTES, []),
  saveNote: (note: NoteItem): NoteItem[] => {
    const list = StorageService.getNotes();
    const idx = list.findIndex(n => n.id === note.id);
    let updated: NoteItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = note;
    } else {
      updated = [note, ...list];
    }
    setLocalItem(STORAGE_KEYS.NOTES, updated);
    return updated;
  },
  deleteNote: (id: string): NoteItem[] => {
    const list = StorageService.getNotes();
    const updated = list.filter(n => n.id !== id);
    setLocalItem(STORAGE_KEYS.NOTES, updated);
    return updated;
  },

  // Tasks Management
  getTasks: (): TaskItem[] => getLocalItem<TaskItem[]>(STORAGE_KEYS.TASKS, []),
  saveTask: (task: TaskItem): TaskItem[] => {
    const list = StorageService.getTasks();
    const idx = list.findIndex(t => t.id === task.id);
    let updated: TaskItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = task;
    } else {
      updated = [task, ...list];
    }
    setLocalItem(STORAGE_KEYS.TASKS, updated);
    return updated;
  },
  toggleTask: (id: string): TaskItem[] => {
    const list = StorageService.getTasks();
    const updated = list.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.isCompleted;
        return {
          ...t,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });
    setLocalItem(STORAGE_KEYS.TASKS, updated);
    return updated;
  },
  deleteTask: (id: string): TaskItem[] => {
    const list = StorageService.getTasks();
    const updated = list.filter(t => t.id !== id);
    setLocalItem(STORAGE_KEYS.TASKS, updated);
    return updated;
  },

  // Password Manager
  getPasswords: (): PasswordItem[] => getLocalItem<PasswordItem[]>(STORAGE_KEYS.PASSWORDS, []),
  savePassword: (item: PasswordItem): PasswordItem[] => {
    const list = StorageService.getPasswords();
    const idx = list.findIndex(p => p.id === item.id);
    let updated: PasswordItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    setLocalItem(STORAGE_KEYS.PASSWORDS, updated);
    return updated;
  },
  deletePassword: (id: string): PasswordItem[] => {
    const list = StorageService.getPasswords();
    const updated = list.filter(p => p.id !== id);
    setLocalItem(STORAGE_KEYS.PASSWORDS, updated);
    return updated;
  },

  // Full Database JSON Export / Import
  exportFullDatabaseJSON: (includeMedia: boolean = true): string => {
    let expenses = StorageService.getExpenses();
    let documents = StorageService.getDocuments();
    let settings = StorageService.getSettings();
    let profile = StorageService.getProfile();

    if (!includeMedia) {
      // Strip heavy base64 data URLs if user requested lightweight backup without images/PDF
      expenses = expenses.map(e => ({ ...e, receiptImages: [] }));
      documents = documents.map(d => ({ ...d, fileUrl: d.fileUrl?.startsWith('data:') ? '' : d.fileUrl }));
      if (settings.businessLogo?.startsWith('data:')) {
        settings = { ...settings, businessLogo: '' };
      }
      if (settings.paymentSettings?.customQrUrl?.startsWith('data:')) {
        settings = {
          ...settings,
          paymentSettings: { ...settings.paymentSettings, customQrUrl: '' }
        };
      }
      if (profile.avatarUrl?.startsWith('data:')) {
        profile = { ...profile, avatarUrl: '' };
      }
    }

    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      includeMedia,
      profile,
      settings,
      customers: StorageService.getCustomers(),
      transactions: StorageService.getTransactions(),
      invoices: StorageService.getInvoices(),
      products: StorageService.getProducts(),
      expenses,
      savings: StorageService.getSavingsGoals(),
      reminders: StorageService.getReminders(),
      documents,
      notes: StorageService.getNotes(),
      tasks: StorageService.getTasks(),
      passwords: StorageService.getPasswords(),
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
      if (data.notes) setLocalItem(STORAGE_KEYS.NOTES, data.notes);
      if (data.tasks) setLocalItem(STORAGE_KEYS.TASKS, data.tasks);
      if (data.passwords) setLocalItem(STORAGE_KEYS.PASSWORDS, data.passwords);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return true;
    } catch (e) {
      console.error('Failed to parse and restore database backup:', e);
      return false;
    }
  },
};
