'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
  UserRole,
  NoteItem,
  TaskItem,
  PasswordItem,
  KhataGroup,
  KhataGroupNotification,
} from '@/types';
import { StorageService, getCleanDefaultSettings } from '@/services/storage';
import { deleteFromDriveFiles } from '@/lib/driveUploadClient';
import { setActiveLanguage, setActiveCurrency, getActiveLanguage, getActiveCurrency, LanguageOption, CurrencyOption, t } from '@/lib/i18n';
import { syncLiveExchangeRates } from '@/lib/currencyService';
import { getSupabaseClient } from '@/lib/supabase';

export const defaultEmptyProfile: UserProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'business_owner',
  businessName: '',
  businessGst: '',
  businessAddress: '',
  createdAt: new Date().toISOString(),
};

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  transaction?: Transaction;
}

interface AppContextType {
  isMounted: boolean;
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
  notes: NoteItem[];
  tasks: TaskItem[];
  passwords: PasswordItem[];
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
  deleteInvoice: (id: string) => void;
  saveProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number) => void;
  addExpense: (exp: Expense) => void;
  deleteExpense: (id: string) => void;
  saveSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  saveReminder: (rem: PaymentReminder) => void;
  deleteReminder: (id: string) => void;
  addDocument: (doc: DocumentItem) => void;
  deleteDocument: (id: string) => void;
  saveNote: (note: NoteItem) => void;
  deleteNote: (id: string) => void;
  saveTask: (task: TaskItem) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  savePassword: (item: PasswordItem) => void;
  deletePassword: (id: string) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  
  // Khata Groups & Split Notifications
  groups: KhataGroup[];
  saveGroup: (group: KhataGroup) => void;
  deleteGroup: (id: string) => void;
  groupNotifications: KhataGroupNotification[];
  addGroupNotification: (notif: KhataGroupNotification) => void;
  dismissGroupNotification: (id: string) => void;
  
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
  applyAuthenticatedUser: (user: UserProfile) => Promise<void>;
  logout: () => void;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  syncWithDatabase: () => Promise<void>;

  // Payment Details Modal & Sound Notification
  activePaymentDetail: Transaction | null;
  openPaymentDetail: (txn: Transaction) => void;
  closePaymentDetail: () => void;
  playPaymentNotificationSound: () => void;

  // Localization & Multi-Currency
  activeLanguage: LanguageOption;
  activeCurrency: CurrencyOption;
  changeLanguage: (code: string) => LanguageOption;
  changeCurrency: (code: string) => CurrencyOption;
  t: (key: string, fallback?: string) => string;

  // Refresh / Reload
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, initialBranding }: { children: React.ReactNode; initialBranding?: any }) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfileState] = useState<UserProfile>(defaultEmptyProfile);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [groups, setGroups] = useState<KhataGroup[]>([]);
  const [groupNotifications, setGroupNotifications] = useState<KhataGroupNotification[]>([]);
  const [settings, setSettingsState] = useState<SystemSettings>(() => {
    const s = StorageService.getSettings();
    if (initialBranding && typeof initialBranding === 'object') {
      return {
        ...s,
        websiteName: initialBranding.websiteName ?? s.websiteName,
        websiteLogo: initialBranding.websiteLogo ?? s.websiteLogo,
        websiteFavicon: initialBranding.websiteFavicon ?? s.websiteFavicon,
        websiteBadgeText: initialBranding.websiteBadgeText !== undefined ? initialBranding.websiteBadgeText : s.websiteBadgeText,
        websiteBadgeBg: initialBranding.websiteBadgeBg || s.websiteBadgeBg,
        websiteTagline: initialBranding.websiteTagline !== undefined ? initialBranding.websiteTagline : s.websiteTagline,
        websiteSupportLocation: initialBranding.websiteSupportLocation !== undefined ? initialBranding.websiteSupportLocation : s.websiteSupportLocation,
        websiteSupportPhone: initialBranding.websiteSupportPhone !== undefined ? initialBranding.websiteSupportPhone : s.websiteSupportPhone,
        websiteSupportEmail: initialBranding.websiteSupportEmail !== undefined ? initialBranding.websiteSupportEmail : s.websiteSupportEmail,
      };
    }
    return s;
  });
  const [darkMode, setDarkMode] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('user');

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
    if (typeof window !== 'undefined') {
      return StorageService.getCurrentUser();
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  // Localization & Multi-Currency State
  const [activeLanguage, setActiveLanguageState] = useState<LanguageOption>(() => getActiveLanguage());
  const [activeCurrency, setActiveCurrencyState] = useState<CurrencyOption>(() => getActiveCurrency());

  useEffect(() => {
    const handleLang = () => setActiveLanguageState(getActiveLanguage());
    const handleCurr = () => setActiveCurrencyState(getActiveCurrency());
    window.addEventListener('khatapro_language_changed', handleLang);
    window.addEventListener('khatapro_currency_changed', handleCurr);
    return () => {
      window.removeEventListener('khatapro_language_changed', handleLang);
      window.removeEventListener('khatapro_currency_changed', handleCurr);
    };
  }, []);

  const changeLanguage = (code: string) => {
    const item = setActiveLanguage(code);
    setActiveLanguageState(item);
    return item;
  };

  const changeCurrency = (code: string) => {
    const item = setActiveCurrency(code);
    setActiveCurrencyState(item);
    return item;
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // --- REALTIME MULTI-DEVICE LIVE SYNC ENGINE ---
  const myDeviceIdRef = useRef<string>('');
  const realtimeChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastCloudSyncTimestampRef = useRef<number>(Date.now());
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingFromCloudRef = useRef<boolean>(false);
  const currentUserRef = useRef<UserProfile | null>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Broadcast data changes to other tabs and other devices in real time
  const broadcastRealtimeChange = (userId: string, action: string) => {
    if (!userId) return;
    const deviceId = myDeviceIdRef.current;
    const timestamp = Date.now();

    // 1. Supabase Realtime WebSocket broadcast to other devices
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'khatapro_device_sync',
          payload: {
            userId,
            originDeviceId: deviceId,
            action,
            timestamp,
          },
        });
      }
    } catch (wsErr) {
      console.warn('Realtime broadcast error:', wsErr);
    }

    // 2. Browser BroadcastChannel to all other tabs on the same machine
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          userId,
          originDeviceId: deviceId,
          action,
          timestamp,
        });
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel error:', bcErr);
    }

    // 3. Fallback localStorage ping for cross-tab storage listener
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('khatapro_realtime_ping', `${deviceId}_${timestamp}`);
      }
    } catch {}
  };

  // Sync all in-memory and local data to Supabase Cloud PostgreSQL
  const syncWithDatabase = async (targetUser?: UserProfile | null) => {
    const activeU = targetUser !== undefined ? targetUser : currentUser;
    const userId = activeU?.id || 'usr_001';

    try {
      setCloudSyncStatus('syncing');
      // Read latest data synchronously from StorageService to avoid React closure lag
      const curCustomers = StorageService.getCustomers();
      const allDriveFolders: any[] = [];
      const allDriveFiles: any[] = [];
      curCustomers.forEach(c => {
        const cd = StorageService.getCustomerDriveData(c.id);
        if (Array.isArray(cd.folders)) {
          cd.folders.forEach(f => allDriveFolders.push({ ...f, customerId: c.id }));
        }
        if (Array.isArray(cd.files)) {
          cd.files.forEach(f => {
            // Raw binary is stored ONLY in Google Drive; database only stores metadata and Google Drive fileId/url
            const { dataUrl, ...fileMeta } = f;
            allDriveFiles.push({ ...fileMeta, dataUrl: '', customerId: c.id });
          });
        }
      });

      const payload = {
        userId,
        data: {
          customers: curCustomers,
          transactions: StorageService.getTransactions(),
          products: StorageService.getProducts(),
          invoices: StorageService.getInvoices(),
          expenses: StorageService.getExpenses(),
          savingsGoals: StorageService.getSavingsGoals(),
          reminders: StorageService.getReminders(),
          documents: StorageService.getDocuments(),
          notes: StorageService.getNotes(),
          tasks: StorageService.getTasks(),
          passwords: StorageService.getPasswords(),
          customerDriveFolders: allDriveFolders,
          customerDriveFiles: allDriveFiles,
          groups: StorageService.getGroups(),
          settings: {
            ...StorageService.getSettings(),
            paymentSettings: {
              ...(StorageService.getSettings().paymentSettings || {}),
              khataGroups: StorageService.getGroups(),
              khataGroupNotifications: StorageService.getGroupNotifications(),
            },
          },
          profile: StorageService.getProfile(),
        },
      };

      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCloudSyncStatus('synced');
        lastCloudSyncTimestampRef.current = Date.now();
        // ⚡ Instantly broadcast live update to all other devices & tabs!
        broadcastRealtimeChange(userId, 'database_update');
      } else {
        setCloudSyncStatus('error');
      }
    } catch (e) {
      console.warn('Database background sync deferred:', e);
      setCloudSyncStatus('offline');
    }
  };

  // Load user data from Supabase Cloud PostgreSQL
  const loadUserDataFromCloud = async (userId: string, silent: boolean = false) => {
    try {
      if (!silent) setCloudSyncStatus('syncing');
      const res = await fetch(`/api/db/sync?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;

          // If silently received live update from another device, check for new payment to chime
          if (silent && Array.isArray(d.transactions)) {
            try {
              const prevTxns = StorageService.getTransactions();
              const prevIds = new Set(prevTxns.map((t: any) => t.id));
              const incomingPayment = d.transactions.find(
                (t: any) =>
                  !prevIds.has(t.id) &&
                  (t.type === 'collection' || t.type === 'credit' || t.type === 'income')
              );
              if (incomingPayment) {
                playPaymentNotificationSound();
                addToast(
                  '💰 Payment Received (Live Sync)',
                  `₹${Number(incomingPayment.amount).toLocaleString('en-IN')} received from ${incomingPayment.customerName || 'Customer'}.`,
                  'success',
                  incomingPayment
                );
              }
            } catch {}
          }

          // Accurately reflect cloud state (even if empty after deletions)
          if (Array.isArray(d.customers)) setCustomers(d.customers);
          if (Array.isArray(d.transactions)) setTransactions(d.transactions);
          if (Array.isArray(d.products)) setProducts(d.products);
          if (Array.isArray(d.invoices)) setInvoices(d.invoices);
          if (Array.isArray(d.expenses)) setExpenses(d.expenses);
          if (Array.isArray(d.savingsGoals)) setSavingsGoals(d.savingsGoals);
          if (Array.isArray(d.reminders)) setReminders(d.reminders);
          if (Array.isArray(d.documents)) setDocuments(d.documents);
          if (Array.isArray(d.notes)) setNotes(d.notes);
          if (Array.isArray(d.tasks)) setTasks(d.tasks);
          if (Array.isArray(d.passwords)) setPasswords(d.passwords);
          if (Array.isArray(d.customerDriveFolders) || Array.isArray(d.customerDriveFiles)) {
            const byCust: Record<string, { folders: any[]; files: any[] }> = {};
            (d.customerDriveFolders || []).forEach((f: any) => {
              if (f.customerId) {
                if (!byCust[f.customerId]) byCust[f.customerId] = { folders: [], files: [] };
                byCust[f.customerId].folders.push(f);
              }
            });
            (d.customerDriveFiles || []).forEach((f: any) => {
              if (f.customerId) {
                if (!byCust[f.customerId]) byCust[f.customerId] = { folders: [], files: [] };
                byCust[f.customerId].files.push(f);
              }
            });

            const targetCustomerIds = new Set<string>([
              ...Object.keys(byCust),
              ...((d.customers || []).map((c: any) => c.id).filter(Boolean)),
            ]);

            targetCustomerIds.forEach((cid) => {
              const cdata = byCust[cid] || { folders: [], files: [] };
              const localExisting = StorageService.getCustomerDriveData(cid);

              const defaultFolders = [
                { id: 'fld_aadhar', name: 'AADHAR CARD', createdAt: new Date().toISOString() },
                { id: 'fld_bills', name: 'BILLS', createdAt: new Date().toISOString() },
                { id: 'fld_docs', name: 'DOCUMENTS', createdAt: new Date().toISOString() },
              ];

              const foldersToSave = cdata.folders && cdata.folders.length > 0
                ? cdata.folders
                : (localExisting.folders && localExisting.folders.length > 0 ? localExisting.folders : defaultFolders);

              // If cloud returned files for this customer, use cloud files.
              // If cloud returned 0 files, but cloud overall has 0 files (e.g. prior sync failure) and local has files, preserve local.
              let filesToSave = cdata.files || [];
              if (filesToSave.length === 0 && (!d.customerDriveFiles || d.customerDriveFiles.length === 0) && localExisting.files && localExisting.files.length > 0) {
                filesToSave = localExisting.files;
              }

              StorageService.saveCustomerDriveData(cid, {
                folders: foldersToSave,
                files: filesToSave,
              });
            });
          }
          if (d.settings) {
            setSettingsState(prev => {
              const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
              const incomingLogo = d.settings.businessLogo || d.user?.avatarUrl || (d.user as any)?.avatar_url || '';
              const preservedLogo = incomingLogo || prev.businessLogo || globalLogo;

              let brandStored: any = {};
              if (typeof window !== 'undefined') {
                try {
                  const raw = localStorage.getItem('skp_global_branding');
                  if (raw) brandStored = JSON.parse(raw);
                } catch(e) {}
              }

              return {
                ...prev,
                ...d.settings,
                websiteName: brandStored.websiteName !== undefined ? brandStored.websiteName : (d.settings.websiteName || prev.websiteName || ''),
                websiteLogo: brandStored.websiteLogo !== undefined ? brandStored.websiteLogo : (d.settings.websiteLogo || prev.websiteLogo || ''),
                websiteFavicon: brandStored.websiteFavicon !== undefined ? brandStored.websiteFavicon : (d.settings.websiteFavicon || prev.websiteFavicon || ''),
                websiteBadgeText: brandStored.websiteBadgeText !== undefined ? brandStored.websiteBadgeText : (d.settings.websiteBadgeText ?? prev.websiteBadgeText ?? ''),
                websiteBadgeBg: brandStored.websiteBadgeBg || d.settings.websiteBadgeBg || prev.websiteBadgeBg || 'fintech-gradient-primary',
                websiteTagline: brandStored.websiteTagline !== undefined ? brandStored.websiteTagline : (d.settings.websiteTagline ?? prev.websiteTagline ?? ''),
                websiteSupportLocation: brandStored.websiteSupportLocation !== undefined ? brandStored.websiteSupportLocation : (d.settings.websiteSupportLocation ?? prev.websiteSupportLocation ?? ''),
                websiteSupportPhone: brandStored.websiteSupportPhone !== undefined ? brandStored.websiteSupportPhone : (d.settings.websiteSupportPhone ?? prev.websiteSupportPhone ?? ''),
                websiteSupportEmail: brandStored.websiteSupportEmail !== undefined ? brandStored.websiteSupportEmail : (d.settings.websiteSupportEmail ?? prev.websiteSupportEmail ?? ''),
                businessLogo: preservedLogo,
                paymentSettings: {
                  ...(prev.paymentSettings || {}),
                  ...(d.settings.paymentSettings || {}),
                  upiId: (d.settings.paymentSettings?.upiId || '').trim() || prev.paymentSettings?.upiId || '',
                  payeeName: (d.settings.paymentSettings?.payeeName || '').trim() || prev.paymentSettings?.payeeName || prev.businessName || '',
                  customQrUrl: d.settings.paymentSettings?.customQrUrl || prev.paymentSettings?.customQrUrl || '',
                  isDefaultQrSaved: d.settings.paymentSettings?.isDefaultQrSaved ?? prev.paymentSettings?.isDefaultQrSaved ?? false,
                },
              };
            });

            if (Array.isArray(d.settings.paymentSettings?.khataGroups)) {
              d.settings.paymentSettings.khataGroups.forEach((g: any) => StorageService.saveGroup(g));
              setGroups(StorageService.getGroups());
            }
            if (Array.isArray(d.settings.paymentSettings?.khataGroupNotifications)) {
              d.settings.paymentSettings.khataGroupNotifications.forEach((n: any) => StorageService.addGroupNotification(n));
              setGroupNotifications(StorageService.getGroupNotifications());
            }

            // Also fetch all cloud-shared groups where this user is creator, member, or auto-linked merchant
            try {
              const gRes = await fetch(`/api/groups?userId=${userId}`);
              if (gRes.ok) {
                const gData = await gRes.json();
                if (gData.success) {
                  if (Array.isArray(gData.groups)) {
                    gData.groups.forEach((g: any) => StorageService.saveGroup(g));
                    setGroups(StorageService.getGroups());
                  }
                  if (Array.isArray(gData.notifications)) {
                    gData.notifications.forEach((n: any) => StorageService.addGroupNotification(n));
                    setGroupNotifications(StorageService.getGroupNotifications());
                  }
                }
              }
            } catch (gErr) {
              console.warn('Could not load shared groups:', gErr);
            }
          }
          if (d.user) {
            if (d.user.language) setActiveLanguage(d.user.language);
            if (d.user.currency) setActiveCurrency(d.user.currency);
            setProfileState(prev => {
              const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
              const incomingAvatar = d.user.avatarUrl || (d.user as any)?.avatar_url || d.settings?.businessLogo || '';
              const preservedAvatar = incomingAvatar || prev.avatarUrl || globalLogo;
              return {
                ...prev,
                ...d.user,
                avatarUrl: preservedAvatar,
              };
            });
            setCurrentUserState(prev => {
              if (!prev) return null;
              const globalLogo = typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '';
              const incomingAvatar = d.user.avatarUrl || (d.user as any)?.avatar_url || d.settings?.businessLogo || '';
              const preservedAvatar = incomingAvatar || prev.avatarUrl || globalLogo;
              const updated = {
                ...prev,
                ...d.user,
                avatarUrl: preservedAvatar,
              };
              StorageService.setCurrentUser(updated);
              return updated;
            });
          }

          // Update local cache
          StorageService.setAllUserData(d);
          setCloudSyncStatus('synced');
          lastCloudSyncTimestampRef.current = Date.now();
          return;
        }
      }
      setCloudSyncStatus('synced');
      lastCloudSyncTimestampRef.current = Date.now();
    } catch (err) {
      console.warn('Could not load user data from cloud:', err);
      setCloudSyncStatus('offline');
    }
  };

  // Debounced cloud reload when changes arrive from other devices/tabs
  const debouncedLoadFromCloud = (userId: string, actionName?: string) => {
    if (!userId || isSyncingFromCloudRef.current) return;

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(async () => {
      try {
        isSyncingFromCloudRef.current = true;
        console.log(`⚡ [Realtime Live Sync] Refreshing ledger from Supabase Cloud (${actionName || 'remote update'})...`);
        await loadUserDataFromCloud(userId, true /* silent mode */);
      } finally {
        isSyncingFromCloudRef.current = false;
      }
    }, 250);
  };

  // --- REALTIME WEBSOCKET & MULTI-DEVICE LIVE SYNC LISTENER ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;

    if (!myDeviceIdRef.current) {
      myDeviceIdRef.current = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    // 1. Browser BroadcastChannel for instant same-device multi-tab sync (<5ms)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`khatapro_sync_${userId}`);
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && data.originDeviceId !== myDeviceIdRef.current && data.userId === userId) {
            debouncedLoadFromCloud(userId, data.action || 'tab_sync');
          }
        };
        broadcastChannelRef.current = bc;
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    // 2. Storage event listener fallback for cross-tab sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'khatapro_realtime_ping' && e.newValue) {
        const [originId] = e.newValue.split('_');
        if (originId !== myDeviceIdRef.current) {
          debouncedLoadFromCloud(userId, 'storage_event');
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }

    // 3. Connect Supabase Realtime WebSocket for cross-device live sync
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const channelName = `khatapro_realtime_${userId}`;
        const channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false },
          },
        });

        // A. Listen for Realtime Broadcasts from other devices
        channel.on('broadcast', { event: 'khatapro_device_sync' }, (message) => {
          const payload = message.payload;
          if (payload && payload.originDeviceId !== myDeviceIdRef.current && payload.userId === userId) {
            debouncedLoadFromCloud(userId, payload.action || 'device_broadcast');
          }
        });

        // B. Listen for PostgreSQL Changes on user tables (CDC)
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
          (payload) => {
            debouncedLoadFromCloud(userId, `postgres_${payload.table}`);
          }
        );

        // C. Listen for global config / branding changes
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'global_config' },
          () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('khatapro_branding_updated'));
              window.dispatchEvent(new CustomEvent('skp_branding_updated'));
            }
          }
        );

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`🟢 [Realtime Live Sync] Connected to Supabase channel: ${channelName}`);
          }
        });

        realtimeChannelRef.current = channel;
      } catch (subErr) {
        console.warn('Supabase Realtime subscription error:', subErr);
      }
    }

    // 4. Tab Focus & Visibility Change Listeners (wakes up mobile device / inactive tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastCloudSyncTimestampRef.current;
        if (elapsed > 6000) {
          debouncedLoadFromCloud(userId, 'visibility_change');
        }
      }
    };
    const handleFocus = () => {
      const elapsed = Date.now() - lastCloudSyncTimestampRef.current;
      if (elapsed > 6000) {
        debouncedLoadFromCloud(userId, 'window_focus');
      }
    };
    const handleOnline = () => {
      debouncedLoadFromCloud(userId, 'network_online');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleOnline);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // 5. Lightweight safety polling interval (every 20s when tab is active)
    const pollingInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastCloudSyncTimestampRef.current;
        if (elapsed > 18000) {
          debouncedLoadFromCloud(userId, 'heartbeat_poll');
        }
      }
    }, 20000);

    return () => {
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch {}
        broadcastChannelRef.current = null;
      }
      if (realtimeChannelRef.current && supabase) {
        try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
        realtimeChannelRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('storage', handleStorageEvent);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      clearInterval(pollingInterval);
    };
  }, [currentUser?.id]);

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
    if (user.language) setActiveLanguage(user.language);
    if (user.currency) setActiveCurrency(user.currency);
    setCurrentUserState(user);
    StorageService.setCurrentUser(user);
    if (typeof document !== 'undefined') {
      document.cookie = `skp_auth_session=${user.id || (user as any)._id}; Path=/; Max-Age=2592000; SameSite=Lax;`;
    }

    // Refresh profile in memory
    setProfileState(user);
    setActiveRole(user.role || (user.email === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user'));

    // Load isolated data from Supabase Cloud for this user
    await loadUserDataFromCloud(user.id);

    // Notify AutoBackupGuardian to initiate Day's 1st Open Auto Backup with live progress & alerts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khatapro_check_daily_backup', { detail: { userId: user.id } }));
    }

    addToast('Signed In Successfully', `Welcome back, ${user.name}! Your Supabase Cloud ledger is loaded.`, 'success');
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
    if (user.language) setActiveLanguage(user.language);
    if (user.currency) setActiveCurrency(user.currency);
    setCurrentUserState(user);
    StorageService.setCurrentUser(user);
    if (typeof document !== 'undefined') {
      document.cookie = `skp_auth_session=${user.id || (user as any)._id}; Path=/; Max-Age=2592000; SameSite=Lax;`;
    }

    setProfileState(user);
    setActiveRole(user.role || (user.email === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user'));

    // Load user's fresh database records from Supabase Cloud
    await loadUserDataFromCloud(user.id);
    addToast('Account Created & Database Initialized', `Welcome, ${user.name}! Your isolated cloud ledger is active.`, 'success');
  };

  // Direct authentication apply after OTP verification
  const applyAuthenticatedUser = async (user: UserProfile) => {
    if (user.language) setActiveLanguage(user.language);
    if (user.currency) setActiveCurrency(user.currency);
    setCurrentUserState(user);
    StorageService.setCurrentUser(user);
    if (typeof document !== 'undefined') {
      document.cookie = `skp_auth_session=${user.id || (user as any)._id}; Path=/; Max-Age=2592000; SameSite=Lax;`;
    }
    setProfileState(user);
    setActiveRole(user.role || (user.email === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user'));
    await loadUserDataFromCloud(user.id);
    addToast('Authentication Verified', `Welcome, ${user.name}! Connected to Supabase Cloud Database.`, 'success');
  };

  // Logout handler
  const logout = () => {
    setCurrentUserState(null);
    StorageService.setCurrentUser(null);
    if (typeof document !== 'undefined') {
      document.cookie = 'skp_auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
    }
    setActiveRole('user');
    setProfileState(defaultEmptyProfile);
    setCustomers([]);
    setTransactions([]);
    setProducts([]);
    setInvoices([]);
    setExpenses([]);
    setSavingsGoals([]);
    setReminders([]);
    setDocuments([]);
    setSettingsState(getCleanDefaultSettings());
    addToast('Signed Out', 'You have logged out of your account.', 'info');
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
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
    const curUser = StorageService.getCurrentUser();
    if (!curUser) {
      setProfileState(defaultEmptyProfile);
      setCustomers([]);
      setTransactions([]);
      setProducts([]);
      setInvoices([]);
      setExpenses([]);
      setSavingsGoals([]);
      setReminders([]);
      setDocuments([]);
      setNotes([]);
      setTasks([]);
      setPasswords([]);
      setGroups([]);
      setGroupNotifications([]);
      setSettingsState(getCleanDefaultSettings());
      return;
    }
    StorageService.initializeDefaults();
    StorageService.reconcileInvoiceStock();
    setProfileState(StorageService.getProfile());
    setCustomers(StorageService.getCustomers());
    setTransactions(StorageService.getTransactions());
    setProducts(StorageService.getProducts());
    setInvoices(StorageService.getInvoices());
    setExpenses(StorageService.getExpenses());
    setSavingsGoals(StorageService.getSavingsGoals());
    setReminders(StorageService.getReminders());
    setDocuments(StorageService.getDocuments());
    setNotes(StorageService.getNotes());
    setTasks(StorageService.getTasks());
    setPasswords(StorageService.getPasswords());
    setGroups(StorageService.getGroups());
    setGroupNotifications(StorageService.getGroupNotifications());
    const s = StorageService.getSettings();
    setSettingsState(s);
    setDarkMode(s.darkMode);
  };

  useEffect(() => {
    const handleGroupsUpdate = () => setGroups(StorageService.getGroups());
    const handleGroupNotifsUpdate = () => setGroupNotifications(StorageService.getGroupNotifications());
    window.addEventListener('khatapro_groups_updated', handleGroupsUpdate);
    window.addEventListener('khatapro_group_notifications_updated', handleGroupNotifsUpdate);

    const activeU = StorageService.getCurrentUser();
    if (activeU?.language) setActiveLanguage(activeU.language);
    if (activeU?.currency) setActiveCurrency(activeU.currency);
    syncLiveExchangeRates();
    setCurrentUserState(activeU);
    setActiveRole(activeU?.role || (activeU?.email === 'anantyadav8924@gmail.com' ? 'super_admin' : 'user'));
    refreshData();
    setMounted(true);

    const curSettings = StorageService.getSettings();

    if (typeof document !== 'undefined') {
      if (activeU) {
        document.cookie = `skp_auth_session=${activeU.id || (activeU as any)._id}; Path=/; Max-Age=2592000; SameSite=Lax;`;
      } else {
        document.cookie = 'skp_auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      }
    }

    // If user is logged in, sync with database
    if (activeU) {
      loadUserDataFromCloud(activeU.id);
    }

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
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('khatapro_groups_updated', handleGroupsUpdate);
      window.removeEventListener('khatapro_group_notifications_updated', handleGroupNotifsUpdate);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, mounted]);

  // Synchronize Global System Config (Maintenance Mode, Beta Testing, & Global Branding) across all devices / browsers
  useEffect(() => {
    if (!mounted) return;

    const fetchGlobalSystemConfig = async () => {
      try {
        const res = await fetch('/api/system/config');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          const globalPayload = {
            maintenanceMode: json.maintenanceMode,
            betaTestingEnabled: Boolean(json.betaTestingEnabled),
            websiteBranding: json.websiteBranding || null,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('skp_global_system_config', JSON.stringify(globalPayload));
            if (json.websiteBranding && typeof json.websiteBranding === 'object') {
              const b = json.websiteBranding;
              const effName = b.websiteName !== undefined ? b.websiteName.trim() : '';
              const effLogo = b.websiteLogo !== undefined ? b.websiteLogo.trim() : '';
              const effFavicon = b.websiteFavicon !== undefined ? (b.websiteFavicon.trim() || effLogo) : effLogo;
              const effBadge = b.websiteBadgeText !== undefined && b.websiteBadgeText !== null ? b.websiteBadgeText : '';
              const effBadgeBg = b.websiteBadgeBg || 'fintech-gradient-primary';
              const effTagline = b.websiteTagline !== undefined && b.websiteTagline !== null ? b.websiteTagline : '';
              const effSuppLoc = b.websiteSupportLocation !== undefined && b.websiteSupportLocation !== null ? b.websiteSupportLocation : '';
              const effSuppPhone = b.websiteSupportPhone !== undefined && b.websiteSupportPhone !== null ? b.websiteSupportPhone : '';
              const effSuppEmail = b.websiteSupportEmail !== undefined && b.websiteSupportEmail !== null ? b.websiteSupportEmail : '';

              const normalizedBrand = {
                websiteName: effName,
                websiteLogo: effLogo,
                websiteFavicon: effFavicon,
                websiteBadgeText: effBadge,
                websiteBadgeBg: effBadgeBg,
                websiteTagline: effTagline,
                websiteSupportLocation: effSuppLoc,
                websiteSupportPhone: effSuppPhone,
                websiteSupportEmail: effSuppEmail,
              };

              localStorage.setItem('skp_global_branding', JSON.stringify(normalizedBrand));
              localStorage.setItem('skp_brand_name', effName);
              localStorage.setItem('skp_brand_logo', effLogo);
              localStorage.setItem('skp_brand_favicon', effFavicon);
              localStorage.setItem('skp_brand_badge', effBadge);
              localStorage.setItem('skp_brand_badge_bg', effBadgeBg);
              localStorage.setItem('skp_brand_tagline', effTagline);
              localStorage.setItem('skp_brand_support_location', effSuppLoc);
              localStorage.setItem('skp_brand_support_phone', effSuppPhone);
              localStorage.setItem('skp_brand_support_email', effSuppEmail);

              try {
                const maxAge = '; path=/; max-age=31536000';
                document.cookie = 'skp_brand_name=' + encodeURIComponent(effName) + maxAge;
                document.cookie = 'skp_brand_logo=' + encodeURIComponent(effLogo) + maxAge;
                document.cookie = 'skp_brand_favicon=' + encodeURIComponent(effFavicon) + maxAge;
                document.cookie = 'skp_brand_badge=' + encodeURIComponent(effBadge) + maxAge;
                document.cookie = 'skp_brand_badge_bg=' + encodeURIComponent(effBadgeBg) + maxAge;
                document.cookie = 'skp_brand_tagline=' + encodeURIComponent(effTagline) + maxAge;
                document.cookie = 'skp_brand_support_location=' + encodeURIComponent(effSuppLoc) + maxAge;
                document.cookie = 'skp_brand_support_phone=' + encodeURIComponent(effSuppPhone) + maxAge;
                document.cookie = 'skp_brand_support_email=' + encodeURIComponent(effSuppEmail) + maxAge;
              } catch {}

              if (effName) {
                document.title = effName + (effTagline ? ` — ${effTagline}` : '');
              }
              if (effFavicon) {
                let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                if (!link) {
                  link = document.createElement('link');
                  link.rel = 'icon';
                  document.head.appendChild(link);
                }
                link.href = effFavicon;
              }
              window.dispatchEvent(new CustomEvent('skp_branding_updated', { detail: normalizedBrand }));
            }
          }
          setSettingsState(prev => {
            const sameMaint = JSON.stringify(prev.maintenanceMode) === JSON.stringify(json.maintenanceMode);
            const sameBeta = prev.betaTestingEnabled === Boolean(json.betaTestingEnabled);
            const b = json.websiteBranding;
            const effName = b?.websiteName !== undefined ? b.websiteName.trim() : (prev.websiteName || '');
            const effLogo = b?.websiteLogo !== undefined ? b.websiteLogo.trim() : (prev.websiteLogo || '');
            const effFavicon = b?.websiteFavicon !== undefined ? (b.websiteFavicon.trim() || effLogo) : (prev.websiteFavicon || effLogo);
            const effBadge = b?.websiteBadgeText !== undefined && b?.websiteBadgeText !== null ? b.websiteBadgeText : (prev.websiteBadgeText ?? '');
            const effBadgeBg = b?.websiteBadgeBg || prev.websiteBadgeBg || 'fintech-gradient-primary';
            const effTagline = b?.websiteTagline !== undefined && b?.websiteTagline !== null ? b.websiteTagline : (prev.websiteTagline ?? '');
            const effSuppLoc = b?.websiteSupportLocation !== undefined && b?.websiteSupportLocation !== null ? b.websiteSupportLocation : (prev.websiteSupportLocation ?? '');
            const effSuppPhone = b?.websiteSupportPhone !== undefined && b?.websiteSupportPhone !== null ? b.websiteSupportPhone : (prev.websiteSupportPhone ?? '');
            const effSuppEmail = b?.websiteSupportEmail !== undefined && b?.websiteSupportEmail !== null ? b.websiteSupportEmail : (prev.websiteSupportEmail ?? '');

            return {
              ...prev,
              maintenanceMode: json.maintenanceMode,
              betaTestingEnabled: Boolean(json.betaTestingEnabled),
              websiteName: effName,
              websiteLogo: effLogo,
              websiteFavicon: effFavicon,
              websiteBadgeText: effBadge,
              websiteBadgeBg: effBadgeBg,
              websiteTagline: effTagline,
              websiteSupportLocation: effSuppLoc,
              websiteSupportPhone: effSuppPhone,
              websiteSupportEmail: effSuppEmail,
            };
          });
        }
      } catch (err) {
        // Silently skip if network error
      }
    };

    fetchGlobalSystemConfig();
    const interval = setInterval(fetchGlobalSystemConfig, 12000);
    return () => clearInterval(interval);
  }, [mounted]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    const updated = { ...settings, darkMode: nextMode };
    setSettingsState(updated);
    StorageService.updateSettings(updated);
  };

  const setProfile = (p: UserProfile) => {
    if (p.language) setActiveLanguage(p.language);
    if (p.currency) setActiveCurrency(p.currency);
    setProfileState(p);
    StorageService.updateProfile(p);
    if (p.businessName && p.businessName.trim()) {
      setSettingsState(prev => ({ ...prev, businessName: p.businessName.trim() }));
    }
    if (p.avatarUrl !== undefined) {
      setSettingsState(prev => ({ ...prev, businessLogo: p.avatarUrl }));
    }
    if (currentUser) {
      const updatedUser = { ...currentUser, ...p };
      setCurrentUserState(updatedUser);
      StorageService.setCurrentUser(updatedUser);
    }
    addToast('Profile Updated', 'Business and merchant profile saved successfully.', 'success');
    syncWithDatabase();
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    const merged = StorageService.updateSettings(newSettings);
    setSettingsState(merged);

    // If Maintenance Mode, Beta Testing, or Website Branding was modified, broadcast immediately to Global System Config
    const hasBrandingUpdates = 
      newSettings.websiteName !== undefined ||
      newSettings.websiteLogo !== undefined ||
      newSettings.websiteFavicon !== undefined ||
      newSettings.websiteBadgeText !== undefined ||
      newSettings.websiteBadgeBg !== undefined ||
      newSettings.websiteTagline !== undefined ||
      newSettings.websiteSupportLocation !== undefined ||
      newSettings.websiteSupportPhone !== undefined ||
      newSettings.websiteSupportEmail !== undefined;

    if (hasBrandingUpdates || newSettings.maintenanceMode !== undefined || newSettings.betaTestingEnabled !== undefined) {
      if (typeof window !== 'undefined') {
        const brandPayload = {
          websiteName: merged.websiteName || '',
          websiteLogo: merged.websiteLogo || '',
          websiteFavicon: merged.websiteFavicon || '',
          websiteBadgeText: merged.websiteBadgeText !== undefined ? merged.websiteBadgeText : '',
          websiteBadgeBg: merged.websiteBadgeBg || 'fintech-gradient-primary',
          websiteTagline: merged.websiteTagline || '',
          websiteSupportLocation: merged.websiteSupportLocation || '',
          websiteSupportPhone: merged.websiteSupportPhone || '',
          websiteSupportEmail: merged.websiteSupportEmail || '',
        };
        const globalPayload: any = {
          maintenanceMode: merged.maintenanceMode,
          betaTestingEnabled: Boolean(merged.betaTestingEnabled),
        };
        if (hasBrandingUpdates) {
          globalPayload.websiteBranding = brandPayload;
        }
        localStorage.setItem('skp_global_system_config', JSON.stringify({
          ...globalPayload,
          websiteBranding: brandPayload,
        }));
        fetch('/api/system/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalPayload),
        }).catch(e => console.warn('Global config broadcast error:', e));
      }
    }

    if (merged.businessName && merged.businessName.trim()) {
      setProfileState(prev => ({ ...prev, businessName: merged.businessName.trim() }));
      if (currentUser) {
        const updatedUser = { ...currentUser, businessName: merged.businessName.trim() };
        setCurrentUserState(updatedUser);
      }
    }

    if (merged.businessLogo !== undefined) {
      setProfileState(prev => ({ ...prev, avatarUrl: merged.businessLogo }));
      if (currentUser) {
        const updatedUser = { ...currentUser, avatarUrl: merged.businessLogo };
        setCurrentUserState(updatedUser);
        StorageService.setCurrentUser(updatedUser);
      }
    }

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
    syncWithDatabase();
  };

  const saveCustomer = (cust: Customer) => {
    const updated = StorageService.saveCustomer(cust);
    setCustomers(updated);
    addToast('Customer Saved', `${cust.name} record has been saved.`, 'success');
    syncWithDatabase();
  };

  const deleteCustomer = (id: string) => {
    const cd = StorageService.getCustomerDriveData(id);
    if (cd && Array.isArray(cd.files) && cd.files.length > 0) {
      deleteFromDriveFiles({
        fileIds: cd.files.map((f: any) => f.driveFileId).filter(Boolean),
        fileNames: cd.files.map((f: any) => f.name).filter(Boolean),
      });
    }
    const updated = StorageService.deleteCustomer(id);
    setCustomers(updated);
    setTransactions(StorageService.getTransactions());
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
    syncWithDatabase();
  };

  const deleteTransaction = (id: string) => {
    const existing = StorageService.getTransactions().find(t => t.id === id);
    if (existing && Array.isArray(existing.attachments) && existing.attachments.length > 0) {
      const fileNames: string[] = [];
      const fileIds: string[] = [];
      existing.attachments.forEach(att => {
        try {
          const parsed = JSON.parse(att);
          if (parsed.driveFileId) fileIds.push(parsed.driveFileId);
          if (parsed.name) fileNames.push(parsed.name);
        } catch {
          if (att) fileNames.push(att);
        }
      });
      if (fileIds.length > 0 || fileNames.length > 0) {
        deleteFromDriveFiles({ fileIds, fileNames });
      }
    }
    const updatedTxns = StorageService.deleteTransaction(id);
    setTransactions(updatedTxns);
    setCustomers(StorageService.getCustomers()); // balance updated
    addToast('Transaction Deleted', 'Transaction was removed from the ledger.', 'info');
    syncWithDatabase();
  };

  const updateTransactionAttachments = (transactionId: string, attachments: string[]) => {
    const existing = StorageService.getTransactions().find(t => t.id === transactionId);
    if (existing && Array.isArray(existing.attachments)) {
      const remainingIds = new Set<string>();
      attachments.forEach(a => {
        try {
          const p = JSON.parse(a);
          if (p.id) remainingIds.add(p.id);
          if (p.driveFileId) remainingIds.add(p.driveFileId);
          if (p.name) remainingIds.add(p.name);
        } catch {
          remainingIds.add(a);
        }
      });

      const fileIdsToDelete: string[] = [];
      const fileNamesToDelete: string[] = [];

      existing.attachments.forEach(oldAtt => {
        try {
          const oldParsed = JSON.parse(oldAtt);
          const isKept = (oldParsed.id && remainingIds.has(oldParsed.id)) ||
                         (oldParsed.driveFileId && remainingIds.has(oldParsed.driveFileId)) ||
                         (oldParsed.name && remainingIds.has(oldParsed.name));
          if (!isKept) {
            if (oldParsed.driveFileId) fileIdsToDelete.push(oldParsed.driveFileId);
            if (oldParsed.name) fileNamesToDelete.push(oldParsed.name);
          }
        } catch {
          if (!remainingIds.has(oldAtt)) {
            fileNamesToDelete.push(oldAtt);
          }
        }
      });

      if (fileIdsToDelete.length > 0 || fileNamesToDelete.length > 0) {
        deleteFromDriveFiles({ fileIds: fileIdsToDelete, fileNames: fileNamesToDelete });
      }
    }

    const updatedTxns = StorageService.updateTransactionAttachments(transactionId, attachments);
    setTransactions(updatedTxns);
    addToast('Attachment Removed', 'File was removed from the bill record and Google Drive.', 'info');
    syncWithDatabase();
  };

  const saveInvoice = (inv: Invoice) => {
    const updated = StorageService.saveInvoice(inv);
    setInvoices(updated);
    setProducts(StorageService.getProducts());
    addToast('Invoice Saved', `Invoice #${inv.invoiceNumber} has been updated.`, 'success');
    syncWithDatabase();
  };

  const deleteInvoice = (id: string) => {
    const existing = StorageService.getInvoices().find(i => i.id === id);
    if (existing) {
      const fileNames: string[] = [];
      if (existing.receiptName) fileNames.push(existing.receiptName);
      (existing.statusHistory || []).forEach(h => {
        if (h.receiptName) fileNames.push(h.receiptName);
      });
      if (fileNames.length > 0) {
        deleteFromDriveFiles({ fileNames });
      }
    }
    const updated = StorageService.deleteInvoice(id);
    setInvoices(updated);
    setProducts(StorageService.getProducts());
    addToast('Invoice Deleted', 'Invoice removed.', 'info');
    syncWithDatabase();
  };

  const saveProduct = (prod: Product) => {
    const updated = StorageService.saveProduct(prod);
    setProducts(updated);
    addToast('Inventory Updated', `${prod.name} saved to stock.`, 'success');
    syncWithDatabase();
  };

  const deleteProduct = (id: string) => {
    const updated = StorageService.deleteProduct(id);
    setProducts(updated);
    addToast('Product Deleted', 'Item removed from inventory.', 'info');
    syncWithDatabase();
  };

  const adjustStock = (productId: string, delta: number) => {
    const updated = StorageService.adjustStock(productId, delta);
    setProducts(updated);
    addToast('Stock Adjusted', `Stock quantity modified by ${delta > 0 ? '+' : ''}${delta}.`, 'info');
    syncWithDatabase();
  };

  const addExpense = (exp: Expense) => {
    const updated = StorageService.addExpense(exp);
    setExpenses(updated);
    addToast('Expense Logged', `₹${exp.amount.toLocaleString('en-IN')} logged under ${exp.category}.`, 'success');
    syncWithDatabase();
  };

  const deleteExpense = (id: string) => {
    const existing = StorageService.getExpenses().find(e => e.id === id);
    if (existing && existing.title) {
      deleteFromDriveFiles({ fileName: existing.title });
    }
    const updated = StorageService.deleteExpense(id);
    setExpenses(updated);
    addToast('Expense Removed', 'Expense item deleted.', 'info');
    syncWithDatabase();
  };

  const saveSavingsGoal = (goal: SavingsGoal) => {
    const updated = StorageService.saveSavingsGoal(goal);
    setSavingsGoals(updated);
    addToast('Savings Goal Saved', `${goal.title} updated.`, 'success');
    syncWithDatabase();
  };

  const deleteSavingsGoal = (id: string) => {
    const existing = StorageService.getSavingsGoals().find(s => s.id === id);
    if (existing) {
      const fileNames: string[] = [];
      if (existing.documentName) fileNames.push(existing.documentName);
      (existing.deposits || []).forEach(d => {
        if (d.receiptName) fileNames.push(d.receiptName);
      });
      if (fileNames.length > 0) {
        deleteFromDriveFiles({ fileNames });
      }
    }
    const updated = StorageService.deleteSavingsGoal(id);
    setSavingsGoals(updated);
    addToast('Goal Removed', 'Savings goal deleted.', 'info');
    syncWithDatabase();
  };

  const saveReminder = (rem: PaymentReminder) => {
    const updated = StorageService.saveReminder(rem);
    setReminders(updated);
    addToast('Reminder Scheduled', `Reminder for ${rem.customerName} saved.`, 'info');
    syncWithDatabase();
  };

  const deleteReminder = (id: string) => {
    const updated = StorageService.deleteReminder(id);
    setReminders(updated);
    addToast('Reminder Removed', 'Reminder deleted.', 'info');
    syncWithDatabase();
  };

  const addDocument = (doc: DocumentItem) => {
    const updated = StorageService.addDocument(doc);
    setDocuments(updated);
    addToast('Document Uploaded', `${doc.title} uploaded successfully.`, 'success');
    syncWithDatabase();
  };

  const deleteDocument = (id: string) => {
    const existing = StorageService.getDocuments().find(d => d.id === id);
    if (existing && existing.title) {
      deleteFromDriveFiles({ fileName: existing.title });
    }
    const updated = StorageService.deleteDocument(id);
    setDocuments(updated);
    addToast('Document Deleted', 'Document removed.', 'info');
    syncWithDatabase();
  };

  const saveNote = (note: NoteItem) => {
    const updated = StorageService.saveNote(note);
    setNotes(updated);
    addToast('Note Saved', `Note "${note.title}" saved.`, 'success');
    if (note.reminderDate) {
      const noteRem: PaymentReminder = {
        id: `note_rem_${note.id}`,
        customerId: 'notes_tasks_module',
        customerName: `📌 Note: ${note.title}`,
        customerPhone: '',
        amount: 0,
        dueDate: note.reminderDate,
        reminderType: 'custom',
        channels: ['sms'],
        status: 'pending',
        messageTemplate: note.description,
        note: `Note Reminder (${note.reminderTime || 'All Day'})`,
        createdAt: new Date().toISOString(),
      };
      saveReminder(noteRem);
    }
    syncWithDatabase();
  };

  const deleteNote = (id: string) => {
    const updated = StorageService.deleteNote(id);
    setNotes(updated);
    const linkedRemId = `note_rem_${id}`;
    if (reminders.some(r => r.id === linkedRemId)) {
      deleteReminder(linkedRemId);
    }
    addToast('Note Deleted', 'Note removed.', 'info');
    syncWithDatabase();
  };

  const saveTask = (task: TaskItem) => {
    const updated = StorageService.saveTask(task);
    setTasks(updated);
    addToast('Task Saved', `Task "${task.title}" saved.`, 'success');
    if (task.reminderDate) {
      const taskRem: PaymentReminder = {
        id: `task_rem_${task.id}`,
        customerId: 'notes_tasks_module',
        customerName: `📋 Task: ${task.title}`,
        customerPhone: '',
        amount: 0,
        dueDate: task.reminderDate,
        reminderType: 'custom',
        channels: ['sms'],
        status: task.isCompleted ? 'sent' : 'pending',
        messageTemplate: task.description || task.title,
        note: `Task Priority: ${task.priority.toUpperCase()}${task.reminderTime ? ` • Time: ${task.reminderTime}` : ''}`,
        createdAt: new Date().toISOString(),
      };
      saveReminder(taskRem);
    }
    syncWithDatabase();
  };

  const toggleTask = (id: string) => {
    const updated = StorageService.toggleTask(id);
    setTasks(updated);
    const target = updated.find(t => t.id === id);
    if (target?.isCompleted) {
      addToast('Task Completed', `"${target.title}" completed! 🎉`, 'success');
    }
    syncWithDatabase();
  };

  const deleteTask = (id: string) => {
    const updated = StorageService.deleteTask(id);
    setTasks(updated);
    const linkedRemId = `task_rem_${id}`;
    if (reminders.some(r => r.id === linkedRemId)) {
      deleteReminder(linkedRemId);
    }
    addToast('Task Removed', 'Task deleted.', 'info');
    syncWithDatabase();
  };

  const savePassword = (item: PasswordItem) => {
    const updated = StorageService.savePassword(item);
    setPasswords(updated);
    addToast('Credentials Saved', `Password for ${item.appName} secured.`, 'success');
    syncWithDatabase();
  };

  const deletePassword = (id: string) => {
    const updated = StorageService.deletePassword(id);
    setPasswords(updated);
    addToast('Password Deleted', 'Credential removed.', 'info');
    syncWithDatabase();
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

  const saveGroup = (group: KhataGroup) => {
    StorageService.saveGroup(group);
    setGroups(StorageService.getGroups());
    syncWithDatabase();
    if (currentUser?.id) {
      fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group,
          userId: currentUser.id,
        }),
      }).catch(e => console.warn('Could not sync group to cloud:', e));
    }
    addToast('Group Saved', `Group "${group.name}" (@${group.username}) updated.`, 'success');
  };

  const deleteGroup = (id: string) => {
    StorageService.deleteGroup(id);
    setGroups(StorageService.getGroups());
    syncWithDatabase();
    if (currentUser?.id) {
      fetch(`/api/groups?id=${id}&creatorUserId=${currentUser.id}`, {
        method: 'DELETE',
      }).catch(e => console.warn('Could not delete group from cloud:', e));
    }
    addToast('Group Removed', 'Group has been deleted.', 'info');
  };

  const addGroupNotification = (notif: KhataGroupNotification) => {
    StorageService.addGroupNotification(notif);
    setGroupNotifications(StorageService.getGroupNotifications());
    syncWithDatabase();
    if (currentUser?.id) {
      fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification: notif,
          userId: currentUser.id,
        }),
      }).catch(e => console.warn('Could not sync notification to cloud:', e));
    }
  };

  const dismissGroupNotification = (id: string) => {
    StorageService.dismissGroupNotification(id);
    setGroupNotifications(StorageService.getGroupNotifications());
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
        notes,
        tasks,
        passwords,
        groups,
        saveGroup,
        deleteGroup,
        groupNotifications,
        addGroupNotification,
        dismissGroupNotification,
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
        deleteInvoice,
        saveProduct,
        deleteProduct,
        adjustStock,
        addExpense,
        deleteExpense,
        saveSavingsGoal,
        deleteSavingsGoal,
        saveReminder,
        deleteReminder,
        addDocument,
        deleteDocument,
        saveNote,
        deleteNote,
        saveTask,
        toggleTask,
        deleteTask,
        savePassword,
        deletePassword,
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
        applyAuthenticatedUser,
        logout,
        cloudSyncStatus,
        syncWithDatabase,
        refreshData,
        isMounted: mounted,
        activeLanguage,
        activeCurrency,
        changeLanguage,
        changeCurrency,
        t,
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
