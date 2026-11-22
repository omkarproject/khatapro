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
  AuthenticatorItem,
  KhataGroup,
  KhataGroupNotification,
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
  AUTHENTICATOR: 'skp_authenticator',
  GROUPS: 'skp_groups',
  GROUP_NOTIFICATIONS: 'skp_group_notifications',
  PINNED_CHATS: 'skp_pinned_chats',
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

// In-memory cache to eliminate repetitive synchronous JSON.parse calls on low-end CPUs
const memoryCache = new Map<string, { value: any; raw: string | null }>();

// Clear in-memory cache when storage event triggers from another tab
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    memoryCache.clear();
  });
}

// Safe localStorage helper for SSR with High-Performance Memory Caching
function getLocalItem<T>(rawKey: string, defaultValue: T): T {
  const key = getScopedKey(rawKey);
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache.delete(key);
      return defaultValue;
    }
    const cached = memoryCache.get(key);
    if (cached && cached.raw === raw) {
      return cached.value as T;
    }
    const parsed = JSON.parse(raw) as T;
    memoryCache.set(key, { value: parsed, raw });
    return parsed;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setLocalItem<T>(rawKey: string, value: T): void {
  const key = getScopedKey(rawKey);
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(value);
    memoryCache.set(key, { value, raw });
    localStorage.setItem(key, raw);
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// -------------------------------------------------------------
// Deleted Record Registry: Prevents resurrected deleted records
// -------------------------------------------------------------
const DELETED_RECORD_KEYS = 'skp_deleted_record_ids';

export function getDeletedRecordIds(table: string): Set<string> {
  const all = getLocalItem<Record<string, string[]>>(DELETED_RECORD_KEYS, {});
  return new Set(all[table] || []);
}

export function getAllDeletedRecordIds(): Record<string, string[]> {
  return getLocalItem<Record<string, string[]>>(DELETED_RECORD_KEYS, {});
}

export function addDeletedRecordId(table: string, id: string): void {
  if (!id) return;
  const all = getLocalItem<Record<string, string[]>>(DELETED_RECORD_KEYS, {});
  const current = new Set(all[table] || []);
  current.add(id);
  all[table] = Array.from(current);
  setLocalItem(DELETED_RECORD_KEYS, all);
}

export function clearDeletedRecordIds(table?: string, ids?: string[]): void {
  const all = getLocalItem<Record<string, string[]>>(DELETED_RECORD_KEYS, {});
  if (!table) {
    setLocalItem(DELETED_RECORD_KEYS, {});
    return;
  }
  if (!ids || ids.length === 0) {
    delete all[table];
  } else {
    const set = new Set(all[table] || []);
    ids.forEach(id => set.delete(id));
    all[table] = Array.from(set);
  }
  setLocalItem(DELETED_RECORD_KEYS, all);
}

export const getCleanDefaultSettings = (businessName: string = '', phone: string = '', email: string = ''): SystemSettings => {
  let globalWebName = '';
  let globalWebLogo = '';
  let globalWebFavicon = '';
  let globalWebBadge = '';
  let globalWebBadgeBg = 'fintech-gradient-primary';
  let globalWebTagline = '';
  let globalWebSupportLocation = '';
  let globalWebSupportPhone = '';
  let globalWebSupportEmail = '';

  if (typeof window !== 'undefined') {
    try {
      if (typeof document !== 'undefined') {
        const badgeMatch = document.cookie.match(/(?:^|;\s*)skp_brand_badge=([^;]+)/);
        if (badgeMatch && badgeMatch[1]) {
          globalWebBadge = decodeURIComponent(badgeMatch[1]);
        }
        const badgeBgMatch = document.cookie.match(/(?:^|;\s*)skp_brand_badge_bg=([^;]+)/);
        if (badgeBgMatch && badgeBgMatch[1]) {
          globalWebBadgeBg = decodeURIComponent(badgeBgMatch[1]);
        }
        const tagMatch = document.cookie.match(/(?:^|;\s*)skp_brand_tagline=([^;]+)/);
        if (tagMatch && tagMatch[1]) {
          globalWebTagline = decodeURIComponent(tagMatch[1]);
        }
        const nameMatch = document.cookie.match(/(?:^|;\s*)skp_brand_name=([^;]+)/);
        if (nameMatch && nameMatch[1]) {
          globalWebName = decodeURIComponent(nameMatch[1]);
        }
        const logoMatch = document.cookie.match(/(?:^|;\s*)skp_brand_logo=([^;]+)/);
        if (logoMatch && logoMatch[1]) {
          globalWebLogo = decodeURIComponent(logoMatch[1]);
        }
        const favMatch = document.cookie.match(/(?:^|;\s*)skp_brand_favicon=([^;]+)/);
        if (favMatch && favMatch[1]) {
          globalWebFavicon = decodeURIComponent(favMatch[1]);
        }
      }
      if (typeof localStorage !== 'undefined') {
        const storedBadge = localStorage.getItem('skp_brand_badge');
        if (storedBadge !== null && storedBadge !== undefined) globalWebBadge = storedBadge;
        const storedBadgeBg = localStorage.getItem('skp_brand_badge_bg');
        if (storedBadgeBg) globalWebBadgeBg = storedBadgeBg;
        const storedTag = localStorage.getItem('skp_brand_tagline');
        if (storedTag !== null && storedTag !== undefined) globalWebTagline = storedTag;
        const storedName = localStorage.getItem('skp_brand_name');
        if (storedName) globalWebName = storedName;
        const storedLogo = localStorage.getItem('skp_brand_logo');
        if (storedLogo) globalWebLogo = storedLogo;
        const storedFav = localStorage.getItem('skp_brand_favicon');
        if (storedFav) globalWebFavicon = storedFav;
        const storedSuppLoc = localStorage.getItem('skp_brand_support_location');
        if (storedSuppLoc) globalWebSupportLocation = storedSuppLoc;
        const storedSuppPhone = localStorage.getItem('skp_brand_support_phone');
        if (storedSuppPhone) globalWebSupportPhone = storedSuppPhone;
        const storedSuppEmail = localStorage.getItem('skp_brand_support_email');
        if (storedSuppEmail) globalWebSupportEmail = storedSuppEmail;
        const rawB = localStorage.getItem('skp_global_branding');
        if (rawB) {
          const b = JSON.parse(rawB);
          if (b.websiteName) globalWebName = b.websiteName;
          if (b.websiteLogo !== undefined) globalWebLogo = b.websiteLogo;
          if (b.websiteFavicon !== undefined) globalWebFavicon = b.websiteFavicon;
          if (b.websiteBadgeText !== undefined) globalWebBadge = b.websiteBadgeText;
          if (b.websiteBadgeBg) globalWebBadgeBg = b.websiteBadgeBg;
          if (b.websiteTagline !== undefined) globalWebTagline = b.websiteTagline;
          if (b.websiteSupportLocation !== undefined) globalWebSupportLocation = b.websiteSupportLocation;
          if (b.websiteSupportPhone !== undefined) globalWebSupportPhone = b.websiteSupportPhone;
          if (b.websiteSupportEmail !== undefined) globalWebSupportEmail = b.websiteSupportEmail;
        }
        const rawG = localStorage.getItem('skp_global_system_config');
        if (rawG) {
          const g = JSON.parse(rawG);
          if (g.websiteBranding) {
            if (g.websiteBranding.websiteName && (!rawB || !globalWebName)) globalWebName = g.websiteBranding.websiteName;
            if (g.websiteBranding.websiteLogo && !globalWebLogo) globalWebLogo = g.websiteBranding.websiteLogo;
            if (g.websiteBranding.websiteFavicon && !globalWebFavicon) globalWebFavicon = g.websiteBranding.websiteFavicon;
            if (g.websiteBranding.websiteBadgeText !== undefined && !rawB) globalWebBadge = g.websiteBranding.websiteBadgeText;
            if (g.websiteBranding.websiteBadgeBg && (!rawB || !storedBadgeBg)) globalWebBadgeBg = g.websiteBranding.websiteBadgeBg;
            if (g.websiteBranding.websiteTagline !== undefined && (!rawB || !storedTag)) globalWebTagline = g.websiteBranding.websiteTagline;
            if (g.websiteBranding.websiteSupportLocation !== undefined && !rawB) globalWebSupportLocation = g.websiteBranding.websiteSupportLocation;
            if (g.websiteBranding.websiteSupportPhone !== undefined && !rawB) globalWebSupportPhone = g.websiteBranding.websiteSupportPhone;
            if (g.websiteBranding.websiteSupportEmail !== undefined && !rawB) globalWebSupportEmail = g.websiteBranding.websiteSupportEmail;
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
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    googleDriveSettings: {
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/api/backup/google-drive/callback` : '/api/backup/google-drive/callback'),
    },
    smtpSettings: {
      enabled: process.env.SMTP_ENABLED ? process.env.SMTP_ENABLED === 'true' : Boolean(process.env.SMTP_HOST),
      host: (process.env.SMTP_HOST || '').replace(/['"]/g, '').trim(),
      port: Number(process.env.SMTP_PORT) || 587,
      user: (process.env.SMTP_USER || '').replace(/['"]/g, '').trim(),
      pass: (process.env.SMTP_PASS || '').replace(/['"]/g, '').trim(),
      from: (process.env.SMTP_FROM || 'SmartKhata Cloud').replace(/['"]/g, '').trim(),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      triggers: {
        signupOtp: true,
        loginOtp: false,
        forgotPasswordOtp: true,
        welcomeEmail: true,
      },
    },
    allowNewRegistrations: true,
    businessName: businessName || '',
    businessLogo: '',
    businessTagline: 'Track Money, Manage Business, Grow Faster',
    businessPhone: phone || '',
    businessEmail: email || '',
    businessAddress: '',
    paymentSettings: {
      collectionMode: 'direct_upi',
      enabledGateways: {
        direct_upi: true,
        cashfree: false,
        razorpay: false,
        upi_gateway: false,
      },
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
    selectedInvoiceTemplate: 'template_minimal',
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
    websiteBadgeBg: globalWebBadgeBg,
    websiteTagline: globalWebTagline,
    websiteSupportLocation: globalWebSupportLocation,
    websiteSupportPhone: globalWebSupportPhone,
    websiteSupportEmail: globalWebSupportEmail,
  };
};

export const StorageService = {
  // Deleted Record Registry for Anti-Resurrection Cloud Sync
  getDeletedRecordIds: (table: string): Set<string> => getDeletedRecordIds(table),
  getAllDeletedRecordIds: (): Record<string, string[]> => getAllDeletedRecordIds(),
  addDeletedRecordId: (table: string, id: string): void => addDeletedRecordId(table, id),
  clearDeletedRecordIds: (table?: string, ids?: string[]): void => clearDeletedRecordIds(table, ids),

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

  // Bulk set all user data from cloud Supabase with intelligent two-way merge
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
    authenticators?: AuthenticatorItem[];
    settings?: SystemSettings;
    user?: UserProfile;
  }) => {
    if (typeof window === 'undefined') return;

    const mergeEntities = <T extends { id: string }>(localList: T[], incomingList?: T[], tableName?: string): T[] => {
      if (!Array.isArray(incomingList)) return localList;
      const deletedIds = tableName ? getDeletedRecordIds(tableName) : new Set<string>();

      // 1. Map all incoming cloud entities (excluding local pending deletions)
      const incomingMap = new Map<string, T>();
      incomingList.forEach(item => {
        if (item && item.id && !deletedIds.has(item.id)) {
          incomingMap.set(item.id, item);
        }
      });

      // 2. Map local entities (excluding local pending deletions)
      const localMap = new Map<string, T>();
      localList.forEach(item => {
        if (item && item.id && !deletedIds.has(item.id)) {
          localMap.set(item.id, item);
        }
      });

      const resultMap = new Map<string, T>();
      const now = Date.now();

      // 3. Cloud records are authoritative base:
      // If record exists in both, compare timestamps (updatedAt || createdAt)
      // Strictly newer version wins; if equal or cloud is newer, cloud wins.
      incomingMap.forEach((cloudItem, id) => {
        const localItem = localMap.get(id);
        if (!localItem) {
          resultMap.set(id, cloudItem);
        } else {
          const localTime = new Date((localItem as any).updatedAt || (localItem as any).updated_at || (localItem as any).deletedAt || (localItem as any).createdAt || 0).getTime();
          const cloudTime = new Date((cloudItem as any).updatedAt || (cloudItem as any).updated_at || (cloudItem as any).deletedAt || (cloudItem as any).createdAt || 0).getTime();

          const isLocalDeleted = (localItem as any).isDeleted || (localItem as any).status === 'deleted';
          const isCloudDeleted = (cloudItem as any).isDeleted || (cloudItem as any).status === 'deleted';

          if (isLocalDeleted && !isCloudDeleted && cloudTime <= localTime) {
            // Local soft-delete is pending upload
            resultMap.set(id, localItem);
          } else if (localTime > cloudTime) {
            // Local edit is strictly newer and pending upload
            resultMap.set(id, localItem);
          } else {
            // Cloud is newer or equal -> Cloud wins
            resultMap.set(id, cloudItem);
          }
        }
      });

      // 4. Preserve ONLY very recent local creations (< 45s) that haven't been pushed to cloud yet.
      // Older items missing from cloud were deleted on another device -> DO NOT KEEP!
      const seenTxnRefs = new Set<string>();
      if (tableName === 'transactions') {
        incomingMap.forEach((cloudItem: any) => {
          const r = (cloudItem.referenceNo || cloudItem.bill_number || '').trim();
          if (r) seenTxnRefs.add(r);
          const n = cloudItem.note || cloudItem.description || '';
          const m = n.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([A-Za-z0-9_-]+)/i);
          if (m) seenTxnRefs.add(m[1].trim());
        });
      }

      localMap.forEach((localItem, id) => {
        if (!incomingMap.has(id)) {
          if (tableName === 'transactions') {
            const r = ((localItem as any).referenceNo || ((localItem as any).bill_number) || '').trim();
            const n = (localItem as any).note || (localItem as any).description || '';
            const m = n.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([A-Za-z0-9_-]+)/i);
            const utr = m ? m[1].trim() : '';
            if ((r && seenTxnRefs.has(r)) || (utr && seenTxnRefs.has(utr))) {
              // Local item already captured in cloud list with server ID - do not duplicate
              return;
            }
          }
          const createdTime = new Date((localItem as any).createdAt || (localItem as any).date || 0).getTime();
          if (createdTime > 0 && (now - createdTime) < 45000) {
            resultMap.set(id, localItem);
          }
        }
      });

      return Array.from(resultMap.values());
    };

    if (data.customers !== undefined) setLocalItem(STORAGE_KEYS.CUSTOMERS, mergeEntities(StorageService.getCustomers(), data.customers, 'customers'));
    if (data.transactions !== undefined) setLocalItem(STORAGE_KEYS.TRANSACTIONS, mergeEntities(StorageService.getTransactions(), data.transactions, 'transactions'));
    StorageService.reconcileCustomerBalances();
    if (data.products !== undefined) setLocalItem(STORAGE_KEYS.PRODUCTS, mergeEntities(StorageService.getProducts(), data.products, 'products'));
    if (data.invoices !== undefined) setLocalItem(STORAGE_KEYS.INVOICES, mergeEntities(StorageService.getInvoices(), data.invoices, 'invoices'));
    if (data.expenses !== undefined) setLocalItem(STORAGE_KEYS.EXPENSES, mergeEntities(StorageService.getExpenses(), data.expenses, 'expenses'));
    if (data.savingsGoals !== undefined) setLocalItem(STORAGE_KEYS.SAVINGS, mergeEntities(StorageService.getSavingsGoals(), data.savingsGoals, 'savings_goals'));
    if (data.reminders !== undefined) setLocalItem(STORAGE_KEYS.REMINDERS, mergeEntities(StorageService.getReminders(), data.reminders, 'reminders'));
    if (data.documents !== undefined) setLocalItem(STORAGE_KEYS.DOCUMENTS, mergeEntities(StorageService.getDocuments(), data.documents, 'documents'));
    if (data.notes !== undefined) setLocalItem(STORAGE_KEYS.NOTES, mergeEntities(StorageService.getNotes(), data.notes, 'notes'));
    if (data.tasks !== undefined) setLocalItem(STORAGE_KEYS.TASKS, mergeEntities(StorageService.getTasks(), data.tasks, 'tasks'));
    if (data.passwords !== undefined) setLocalItem(STORAGE_KEYS.PASSWORDS, mergeEntities(StorageService.getPasswords(), data.passwords, 'passwords'));
    if (data.authenticators !== undefined) setLocalItem(STORAGE_KEYS.AUTHENTICATOR, mergeEntities(StorageService.getAuthenticators(), data.authenticators, 'authenticators'));
    if (data.settings !== undefined) {
      const existingSettings = StorageService.getSettings();
      const existingProfile = StorageService.getProfile();
      const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
      const incomingLogo = data.settings?.businessLogo !== undefined 
        ? data.settings.businessLogo 
        : (data.user?.avatarUrl !== undefined ? data.user.avatarUrl : ((data.user as any)?.avatar_url || ''));
      const finalLogo = incomingLogo !== undefined && incomingLogo !== null
        ? incomingLogo
        : (existingSettings?.businessLogo ?? existingProfile?.avatarUrl ?? globalLogo);

      if (finalLogo && typeof window !== 'undefined') {
        try { localStorage.setItem('khatapro_business_logo', finalLogo); } catch {}
      } else if (finalLogo === '' && typeof window !== 'undefined') {
        try { localStorage.removeItem('khatapro_business_logo'); } catch {}
      }

      const cloudPS = data.settings.paymentSettings || {};
      const localPS = existingSettings?.paymentSettings || {};
      const mergedPaymentSettings = {
        ...localPS,
        ...cloudPS,
        collectionMode: cloudPS.collectionMode || localPS.collectionMode || 'direct_upi',
        enabledGateways: cloudPS.enabledGateways || localPS.enabledGateways || {
          direct_upi: (cloudPS.collectionMode || localPS.collectionMode || 'direct_upi') === 'direct_upi',
          cashfree: (cloudPS.collectionMode || localPS.collectionMode) === 'cashfree',
          razorpay: (cloudPS.collectionMode || localPS.collectionMode) === 'razorpay',
          upi_gateway: (cloudPS.collectionMode || localPS.collectionMode) === 'upi_gateway',
        },
        upiId: (cloudPS.upiId || '').trim() || localPS.upiId || '',
        payeeName: (cloudPS.payeeName || '').trim() || localPS.payeeName || existingSettings?.businessName || '',
        customQrUrl: cloudPS.customQrUrl || localPS.customQrUrl || '',
        isDefaultQrSaved: cloudPS.isDefaultQrSaved ?? localPS.isDefaultQrSaved ?? false,
        cashfreeAppId: (cloudPS.cashfreeAppId || '').trim() || localPS.cashfreeAppId || '',
        cashfreeSecretKey: (cloudPS.cashfreeSecretKey || '').trim() || localPS.cashfreeSecretKey || '',
        cashfreeEnv: cloudPS.cashfreeEnv || localPS.cashfreeEnv || 'production',
        razorpayKeyId: (cloudPS.razorpayKeyId || '').trim() || localPS.razorpayKeyId || '',
        razorpayKeySecret: (cloudPS.razorpayKeySecret || '').trim() || localPS.razorpayKeySecret || '',
        razorpayWebhookSecret: (cloudPS.razorpayWebhookSecret || '').trim() || localPS.razorpayWebhookSecret || '',
        razorpayEnv: cloudPS.razorpayEnv || localPS.razorpayEnv || 'live',
        upiGatewayProvider: cloudPS.upiGatewayProvider || localPS.upiGatewayProvider || 'Cashfree UPI Gateway',
        upiGatewayKey: (cloudPS.upiGatewayKey || '').trim() || localPS.upiGatewayKey || '',
        upiGatewaySecret: (cloudPS.upiGatewaySecret || '').trim() || localPS.upiGatewaySecret || '',
        upiGatewayWebhookUrl: (cloudPS.upiGatewayWebhookUrl || '').trim() || localPS.upiGatewayWebhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/upi-payment` : '/api/webhook/upi-payment'),
      };
      const mergedSettings = {
        ...existingSettings,
        ...data.settings,
        businessLogo: finalLogo,
        paymentSettings: mergedPaymentSettings,
      };
      setLocalItem(STORAGE_KEYS.SETTINGS, mergedSettings);

      if (data.settings.darkMode !== undefined && typeof window !== 'undefined') {
        const isDark = Boolean(data.settings.darkMode);
        try {
          localStorage.setItem('skp_theme', isDark ? 'dark' : 'light');
          document.cookie = `skp_theme=${isDark ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax;`;
        } catch {}
      }

      if (
        data.settings.websiteName ||
        data.settings.websiteLogo ||
        data.settings.websiteFavicon ||
        data.settings.websiteBadgeText !== undefined ||
        data.settings.websiteBadgeBg !== undefined ||
        data.settings.websiteTagline !== undefined ||
        data.settings.websiteSupportLocation !== undefined ||
        data.settings.websiteSupportPhone !== undefined ||
        data.settings.websiteSupportEmail !== undefined
      ) {
        try {
          const brandObj = {
            websiteName: data.settings.websiteName || existingSettings?.websiteName || '',
            websiteLogo: data.settings.websiteLogo || existingSettings?.websiteLogo || '',
            websiteFavicon: data.settings.websiteFavicon || existingSettings?.websiteFavicon || '',
            websiteBadgeText: data.settings.websiteBadgeText !== undefined ? data.settings.websiteBadgeText : (existingSettings?.websiteBadgeText || ''),
            websiteBadgeBg: data.settings.websiteBadgeBg || existingSettings?.websiteBadgeBg || 'fintech-gradient-primary',
            websiteTagline: data.settings.websiteTagline !== undefined ? data.settings.websiteTagline : (existingSettings?.websiteTagline || ''),
            websiteSupportLocation: data.settings.websiteSupportLocation !== undefined ? data.settings.websiteSupportLocation : (existingSettings?.websiteSupportLocation || ''),
            websiteSupportPhone: data.settings.websiteSupportPhone !== undefined ? data.settings.websiteSupportPhone : (existingSettings?.websiteSupportPhone || ''),
            websiteSupportEmail: data.settings.websiteSupportEmail !== undefined ? data.settings.websiteSupportEmail : (existingSettings?.websiteSupportEmail || ''),
          };
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('skp_global_branding', JSON.stringify(brandObj));
            if (brandObj.websiteBadgeText !== undefined) localStorage.setItem('skp_brand_badge', brandObj.websiteBadgeText);
            if (brandObj.websiteBadgeBg) localStorage.setItem('skp_brand_badge_bg', brandObj.websiteBadgeBg);
            if (brandObj.websiteTagline !== undefined) localStorage.setItem('skp_brand_tagline', brandObj.websiteTagline);
            if (brandObj.websiteName) localStorage.setItem('skp_brand_name', brandObj.websiteName);
            if (brandObj.websiteLogo) localStorage.setItem('skp_brand_logo', brandObj.websiteLogo);
            if (brandObj.websiteFavicon) localStorage.setItem('skp_brand_favicon', brandObj.websiteFavicon);
            if (brandObj.websiteSupportLocation !== undefined) localStorage.setItem('skp_brand_support_location', brandObj.websiteSupportLocation);
            if (brandObj.websiteSupportPhone !== undefined) localStorage.setItem('skp_brand_support_phone', brandObj.websiteSupportPhone);
            if (brandObj.websiteSupportEmail !== undefined) localStorage.setItem('skp_brand_support_email', brandObj.websiteSupportEmail);
          }
          if (typeof document !== 'undefined') {
            document.cookie = `skp_brand_badge=${encodeURIComponent(brandObj.websiteBadgeText)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            document.cookie = `skp_brand_badge_bg=${encodeURIComponent(brandObj.websiteBadgeBg)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            document.cookie = `skp_brand_tagline=${encodeURIComponent(brandObj.websiteTagline)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            document.cookie = `skp_brand_name=${encodeURIComponent(brandObj.websiteName)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            if (brandObj.websiteLogo && brandObj.websiteLogo.length < 2000) {
              document.cookie = `skp_brand_logo=${encodeURIComponent(brandObj.websiteLogo)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            }
            if (brandObj.websiteFavicon && brandObj.websiteFavicon.length < 2000) {
              document.cookie = `skp_brand_favicon=${encodeURIComponent(brandObj.websiteFavicon)}; Path=/; Max-Age=31536000; SameSite=Lax;`;
            }
          }
        } catch {}
      }
    }
    if (data.user !== undefined) {
      const existingProfile = StorageService.getProfile();
      const existingSettings = StorageService.getSettings();
      const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
      const incomingAvatar = data.user?.avatarUrl !== undefined 
        ? data.user.avatarUrl 
        : ((data.user as any)?.avatar_url !== undefined ? (data.user as any).avatar_url : (data.settings?.businessLogo || ''));
      const finalAvatar = incomingAvatar !== undefined && incomingAvatar !== null
        ? incomingAvatar
        : (existingProfile?.avatarUrl ?? existingSettings?.businessLogo ?? globalLogo);

      if (finalAvatar && typeof window !== 'undefined') {
        try { localStorage.setItem('khatapro_business_logo', finalAvatar); } catch {}
      } else if (finalAvatar === '' && typeof window !== 'undefined') {
        try { localStorage.removeItem('khatapro_business_logo'); } catch {}
      }

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
      setLocalItem(STORAGE_KEYS.AUTHENTICATOR, []);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.INITIALIZED), 'true');
    }
    StorageService.reconcileCustomerBalances();
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
    if (profile.businessName !== undefined) {
      settingsUpdate.businessName = profile.businessName.trim();
    }
    if (profile.avatarUrl !== undefined) {
      settingsUpdate.businessLogo = profile.avatarUrl;
      if (profile.avatarUrl) {
        try { localStorage.setItem('khatapro_business_logo', profile.avatarUrl); } catch {}
      } else {
        try { localStorage.removeItem('khatapro_business_logo'); } catch {}
      }
    }
    if (profile.phone !== undefined) {
      settingsUpdate.businessPhone = profile.phone;
    }
    if (profile.email !== undefined) {
      settingsUpdate.businessEmail = profile.email;
    }
    if (profile.businessAddress !== undefined) {
      settingsUpdate.businessAddress = profile.businessAddress;
    }
    if (profile.businessGst !== undefined) {
      settingsUpdate.paymentSettings = {
        ...(curSettings.paymentSettings || {}),
        businessGst: profile.businessGst,
      };
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
          if (globalConf.googleDriveEnabled !== undefined) {
            s.googleDriveSettings = { ...(s.googleDriveSettings || {}), enabled: Boolean(globalConf.googleDriveEnabled) };
          } else if (globalConf.googleDriveSettings?.enabled !== undefined) {
            s.googleDriveSettings = { ...(s.googleDriveSettings || {}), enabled: Boolean(globalConf.googleDriveSettings.enabled) };
          }
          if (globalConf.smtpSettings) {
            s.smtpSettings = { ...(s.smtpSettings || {}), ...globalConf.smtpSettings };
          }
          if (globalConf.allowNewRegistrations !== undefined) {
            s.allowNewRegistrations = Boolean(globalConf.allowNewRegistrations);
          }
          if (globalConf.websiteBranding) {
            if (globalConf.websiteBranding.websiteName !== undefined) s.websiteName = globalConf.websiteBranding.websiteName;
            if (globalConf.websiteBranding.websiteLogo !== undefined) s.websiteLogo = globalConf.websiteBranding.websiteLogo;
            if (globalConf.websiteBranding.websiteFavicon !== undefined) s.websiteFavicon = globalConf.websiteBranding.websiteFavicon;
            if (globalConf.websiteBranding.websiteBadgeText !== undefined) s.websiteBadgeText = globalConf.websiteBranding.websiteBadgeText;
            if (globalConf.websiteBranding.websiteBadgeBg) s.websiteBadgeBg = globalConf.websiteBranding.websiteBadgeBg;
            if (globalConf.websiteBranding.websiteTagline !== undefined) s.websiteTagline = globalConf.websiteBranding.websiteTagline;
            if (globalConf.websiteBranding.websiteSupportLocation !== undefined) s.websiteSupportLocation = globalConf.websiteBranding.websiteSupportLocation;
            if (globalConf.websiteBranding.websiteSupportPhone !== undefined) s.websiteSupportPhone = globalConf.websiteBranding.websiteSupportPhone;
            if (globalConf.websiteBranding.websiteSupportEmail !== undefined) s.websiteSupportEmail = globalConf.websiteBranding.websiteSupportEmail;
            if (globalConf.websiteBranding.termsAndConditions !== undefined) s.termsAndConditions = globalConf.websiteBranding.termsAndConditions;
            if (globalConf.websiteBranding.refundAndCancellation !== undefined) s.refundAndCancellation = globalConf.websiteBranding.refundAndCancellation;
            if (globalConf.websiteBranding.privacyPolicy !== undefined) s.privacyPolicy = globalConf.websiteBranding.privacyPolicy;
          }
        }
        const rawBranding = localStorage.getItem('skp_global_branding');
        if (rawBranding) {
          const brandConf = JSON.parse(rawBranding);
          if (brandConf.websiteName !== undefined) s.websiteName = brandConf.websiteName;
          if (brandConf.websiteLogo !== undefined) s.websiteLogo = brandConf.websiteLogo;
          if (brandConf.websiteFavicon !== undefined) s.websiteFavicon = brandConf.websiteFavicon;
          if (brandConf.websiteBadgeText !== undefined) s.websiteBadgeText = brandConf.websiteBadgeText;
          if (brandConf.websiteBadgeBg) s.websiteBadgeBg = brandConf.websiteBadgeBg;
          if (brandConf.websiteTagline !== undefined) s.websiteTagline = brandConf.websiteTagline;
          if (brandConf.websiteSupportLocation !== undefined) s.websiteSupportLocation = brandConf.websiteSupportLocation;
          if (brandConf.websiteSupportPhone !== undefined) s.websiteSupportPhone = brandConf.websiteSupportPhone;
          if (brandConf.websiteSupportEmail !== undefined) s.websiteSupportEmail = brandConf.websiteSupportEmail;
          if (brandConf.termsAndConditions !== undefined) s.termsAndConditions = brandConf.termsAndConditions;
          if (brandConf.refundAndCancellation !== undefined) s.refundAndCancellation = brandConf.refundAndCancellation;
          if (brandConf.privacyPolicy !== undefined) s.privacyPolicy = brandConf.privacyPolicy;
        }

        const localTerms = localStorage.getItem('skp_policy_terms');
        if (localTerms !== null) s.termsAndConditions = localTerms;
        const localRefunds = localStorage.getItem('skp_policy_refunds');
        if (localRefunds !== null) s.refundAndCancellation = localRefunds;
        const localPrivacy = localStorage.getItem('skp_policy_privacy');
        if (localPrivacy !== null) s.privacyPolicy = localPrivacy;
      } catch {}
    }

    if (!s.websiteFavicon && s.websiteLogo) {
      s.websiteFavicon = s.websiteLogo;
    }

    if (s.monthlyBudgetCap === undefined && s.paymentSettings?.monthlyBudgetCap !== undefined) {
      s.monthlyBudgetCap = s.paymentSettings.monthlyBudgetCap;
    }

    if (typeof window !== 'undefined') {
      try {
        const themeVal = localStorage.getItem('skp_theme');
        if (themeVal === 'dark') s.darkMode = true;
        else if (themeVal === 'light') s.darkMode = false;
      } catch {}
    }

    return s;
  },
  updateSettings: (settings: Partial<SystemSettings>): SystemSettings => {
    const cur = StorageService.getSettings();
    const merged: SystemSettings = { ...cur, ...settings };
    if (merged.monthlyBudgetCap !== undefined) {
      if (!merged.paymentSettings) merged.paymentSettings = {} as any;
      merged.paymentSettings.monthlyBudgetCap = merged.monthlyBudgetCap;
    } else if (merged.paymentSettings?.monthlyBudgetCap !== undefined) {
      merged.monthlyBudgetCap = merged.paymentSettings.monthlyBudgetCap;
    }
    if (merged.darkMode !== undefined && typeof window !== 'undefined') {
      try {
        const themeVal = merged.darkMode ? 'dark' : 'light';
        localStorage.setItem('skp_theme', themeVal);
        document.cookie = `skp_theme=${themeVal}; Path=/; Max-Age=31536000; SameSite=Lax;`;
      } catch {}
    }
    setLocalItem(STORAGE_KEYS.SETTINGS, merged);
    
    const storedProfile = getLocalItem<UserProfile | null>(STORAGE_KEYS.PROFILE, null as any);
    const curUser = StorageService.getCurrentUser();

    if (typeof window !== 'undefined') {
      try {
        const rawG = localStorage.getItem('skp_global_system_config');
        const conf = rawG ? JSON.parse(rawG) : {};
        if (merged.googleDriveSettings?.enabled !== undefined) {
          conf.googleDriveEnabled = merged.googleDriveSettings.enabled;
          if (!conf.googleDriveSettings) conf.googleDriveSettings = {};
          conf.googleDriveSettings.enabled = merged.googleDriveSettings.enabled;
        } else if ((merged as any).googleDriveEnabled !== undefined) {
          conf.googleDriveEnabled = (merged as any).googleDriveEnabled;
        }
        if (merged.allowNewRegistrations !== undefined) {
          conf.allowNewRegistrations = Boolean(merged.allowNewRegistrations);
        }
        if (merged.betaTestingEnabled !== undefined) {
          conf.betaTestingEnabled = Boolean(merged.betaTestingEnabled);
        }
        if (merged.maintenanceMode !== undefined) {
          conf.maintenanceMode = merged.maintenanceMode;
        }
        if (merged.smtpSettings !== undefined) {
          conf.smtpSettings = merged.smtpSettings;
        }
        localStorage.setItem('skp_global_system_config', JSON.stringify(conf));
      } catch {}
    }
    const profileUpdates: Partial<UserProfile> = {};
    if (merged.businessName !== undefined) {
      profileUpdates.businessName = merged.businessName.trim();
    }
    if (merged.businessLogo !== undefined) {
      profileUpdates.avatarUrl = merged.businessLogo;
      if (merged.businessLogo) {
        try { localStorage.setItem('khatapro_business_logo', merged.businessLogo); } catch {}
      } else {
        try { localStorage.removeItem('khatapro_business_logo'); } catch {}
      }
    }
    if (merged.businessPhone !== undefined) {
      profileUpdates.phone = merged.businessPhone;
    }
    if (merged.businessEmail !== undefined) {
      profileUpdates.email = merged.businessEmail;
    }
    if (merged.businessAddress !== undefined) {
      profileUpdates.businessAddress = merged.businessAddress;
    }
    if (merged.paymentSettings?.businessGst !== undefined) {
      profileUpdates.businessGst = merged.paymentSettings.businessGst;
    }

    if (storedProfile && Object.keys(profileUpdates).length > 0) {
      setLocalItem(STORAGE_KEYS.PROFILE, { ...storedProfile, ...profileUpdates });
    }
    if (curUser && Object.keys(profileUpdates).length > 0) {
      StorageService.setCurrentUser({ ...curUser, ...profileUpdates });
    }

    if (
      merged.websiteName !== undefined ||
      merged.websiteLogo !== undefined ||
      merged.websiteFavicon !== undefined ||
      merged.websiteBadgeText !== undefined ||
      merged.websiteBadgeBg !== undefined ||
      merged.websiteTagline !== undefined ||
      merged.websiteSupportLocation !== undefined ||
      merged.websiteSupportPhone !== undefined ||
      merged.websiteSupportEmail !== undefined ||
      merged.termsAndConditions !== undefined ||
      merged.refundAndCancellation !== undefined ||
      merged.privacyPolicy !== undefined
    ) {
      try {
        const brandObj = {
          websiteName: merged.websiteName || '',
          websiteLogo: merged.websiteLogo || '',
          websiteFavicon: merged.websiteFavicon || merged.websiteLogo || '',
          websiteBadgeText: merged.websiteBadgeText !== undefined ? merged.websiteBadgeText : '',
          websiteBadgeBg: merged.websiteBadgeBg || 'fintech-gradient-primary',
          websiteTagline: merged.websiteTagline !== undefined ? merged.websiteTagline : '',
          websiteSupportLocation: merged.websiteSupportLocation !== undefined ? merged.websiteSupportLocation : '',
          websiteSupportPhone: merged.websiteSupportPhone !== undefined ? merged.websiteSupportPhone : '',
          websiteSupportEmail: merged.websiteSupportEmail !== undefined ? merged.websiteSupportEmail : '',
          termsAndConditions: merged.termsAndConditions !== undefined ? merged.termsAndConditions : (cur.termsAndConditions || ''),
          refundAndCancellation: merged.refundAndCancellation !== undefined ? merged.refundAndCancellation : (cur.refundAndCancellation || ''),
          privacyPolicy: merged.privacyPolicy !== undefined ? merged.privacyPolicy : (cur.privacyPolicy || ''),
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
          if (brandObj.websiteBadgeBg) {
            localStorage.setItem('skp_brand_badge_bg', brandObj.websiteBadgeBg);
          }
          if (brandObj.websiteTagline !== undefined) {
            localStorage.setItem('skp_brand_tagline', brandObj.websiteTagline);
          }
          if (brandObj.websiteName !== undefined) {
            localStorage.setItem('skp_brand_name', brandObj.websiteName);
          }
          if (brandObj.websiteLogo !== undefined) {
            localStorage.setItem('skp_brand_logo', brandObj.websiteLogo);
          }
          if (brandObj.websiteFavicon !== undefined) {
            localStorage.setItem('skp_brand_favicon', brandObj.websiteFavicon);
          }
          if (brandObj.websiteSupportLocation !== undefined) {
            localStorage.setItem('skp_brand_support_location', brandObj.websiteSupportLocation);
          }
          if (brandObj.websiteSupportPhone !== undefined) {
            localStorage.setItem('skp_brand_support_phone', brandObj.websiteSupportPhone);
          }
          if (brandObj.websiteSupportEmail !== undefined) {
            localStorage.setItem('skp_brand_support_email', brandObj.websiteSupportEmail);
          }
          if (brandObj.termsAndConditions !== undefined) {
            localStorage.setItem('skp_policy_terms', brandObj.termsAndConditions);
          }
          if (brandObj.refundAndCancellation !== undefined) {
            localStorage.setItem('skp_policy_refunds', brandObj.refundAndCancellation);
          }
          if (brandObj.privacyPolicy !== undefined) {
            localStorage.setItem('skp_policy_privacy', brandObj.privacyPolicy);
          }
        }
        if (typeof document !== 'undefined') {
          const maxAge = '; Path=/; Max-Age=31536000; SameSite=Lax;';
          document.cookie = `skp_brand_badge=${encodeURIComponent(brandObj.websiteBadgeText)}${maxAge}`;
          document.cookie = `skp_brand_badge_bg=${encodeURIComponent(brandObj.websiteBadgeBg)}${maxAge}`;
          document.cookie = `skp_brand_tagline=${encodeURIComponent(brandObj.websiteTagline)}${maxAge}`;
          document.cookie = `skp_brand_name=${encodeURIComponent(brandObj.websiteName)}${maxAge}`;
          if (brandObj.websiteSupportLocation) document.cookie = `skp_brand_support_location=${encodeURIComponent(brandObj.websiteSupportLocation)}${maxAge}`;
          if (brandObj.websiteSupportPhone) document.cookie = `skp_brand_support_phone=${encodeURIComponent(brandObj.websiteSupportPhone)}${maxAge}`;
          if (brandObj.websiteSupportEmail) document.cookie = `skp_brand_support_email=${encodeURIComponent(brandObj.websiteSupportEmail)}${maxAge}`;
          if (brandObj.websiteLogo && brandObj.websiteLogo.length < 2000) {
            document.cookie = `skp_brand_logo=${encodeURIComponent(brandObj.websiteLogo)}${maxAge}`;
          }
          if (brandObj.websiteFavicon && brandObj.websiteFavicon.length < 2000) {
            document.cookie = `skp_brand_favicon=${encodeURIComponent(brandObj.websiteFavicon)}${maxAge}`;
          }
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

  // Reconcile and calculate exact customer balances directly from active transactions
  reconcileCustomerBalances: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const customers = getLocalItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const transactions = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);

    const balanceMap: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.isDeleted || t.status === 'deleted' || !t.customerId) return;
      if (!balanceMap[t.customerId]) balanceMap[t.customerId] = 0;
      if (t.type === 'credit') {
        balanceMap[t.customerId] += Number(t.amount) || 0;
      } else if (t.type === 'debit' || t.type === 'collection') {
        balanceMap[t.customerId] -= Number(t.amount) || 0;
      }
    });

    let changed = false;
    const updated = customers.map(c => {
      const calculated = Math.round((balanceMap[c.id] || 0) * 100) / 100;
      if (c.outstandingBalance !== calculated) {
        changed = true;
        return { ...c, outstandingBalance: calculated };
      }
      return c;
    });

    if (changed) {
      setLocalItem(STORAGE_KEYS.CUSTOMERS, updated);
    }
    return updated;
  },

  // Customers
  getCustomers: (): Customer[] => {
    return StorageService.reconcileCustomerBalances();
  },
  setCustomers: (customers: Customer[]): void => {
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
  },
  saveCustomer: (customer: Customer): Customer[] => {
    const customers = StorageService.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    let updated: Customer[];
    const nowStr = new Date().toISOString();
    const custWithTime: Customer = {
      ...customer,
      createdAt: customer.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...customers];
      updated[idx] = custWithTime;
    } else {
      updated = [custWithTime, ...customers];
    }
    setLocalItem(STORAGE_KEYS.CUSTOMERS, updated);
    return updated;
  },
  deleteCustomer: (id: string): Customer[] => {
    const customers = StorageService.getCustomers();
    const nowStr = new Date().toISOString();
    const updated = customers.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'deleted' as const,
          isDeleted: true,
          deletedAt: nowStr,
          updatedAt: nowStr,
        };
      }
      return c;
    });
    setLocalItem(STORAGE_KEYS.CUSTOMERS, updated);
    return updated;
  },
  restoreCustomer: (id: string): Customer[] => {
    const customers = StorageService.getCustomers();
    const nowStr = new Date().toISOString();
    const updated = customers.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'active' as const,
          isDeleted: false,
          deletedAt: undefined,
          updatedAt: nowStr,
        };
      }
      return c;
    });
    setLocalItem(STORAGE_KEYS.CUSTOMERS, updated);
    return updated;
  },
  hardDeleteCustomer: (id: string): Customer[] => {
    const customers = StorageService.getCustomers().filter(c => c.id !== id);
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
    addDeletedRecordId('customers', id);
    const txns = StorageService.getTransactions().filter(t => {
      if (t.customerId === id) {
        addDeletedRecordId('transactions', t.id);
        return false;
      }
      return true;
    });
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, txns);
    return customers;
  },

  // Transactions / Ledger Entries
  getTransactions: (): Transaction[] => {
    const rawList = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    if (!Array.isArray(rawList)) return [];

    // Strict deduplication by ID, referenceNo, and Bank Ref / UTR
    const seenIds = new Set<string>();
    const seenRefs = new Set<string>();
    const deduplicated: Transaction[] = [];

    for (const t of rawList) {
      if (!t || !t.id) continue;
      if (seenIds.has(t.id)) continue;

      const ref = (t.referenceNo || '').trim();
      let utrFromNote = '';
      if (t.note) {
        const m = t.note.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([A-Za-z0-9_-]+)/i);
        if (m) utrFromNote = m[1].trim();
      }
      const uniqueRef = ref || utrFromNote;

      if (uniqueRef && seenRefs.has(uniqueRef)) {
        // Drop duplicate transaction with identical UTR / Bank Reference!
        continue;
      }

      seenIds.add(t.id);
      if (uniqueRef) seenRefs.add(uniqueRef);
      deduplicated.push(t);
    }

    if (deduplicated.length !== rawList.length) {
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, deduplicated);
      setTimeout(() => {
        StorageService.reconcileCustomerBalances();
      }, 0);
    }

    return deduplicated;
  },
  setTransactions: (transactions: Transaction[]): void => {
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  },
  addTransaction: (transaction: Transaction): Transaction[] => {
    const list = StorageService.getTransactions();
    const ref = (transaction.referenceNo || '').trim();
    let utrFromNote = '';
    if (transaction.note) {
      const m = transaction.note.match(/(?:Bank Ref \/ UTR|UTR)[:\s]+([A-Za-z0-9_-]+)/i);
      if (m) utrFromNote = m[1].trim();
    }
    const uniqueRef = ref || utrFromNote;

    // Idempotency: skip if already present
    const exists = list.some(t => {
      if (t.id === transaction.id) return true;
      if (uniqueRef) {
        if (t.referenceNo && t.referenceNo.trim() === uniqueRef) return true;
        if (t.note && t.note.includes(uniqueRef)) return true;
      }
      return false;
    });

    if (exists) {
      return list;
    }

    const nowStr = new Date().toISOString();
    const txnToSave = {
      ...transaction,
      createdAt: transaction.createdAt || nowStr,
      updatedAt: nowStr,
    };
    const updated = [txnToSave, ...list];
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
    const nowStr = new Date().toISOString();
    const txnToSave = {
      ...updatedTxn,
      updatedAt: nowStr,
    };
    const updatedList = [...list];
    updatedList[idx] = txnToSave;
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
  deleteTransaction: (transactionId: string, deletedBy?: string): Transaction[] => {
    const list = StorageService.getTransactions();
    const txnToDelete = list.find(t => t.id === transactionId);
    if (!txnToDelete) return list;

    // Soft delete: mark status = 'deleted', isDeleted = true
    const updatedList = list.map(t => {
      if (t.id === transactionId) {
        return {
          ...t,
          status: 'deleted' as const,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: deletedBy || t.createdBy || 'User',
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updatedList);

    // Reverse customer balance impact so deleted transaction is excluded from balance
    if (txnToDelete.customerId && txnToDelete.status !== 'deleted' && !txnToDelete.isDeleted) {
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

  restoreTransaction: (transactionId: string): Transaction[] => {
    const list = StorageService.getTransactions();
    const txnToRestore = list.find(t => t.id === transactionId);
    if (!txnToRestore) return list;

    const updatedList = list.map(t => {
      if (t.id === transactionId) {
        return {
          ...t,
          status: 'completed' as const,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updatedList);

    // Re-apply customer balance impact
    if (txnToRestore.customerId && (txnToRestore.status === 'deleted' || txnToRestore.isDeleted)) {
      const customers = StorageService.getCustomers();
      const custIdx = customers.findIndex(c => c.id === txnToRestore.customerId);
      if (custIdx >= 0) {
        const cust = { ...customers[custIdx] };
        if (txnToRestore.type === 'credit') {
          cust.outstandingBalance += txnToRestore.amount;
        } else if (txnToRestore.type === 'debit' || txnToRestore.type === 'collection') {
          cust.outstandingBalance -= txnToRestore.amount;
        }
        customers[custIdx] = cust;
        setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return updatedList;
  },

  hardDeleteTransaction: (transactionId: string): Transaction[] => {
    const list = StorageService.getTransactions();
    const txnToDelete = list.find(t => t.id === transactionId);
    if (txnToDelete && txnToDelete.customerId && txnToDelete.status !== 'deleted' && !txnToDelete.isDeleted) {
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
    const updatedList = list.filter(t => t.id !== transactionId);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updatedList);
    addDeletedRecordId('transactions', transactionId);
    return updatedList;
  },

  // Invoices
  getInvoices: (): Invoice[] => {
    let list = getLocalItem<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    if ((!list || list.length === 0) && typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('skp_invoices') && k !== getScopedKey(STORAGE_KEYS.INVOICES)) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                list = parsed;
                break;
              }
            }
          } catch {}
        }
      }
    }
    // Check if any invoice was settled/destroyed via link or settled receipt
    if (Array.isArray(list) && typeof window !== 'undefined') {
      let modified = false;
      list = list.map(inv => {
        if (inv.status === 'paid') return inv;
        const isDestroyed =
          localStorage.getItem('sk_destroyed_pay_link_' + inv.id) === 'true' ||
          localStorage.getItem('sk_destroyed_pay_link_' + inv.invoiceNumber) === 'true';
        const settledRaw = localStorage.getItem('sk_invoice_settled_' + inv.id);
        if (isDestroyed || settledRaw) {
          modified = true;
          let settledData: any = null;
          try {
            settledData = settledRaw ? JSON.parse(settledRaw) : null;
          } catch {}
          return {
            ...inv,
            status: 'paid',
            paidAmount: inv.total,
            paymentDate: settledData?.settledAt
              ? settledData.settledAt.split('T')[0]
              : (inv.paymentDate || new Date().toISOString().split('T')[0]),
            receiptUrl: settledData?.receiptUrl || inv.receiptUrl,
          };
        }
        return inv;
      });
      if (modified) {
        setLocalItem(STORAGE_KEYS.INVOICES, list);
      }
    }
    return list || [];
  },
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

    const nowStr = new Date().toISOString();
    const invWithTime: Invoice = {
      ...invoice,
      createdAt: invoice.createdAt || nowStr,
      updatedAt: nowStr,
    };

    if (idx >= 0) {
      updated = [...list];
      updated[idx] = invWithTime;
    } else {
      updated = [invWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.INVOICES, updated);

    // Sync across all scoped and unscoped invoice keys in localStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('skp_invoices')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                const kIdx = parsed.findIndex((i: any) => i.id === invWithTime.id || i.invoiceNumber === invWithTime.invoiceNumber);
                if (kIdx >= 0) {
                  parsed[kIdx] = invWithTime;
                } else {
                  parsed.unshift(invWithTime);
                }
                localStorage.setItem(k, JSON.stringify(parsed));
              }
            }
          }
        }
        window.dispatchEvent(new CustomEvent('khatapro_invoices_updated', { detail: invWithTime }));
      } catch {}
    }

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
    addDeletedRecordId('invoices', id);
    return updated;
  },
  setInvoices: (invoices: Invoice[]): void => {
    setLocalItem(STORAGE_KEYS.INVOICES, invoices);
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
    const nowStr = new Date().toISOString();
    const prodWithTime: Product = {
      ...product,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = prodWithTime;
    } else {
      updated = [prodWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.PRODUCTS, updated);
    return updated;
  },
  saveProductsBatch: (incoming: Product[]): Product[] => {
    const list = StorageService.getProducts();
    const map = new Map<string, Product>();
    list.forEach(p => map.set(p.id, p));
    incoming.forEach(newP => {
      const existing = Array.from(map.values()).find(
        p => (p.sku && newP.sku && p.sku.toLowerCase() === newP.sku.toLowerCase()) ||
             (p.name && newP.name && p.name.toLowerCase() === newP.name.toLowerCase())
      );
      if (existing) {
        map.set(existing.id, { ...newP, id: existing.id });
      } else {
        map.set(newP.id, newP);
      }
    });
    const updated = Array.from(map.values());
    setLocalItem(STORAGE_KEYS.PRODUCTS, updated);
    return updated;
  },
  deleteProduct: (id: string): Product[] => {
    const list = StorageService.getProducts().filter(p => p.id !== id);
    setLocalItem(STORAGE_KEYS.PRODUCTS, list);
    addDeletedRecordId('products', id);
    return list;
  },
  setProducts: (products: Product[]): void => {
    setLocalItem(STORAGE_KEYS.PRODUCTS, products);
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
    const nowStr = new Date().toISOString();
    const expWithTime: Expense = {
      ...expense,
      createdAt: expense.createdAt || nowStr,
      updatedAt: nowStr,
    };
    const updated = [expWithTime, ...list];
    setLocalItem(STORAGE_KEYS.EXPENSES, updated);
    return updated;
  },
  saveExpense: (expense: Expense): Expense[] => {
    const list = StorageService.getExpenses();
    const idx = list.findIndex(e => e.id === expense.id);
    let updated: Expense[];
    const nowStr = new Date().toISOString();
    const expWithTime: Expense = {
      ...expense,
      createdAt: expense.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = expWithTime;
    } else {
      updated = [expWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.EXPENSES, updated);
    return updated;
  },
  deleteExpense: (id: string): Expense[] => {
    const list = StorageService.getExpenses().filter(e => e.id !== id);
    setLocalItem(STORAGE_KEYS.EXPENSES, list);
    addDeletedRecordId('expenses', id);
    return list;
  },
  setExpenses: (expenses: Expense[]): void => {
    setLocalItem(STORAGE_KEYS.EXPENSES, expenses);
  },

  // Savings Goals
  getSavingsGoals: (): SavingsGoal[] => getLocalItem(STORAGE_KEYS.SAVINGS, []),
  saveSavingsGoal: (goal: SavingsGoal): SavingsGoal[] => {
    const list = StorageService.getSavingsGoals();
    const idx = list.findIndex(g => g.id === goal.id);
    let updated: SavingsGoal[];
    const nowStr = new Date().toISOString();
    const goalWithTime: SavingsGoal = {
      ...goal,
      createdAt: goal.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = goalWithTime;
    } else {
      updated = [goalWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.SAVINGS, updated);
    return updated;
  },
  deleteSavingsGoal: (id: string): SavingsGoal[] => {
    const list = StorageService.getSavingsGoals().filter(g => g.id !== id);
    setLocalItem(STORAGE_KEYS.SAVINGS, list);
    addDeletedRecordId('savings_goals', id);
    return list;
  },
  setSavingsGoals: (goals: SavingsGoal[]): void => {
    setLocalItem(STORAGE_KEYS.SAVINGS, goals);
  },

  // Payment Reminders
  getReminders: (): PaymentReminder[] => getLocalItem(STORAGE_KEYS.REMINDERS, []),
  saveReminder: (reminder: PaymentReminder): PaymentReminder[] => {
    const list = StorageService.getReminders();
    const idx = list.findIndex(r => r.id === reminder.id);
    let updated: PaymentReminder[];
    const nowStr = new Date().toISOString();
    const reminderWithTime: PaymentReminder = {
      ...reminder,
      createdAt: reminder.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = reminderWithTime;
    } else {
      updated = [reminderWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.REMINDERS, updated);
    return updated;
  },
  deleteReminder: (id: string): PaymentReminder[] => {
    const list = StorageService.getReminders().filter(r => r.id !== id);
    setLocalItem(STORAGE_KEYS.REMINDERS, list);
    addDeletedRecordId('reminders', id);
    addDeletedRecordId('payment_reminders', id);
    return list;
  },
  setReminders: (reminders: PaymentReminder[]): void => {
    setLocalItem(STORAGE_KEYS.REMINDERS, reminders);
  },

  // Documents
  getDocuments: (): DocumentItem[] => getLocalItem(STORAGE_KEYS.DOCUMENTS, []),
  addDocument: (doc: DocumentItem): DocumentItem[] => {
    const list = StorageService.getDocuments();
    const nowStr = new Date().toISOString();
    const docWithTime: DocumentItem = {
      ...doc,
      uploadedAt: doc.uploadedAt || nowStr,
      updatedAt: nowStr,
    };
    const updated = [docWithTime, ...list];
    setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);
    return updated;
  },
  deleteDocument: (id: string): DocumentItem[] => {
    const list = StorageService.getDocuments().filter(d => d.id !== id);
    setLocalItem(STORAGE_KEYS.DOCUMENTS, list);
    addDeletedRecordId('documents', id);
    return list;
  },
  setDocuments: (docs: DocumentItem[]): void => {
    setLocalItem(STORAGE_KEYS.DOCUMENTS, docs);
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
    const nowStr = new Date().toISOString();
    const noteWithTime: NoteItem = {
      ...note,
      createdAt: note.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = noteWithTime;
    } else {
      updated = [noteWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.NOTES, updated);
    return updated;
  },
  deleteNote: (id: string): NoteItem[] => {
    const list = StorageService.getNotes();
    const updated = list.filter(n => n.id !== id);
    setLocalItem(STORAGE_KEYS.NOTES, updated);
    addDeletedRecordId('notes', id);
    return updated;
  },
  setNotes: (notes: NoteItem[]): void => {
    setLocalItem(STORAGE_KEYS.NOTES, notes);
  },

  // Tasks Management
  getTasks: (): TaskItem[] => getLocalItem<TaskItem[]>(STORAGE_KEYS.TASKS, []),
  saveTask: (task: TaskItem): TaskItem[] => {
    const list = StorageService.getTasks();
    const idx = list.findIndex(t => t.id === task.id);
    let updated: TaskItem[];
    const nowStr = new Date().toISOString();
    const taskWithTime: TaskItem = {
      ...task,
      createdAt: task.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = taskWithTime;
    } else {
      updated = [taskWithTime, ...list];
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
    addDeletedRecordId('tasks', id);
    return updated;
  },
  setTasks: (tasks: TaskItem[]): void => {
    setLocalItem(STORAGE_KEYS.TASKS, tasks);
  },

  // Password Manager
  getPasswords: (): PasswordItem[] => getLocalItem<PasswordItem[]>(STORAGE_KEYS.PASSWORDS, []),
  savePassword: (item: PasswordItem): PasswordItem[] => {
    const list = StorageService.getPasswords();
    const idx = list.findIndex(p => p.id === item.id);
    let updated: PasswordItem[];
    const nowStr = new Date().toISOString();
    const itemWithTime: PasswordItem = {
      ...item,
      createdAt: item.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = itemWithTime;
    } else {
      updated = [itemWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.PASSWORDS, updated);
    return updated;
  },
  deletePassword: (id: string): PasswordItem[] => {
    const list = StorageService.getPasswords();
    const updated = list.filter(p => p.id !== id);
    setLocalItem(STORAGE_KEYS.PASSWORDS, updated);
    addDeletedRecordId('passwords', id);
    return updated;
  },
  setPasswords: (passwords: PasswordItem[]): void => {
    setLocalItem(STORAGE_KEYS.PASSWORDS, passwords);
  },

  // Authenticator / 2FA Manager
  getAuthenticators: (): AuthenticatorItem[] => getLocalItem<AuthenticatorItem[]>(STORAGE_KEYS.AUTHENTICATOR, []),
  saveAuthenticator: (item: AuthenticatorItem): AuthenticatorItem[] => {
    const list = StorageService.getAuthenticators();
    const idx = list.findIndex(a => a.id === item.id);
    let updated: AuthenticatorItem[];
    const nowStr = new Date().toISOString();
    const itemWithTime: AuthenticatorItem = {
      ...item,
      createdAt: item.createdAt || nowStr,
      updatedAt: nowStr,
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = itemWithTime;
    } else {
      updated = [itemWithTime, ...list];
    }
    setLocalItem(STORAGE_KEYS.AUTHENTICATOR, updated);
    return updated;
  },
  deleteAuthenticator: (id: string): AuthenticatorItem[] => {
    const list = StorageService.getAuthenticators();
    const updated = list.filter(a => a.id !== id);
    setLocalItem(STORAGE_KEYS.AUTHENTICATOR, updated);
    addDeletedRecordId('authenticators', id);
    return updated;
  },
  setAuthenticators: (authenticators: AuthenticatorItem[]): void => {
    setLocalItem(STORAGE_KEYS.AUTHENTICATOR, authenticators);
  },

  // Khata Groups
  getGroups: (): KhataGroup[] => {
    return getLocalItem<KhataGroup[]>(STORAGE_KEYS.GROUPS, []);
  },
  saveGroup: (group: KhataGroup): KhataGroup => {
    const list = StorageService.getGroups();
    const idx = list.findIndex(g => g.id === group.id);
    let updated: KhataGroup[];
    if (idx >= 0) {
      const existing = list[idx];
      const pendingRequests = group.pendingRequests !== undefined ? group.pendingRequests : existing.pendingRequests;
      const blockedMerchants = group.blockedMerchants !== undefined ? group.blockedMerchants : existing.blockedMerchants;
      updated = [...list];
      updated[idx] = {
        ...existing,
        ...group,
        pendingRequests,
        blockedMerchants,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [{ ...group, createdAt: group.createdAt || new Date().toISOString() }, ...list];
    }
    setLocalItem(STORAGE_KEYS.GROUPS, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_groups_updated', { detail: updated }));
    }
    return updated[idx >= 0 ? idx : 0];
  },
  deleteGroup: (groupId: string): void => {
    const list = StorageService.getGroups().filter(g => g.id !== groupId);
    setLocalItem(STORAGE_KEYS.GROUPS, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_groups_updated', { detail: list }));
    }
  },

  // Group Notifications
  getDismissedNotificationIds: (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(getScopedKey('skp_dismissed_notifs'));
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },
  getGroupNotifications: (): KhataGroupNotification[] => {
    const list = getLocalItem<KhataGroupNotification[]>(STORAGE_KEYS.GROUP_NOTIFICATIONS, []);
    const dismissed = StorageService.getDismissedNotificationIds();
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    return list.filter(n => {
      if (!n || !n.id) return false;
      if (dismissed.has(n.id)) return false;
      if (n.createdAt && !isNaN(new Date(n.createdAt).getTime()) && new Date(n.createdAt).getTime() < twoDaysAgo) return false;
      return true;
    });
  },
  addGroupNotification: (notif: KhataGroupNotification): void => {
    if (!notif || !notif.id) return;
    const dismissed = StorageService.getDismissedNotificationIds();
    if (dismissed.has(notif.id)) return;
    const list = StorageService.getGroupNotifications();
    const updated = [notif, ...list.filter(n => n.id !== notif.id)].slice(0, 100);
    setLocalItem(STORAGE_KEYS.GROUP_NOTIFICATIONS, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_group_notification_added', { detail: notif }));
      window.dispatchEvent(new CustomEvent('khatapro_group_notifications_updated', { detail: updated }));
    }
  },
  dismissGroupNotification: (notifId: string): void => {
    const dismissed = StorageService.getDismissedNotificationIds();
    dismissed.add(notifId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getScopedKey('skp_dismissed_notifs'), JSON.stringify(Array.from(dismissed)));
      } catch {}
    }
    const list = StorageService.getGroupNotifications().filter(n => n.id !== notifId);
    setLocalItem(STORAGE_KEYS.GROUP_NOTIFICATIONS, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_group_notifications_updated', { detail: list }));
    }
  },
  clearAllGroupNotifications: (): void => {
    const all = getLocalItem<KhataGroupNotification[]>(STORAGE_KEYS.GROUP_NOTIFICATIONS, []);
    const dismissed = StorageService.getDismissedNotificationIds();
    all.forEach(n => { if (n && n.id) dismissed.add(n.id); });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getScopedKey('skp_dismissed_notifs'), JSON.stringify(Array.from(dismissed)));
      } catch {}
    }
    setLocalItem(STORAGE_KEYS.GROUP_NOTIFICATIONS, []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_group_notifications_updated', { detail: [] }));
    }
  },

  exportFullDatabaseJSON: (includeMedia: boolean = true): string => {
    const documents = StorageService.getDocuments().map((doc) => {
      if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
        return {
          ...doc,
          fileUrl: doc.driveFileId ? `https://drive.google.com/file/d/${doc.driveFileId}/view` : '',
        };
      }
      return doc;
    });

    const expenses = StorageService.getExpenses().map((exp) => {
      if (exp.receiptUrl && exp.receiptUrl.startsWith('data:')) {
        return {
          ...exp,
          receiptUrl: exp.driveReceiptId ? `https://drive.google.com/file/d/${exp.driveReceiptId}/view` : '',
        };
      }
      return exp;
    });

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: StorageService.getProfile(),
      settings: StorageService.getSettings(),
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
      authenticators: StorageService.getAuthenticators(),
      groups: StorageService.getGroups(),
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
      if (data.authenticators) setLocalItem(STORAGE_KEYS.AUTHENTICATOR, data.authenticators);
      if (data.groups) setLocalItem(STORAGE_KEYS.GROUPS, data.groups);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return true;
    } catch (e) {
      console.error('Failed to parse and restore database backup:', e);
      return false;
    }
  },

  // Pinned Chats (WhatsApp-style Pin on Top for Customer & Group chats)
  getPinnedChatIds: (): string[] => {
    return getLocalItem<string[]>(STORAGE_KEYS.PINNED_CHATS, []);
  },

  setPinnedChatIds: (ids: string[]): void => {
    setLocalItem(STORAGE_KEYS.PINNED_CHATS, ids);
  },

  togglePinChat: (id: string): string[] => {
    const current = StorageService.getPinnedChatIds();
    const isPinned = current.includes(id);
    const updated = isPinned ? current.filter((x) => x !== id) : [id, ...current];
    StorageService.setPinnedChatIds(updated);
    return updated;
  },

  // Completely wipe all local and session storage, cookies, and browser caches on logout
  clearOnLogout: (): void => {
    if (typeof window === 'undefined') return;
    try {
      // 1. Wipe localStorage (preserving user's chosen UI theme)
      try {
        const themeToPreserve = localStorage.getItem('skp_theme');
        localStorage.clear();
        if (themeToPreserve) {
          localStorage.setItem('skp_theme', themeToPreserve);
        }
      } catch (e) {
        console.warn('localStorage.clear failed:', e);
      }

      // 2. Wipe 100% of sessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('sessionStorage.clear failed:', e);
      }

      // 3. Clear all browser cookies across root and domain
      if (typeof document !== 'undefined') {
        try {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            if (name && name !== 'skp_theme') {
              document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;`;
              document.cookie = `${name}=; Path=/; Domain=${window.location.hostname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;`;
            }
          }
        } catch (e) {
          console.warn('Cookie cleanup failed:', e);
        }
      }

      // 4. Clear CacheStorage (service workers / browser request caches)
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          caches.keys().then((names) => {
            names.forEach((name) => {
              try { caches.delete(name); } catch {}
            });
          }).catch(() => null);
        } catch {}
      }

      // 5. Clear IndexedDB databases if any exist
      if (typeof window !== 'undefined' && 'indexedDB' in window && typeof indexedDB.databases === 'function') {
        try {
          indexedDB.databases().then((dbs) => {
            dbs.forEach((db) => {
              if (db.name) {
                try { indexedDB.deleteDatabase(db.name); } catch {}
              }
            });
          }).catch(() => null);
        } catch {}
      }
    } catch (e) {
      console.warn('StorageService.clearOnLogout failed:', e);
    }
  },

  clearAllFinancialData: () => {
    if (typeof window === 'undefined') return;
    try {
      const activeId = getActiveUserId();
      const keysToClear = [
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.PRODUCTS,
        STORAGE_KEYS.INVOICES,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.SAVINGS,
        STORAGE_KEYS.REMINDERS,
        STORAGE_KEYS.DOCUMENTS,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.TASKS,
        STORAGE_KEYS.PASSWORDS,
        STORAGE_KEYS.AUTHENTICATOR,
        STORAGE_KEYS.GROUPS,
        STORAGE_KEYS.GROUP_NOTIFICATIONS,
        STORAGE_KEYS.PINNED_CHATS,
      ];
      keysToClear.forEach((k) => {
        localStorage.removeItem(k);
        if (activeId) {
          localStorage.removeItem(`${k}_${activeId}`);
        }
      });
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('skp_cust_drive_') || key.startsWith('skp_daily_backup_') || key.startsWith('skp_live_backup_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('StorageService.clearAllFinancialData error:', e);
    }
  },
};

