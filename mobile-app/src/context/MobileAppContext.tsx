import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { SecureStorage } from '@/services/secureStorage';
import { AuthService } from '@/services/authService';
import { SyncEngine } from '@/services/syncEngine';
import { apiRequest } from '@/services/apiClient';
import {
  getDb,
  getLocalEntities,
  getSyncQueue,
  updateSyncQueueStatus,
  upsertLocalEntity,
} from '@/db/sqlite';
import {
  Customer,
  DocumentItem,
  EntityType,
  Expense,
  Invoice,
  NoteItem,
  PaymentReminder,
  Product,
  SavingsGoal,
  SyncQueueItem,
  TaskItem,
  Transaction,
  UserProfile,
} from '@/types';

interface MobileAppContextValue {
  user: UserProfile | null;
  isAuthLoading: boolean;
  isBiometricLocked: boolean;
  unlockWithBiometric: () => Promise<boolean>;
  signInSuccess: (user: UserProfile) => Promise<void>;
  signOut: (allDevices?: boolean) => Promise<void>;

  isOnline: boolean;
  syncPhase: 'idle' | 'offline' | 'syncing' | 'synced' | 'conflict';
  syncProgress: number;
  pendingCount: number;
  conflictItems: SyncQueueItem[];
  triggerSync: () => Promise<void>;
  resolveConflict: (queueId: string, resolution: 'keep_local' | 'keep_server') => Promise<void>;

  customers: Customer[];
  transactions: Transaction[];
  invoices: Invoice[];
  expenses: Expense[];
  products: Product[];
  savingsGoals: SavingsGoal[];
  reminders: PaymentReminder[];
  notes: NoteItem[];
  tasks: TaskItem[];
  documents: DocumentItem[];

  saveCustomer: (cust: Partial<Customer> & { name: string }, isEdit?: boolean) => Promise<Customer>;
  addKhataTransaction: (txn: Partial<Transaction> & { amount: number; type: Transaction['type'] }) => Promise<Transaction>;
  updateKhataTransaction: (txnId: string, patch: Partial<Transaction>) => Promise<Transaction | null>;
  deleteTransaction: (txnId: string) => Promise<void>;
  saveInvoice: (inv: Invoice, isEdit?: boolean) => Promise<Invoice>;
  saveExpense: (exp: Expense, isEdit?: boolean) => Promise<Expense>;
  saveProduct: (prod: Product, isEdit?: boolean) => Promise<Product>;
  saveSavingsGoal: (goal: SavingsGoal, isEdit?: boolean) => Promise<SavingsGoal>;
  saveReminder: (rem: PaymentReminder, isEdit?: boolean) => Promise<PaymentReminder>;
  saveNote: (note: NoteItem, isEdit?: boolean) => Promise<NoteItem>;
  saveTask: (task: TaskItem, isEdit?: boolean) => Promise<TaskItem>;
  saveDocument: (doc: DocumentItem, isEdit?: boolean) => Promise<DocumentItem>;
  deleteEntity: (entityType: EntityType, id: string, baseVersion?: string) => Promise<void>;
  refreshLocalState: () => Promise<void>;

  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isQuickCollectOpen: boolean;
  collectCustomer: Customer | null;
  openCollectModal: (customer?: Customer | null) => void;
  closeCollectModal: () => void;
  isGlobalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
}

const MobileAppContext = createContext<MobileAppContextValue | undefined>(undefined);

export function MobileAppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isQuickCollectOpen, setQuickCollectOpen] = useState(false);
  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    SecureStorage.getThemeMode().then(mode => {
      if (mode === 'dark') setDarkMode(true);
    }).catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(async () => {
    setDarkMode(prev => {
      const next = !prev;
      SecureStorage.setThemeMode(next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const openCollectModal = useCallback((cust?: Customer | null) => {
    setCollectCustomer(cust || null);
    setQuickCollectOpen(true);
  }, []);

  const closeCollectModal = useCallback(() => {
    setQuickCollectOpen(false);
    setCollectCustomer(null);
  }, []);

  const [isOnline, setIsOnline] = useState(true);
  const [syncPhase, setSyncPhase] = useState<'idle' | 'offline' | 'syncing' | 'synced' | 'conflict'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictItems, setConflictItems] = useState<SyncQueueItem[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const userRef = useRef<UserProfile | null>(null);
  const isOnlineRef = useRef(true);
  const syncedHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshLocalState = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || userRef.current?.id;
    if (!uid) return;
    await getDb();
    const [c, t, i, e, p, s, r, n, tk, docs, queue] = await Promise.all([
      getLocalEntities<Customer>(uid, 'customers'),
      getLocalEntities<Transaction>(uid, 'transactions'),
      getLocalEntities<Invoice>(uid, 'invoices'),
      getLocalEntities<Expense>(uid, 'expenses'),
      getLocalEntities<Product>(uid, 'products'),
      getLocalEntities<SavingsGoal>(uid, 'savings_goals'),
      getLocalEntities<PaymentReminder>(uid, 'payment_reminders'),
      getLocalEntities<NoteItem>(uid, 'notes'),
      getLocalEntities<TaskItem>(uid, 'tasks'),
      getLocalEntities<DocumentItem>(uid, 'documents'),
      getSyncQueue(uid, ['pending', 'failed', 'conflict']),
    ]);
    setCustomers(c);
    setTransactions(t);
    setInvoices(i);
    setExpenses(e);
    setProducts(p);
    setSavingsGoals(s);
    setReminders(r);
    setNotes(n);
    setTasks(tk);
    setDocuments(docs);
    setConflictItems(queue.filter(q => q.status === 'conflict'));
    setPendingCount(queue.filter(q => q.status !== 'conflict').length);
  }, []);

  const triggerSync = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || userRef.current?.id;
    if (!uid) return;
    if (!isOnlineRef.current) {
      setSyncPhase('offline');
      return;
    }
    if (syncedHideTimerRef.current) clearTimeout(syncedHideTimerRef.current);

    await SyncEngine.runFullSync(uid, (st) => {
      setSyncPhase(st.phase);
      setSyncProgress(st.progress);
      setPendingCount(st.pendingCount);
      if (st.phase === 'synced') {
        syncedHideTimerRef.current = setTimeout(() => {
          setSyncPhase(prev => (prev === 'synced' ? 'idle' : prev));
        }, 2500);
      }
    });
    await refreshLocalState(uid);
  }, [refreshLocalState]);

  const signOut = useCallback(async (allDevices = false) => {
    const uid = userRef.current?.id;
    await AuthService.logout(uid, allDevices);
    setUser(null);
    setIsBiometricLocked(false);
    setCustomers([]);
    setTransactions([]);
    setInvoices([]);
    setExpenses([]);
    setProducts([]);
    setSavingsGoals([]);
    setReminders([]);
    setNotes([]);
    setTasks([]);
    setConflictItems([]);
    setPendingCount(0);
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const ok = await AuthService.promptBiometricUnlock();
    if (ok) setIsBiometricLocked(false);
    return ok;
  }, []);

  const signInSuccess = useCallback(async (loggedUser: UserProfile) => {
    await SecureStorage.setUser(loggedUser);
    setUser(loggedUser);
    setIsBiometricLocked(false);
    try {
      await AuthService.registerCurrentDevice(loggedUser.id);
    } catch {}
    await refreshLocalState(loggedUser.id);
    await triggerSync(loggedUser.id);
  }, [refreshLocalState, triggerSync]);

  // Initial startup load from SecureStore & SQLite
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getDb();
        const storedUser = await SecureStorage.getUser();
        if (!mounted) return;
        if (storedUser) {
          setUser(storedUser);
          const bioEnabled = await SecureStorage.isBiometricEnabled();
          if (bioEnabled) setIsBiometricLocked(true);
          await refreshLocalState(storedUser.id);
          if (isOnlineRef.current) {
            triggerSync(storedUser.id);
          }
        }
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshLocalState, triggerSync]);

  // Connectivity + Foreground Resume listeners
  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !isOnlineRef.current;
      isOnlineRef.current = online;
      setIsOnline(online);
      if (!online) {
        setSyncPhase('offline');
        setSyncProgress(0);
      } else if (wasOffline && userRef.current?.id) {
        triggerSync(userRef.current.id);
      }
    });

    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && userRef.current?.id && isOnlineRef.current) {
        triggerSync(userRef.current.id);
      }
    });

    return () => {
      unsubNet();
      appSub.remove();
    };
  }, [triggerSync]);

  // Supabase Realtime listener for multi-device sync & remote session revocation
  useEffect(() => {
    if (!user?.id) return;
    return SyncEngine.subscribeRealtime(
      user.id,
      () => triggerSync(user.id),
      () => signOut(false)
    );
  }, [user?.id, triggerSync, signOut]);

  const saveCustomer = useCallback(async (input: Partial<Customer> & { name: string }, isEdit = false) => {
    const uid = userRef.current?.id;
    if (!uid) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const existing = input.id ? customers.find(c => c.id === input.id) : undefined;
    const cust: Customer = {
      id: input.id || `cust_${Crypto.randomUUID()}`,
      name: input.name.trim(),
      phone: input.phone || '',
      email: input.email || '',
      businessName: input.businessName || '',
      gstNumber: input.gstNumber || '',
      address: input.address || '',
      city: input.city || '',
      state: input.state || '',
      creditLimit: Number(input.creditLimit) || 0,
      outstandingBalance: existing?.outstandingBalance ?? Number(input.outstandingBalance) ?? 0,
      category: input.category || 'Regular',
      status: input.status || 'active',
      excludeTransactions: Boolean(input.excludeTransactions),
      rating: input.rating ?? 5,
      notes: input.notes || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await upsertLocalEntity(uid, 'customers', cust, {
      enqueueSync: true,
      operation: isEdit ? 'UPDATE' : 'CREATE',
      baseVersion: existing?.updatedAt || null,
      auditSummary: `${isEdit ? 'Updated' : 'Created'} customer ${cust.name}`,
    });
    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
    return cust;
  }, [customers, refreshLocalState, triggerSync]);

  const addKhataTransaction = useCallback(async (input: Partial<Transaction> & { amount: number; type: Transaction['type'] }) => {
    const uid = userRef.current?.id;
    if (!uid) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const txn: Transaction = {
      id: input.id || `txn_${Crypto.randomUUID()}`,
      type: input.type,
      amount: Number(input.amount),
      date: input.date || now,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      category: input.category || (input.type === 'debit' ? 'Payment Received' : 'Credit Given'),
      paymentMode: input.paymentMode || 'cash',
      note: input.note || '',
      tags: input.tags || [],
      attachments: input.attachments || [],
      status: 'completed',
      createdBy: userRef.current?.businessName || userRef.current?.name || 'Merchant',
      createdAt: now,
      updatedAt: now,
    };

    await upsertLocalEntity(uid, 'transactions', txn, {
      enqueueSync: true,
      operation: 'CREATE',
      baseVersion: null,
      auditSummary: `Added ${txn.type} ₹${txn.amount}`,
    });

    // Update customer balance locally atomically
    if (txn.customerId) {
      const cust = customers.find(c => c.id === txn.customerId);
      if (cust) {
        const delta = txn.type === 'credit' ? txn.amount : (txn.type === 'debit' || txn.type === 'collection' ? -txn.amount : 0);
        const updatedCust: Customer = {
          ...cust,
          outstandingBalance: Math.round((cust.outstandingBalance + delta) * 100) / 100,
          updatedAt: now,
        };
        await upsertLocalEntity(uid, 'customers', updatedCust, { enqueueSync: false });
      }
    }

    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
    return txn;
  }, [customers, refreshLocalState, triggerSync]);

  const updateKhataTransaction = useCallback(async (txnId: string, patch: Partial<Transaction>) => {
    const uid = userRef.current?.id;
    if (!uid) throw new Error('Not authenticated');
    const existing = transactions.find(t => t.id === txnId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const editEntry = {
      editedAt: now,
      editedBy: userRef.current?.businessName || userRef.current?.name || 'Merchant',
      previousAmount: existing.amount,
      newAmount: patch.amount !== undefined ? Number(patch.amount) : existing.amount,
      previousNote: existing.note,
      newNote: patch.note !== undefined ? patch.note : existing.note,
    };
    const updated: Transaction = {
      ...existing,
      ...patch,
      amount: patch.amount !== undefined ? Number(patch.amount) : existing.amount,
      editHistory: [...(existing.editHistory || []), editEntry],
      updatedAt: now,
    };

    await upsertLocalEntity(uid, 'transactions', updated, {
      enqueueSync: true,
      operation: 'UPDATE',
      baseVersion: existing.updatedAt || null,
      auditSummary: `Updated transaction ${txnId} (₹${existing.amount} -> ₹${updated.amount})`,
    });

    if (updated.customerId) {
      const cust = customers.find(c => c.id === updated.customerId);
      if (cust) {
        const oldDelta = existing.type === 'credit' ? existing.amount : (existing.type === 'debit' || existing.type === 'collection' ? -existing.amount : 0);
        const newDelta = updated.type === 'credit' ? updated.amount : (updated.type === 'debit' || updated.type === 'collection' ? -updated.amount : 0);
        const diff = newDelta - oldDelta;
        if (diff !== 0) {
          await upsertLocalEntity(uid, 'customers', {
            ...cust,
            outstandingBalance: Math.round((cust.outstandingBalance + diff) * 100) / 100,
            updatedAt: now,
          }, { enqueueSync: false });
        }
        if (cust.p2pPeerUserId && isOnlineRef.current) {
          apiRequest('/api/users/p2p-mutate', {
            method: 'POST',
            userId: uid,
            body: {
              action: 'edit',
              merchantUserId: uid,
              peerUserId: cust.p2pPeerUserId,
              transactionId: updated.id,
              updatedTransaction: updated,
            },
          }).catch(() => {});
        }
      }
    }

    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
    return updated;
  }, [transactions, customers, refreshLocalState, triggerSync]);

  const deleteTransaction = useCallback(async (txnId: string) => {
    const uid = userRef.current?.id;
    if (!uid) return;
    const existing = transactions.find(t => t.id === txnId);
    if (!existing) return;
    const now = new Date().toISOString();
    const softDeleted: Transaction = {
      ...existing,
      isDeleted: true,
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    };
    await upsertLocalEntity(uid, 'transactions', softDeleted, {
      enqueueSync: true,
      operation: 'DELETE',
      baseVersion: existing.updatedAt || null,
      auditSummary: `Deleted transaction ${txnId}`,
    });

    if (existing.customerId) {
      const cust = customers.find(c => c.id === existing.customerId);
      if (cust) {
        const delta = existing.type === 'credit' ? -existing.amount : (existing.type === 'debit' || existing.type === 'collection' ? existing.amount : 0);
        await upsertLocalEntity(uid, 'customers', {
          ...cust,
          outstandingBalance: Math.round((cust.outstandingBalance + delta) * 100) / 100,
          updatedAt: now,
        }, { enqueueSync: false });
        if (cust.p2pPeerUserId && isOnlineRef.current) {
          apiRequest('/api/users/p2p-mutate', {
            method: 'POST',
            userId: uid,
            body: {
              action: 'delete',
              merchantUserId: uid,
              peerUserId: cust.p2pPeerUserId,
              transactionId: existing.id,
            },
          }).catch(() => {});
        }
      }
    }

    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
  }, [transactions, customers, refreshLocalState, triggerSync]);

  const saveGenericEntity = useCallback(async <T extends { id: string; updatedAt?: string }>(
    entityType: EntityType,
    entity: T,
    isEdit = false,
    auditSummary?: string
  ): Promise<T> => {
    const uid = userRef.current?.id;
    if (!uid) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const record = { ...entity, updatedAt: now };
    await upsertLocalEntity(uid, entityType, record, {
      enqueueSync: true,
      operation: isEdit ? 'UPDATE' : 'CREATE',
      baseVersion: isEdit ? (entity.updatedAt || null) : null,
      auditSummary: auditSummary || `${isEdit ? 'Updated' : 'Created'} ${entityType} ${entity.id}`,
    });
    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
    return record;
  }, [refreshLocalState, triggerSync]);

  const saveInvoice = useCallback((inv: Invoice, isEdit = false) =>
    saveGenericEntity('invoices', inv, isEdit, `${isEdit ? 'Updated' : 'Created'} invoice ${inv.invoiceNumber}`), [saveGenericEntity]);

  const saveExpense = useCallback((exp: Expense, isEdit = false) =>
    saveGenericEntity('expenses', exp, isEdit, `${isEdit ? 'Updated' : 'Added'} expense ₹${exp.amount}`), [saveGenericEntity]);

  const saveProduct = useCallback((prod: Product, isEdit = false) =>
    saveGenericEntity('products', prod, isEdit, `${isEdit ? 'Updated' : 'Added'} product ${prod.name}`), [saveGenericEntity]);

  const saveSavingsGoal = useCallback((goal: SavingsGoal, isEdit = false) =>
    saveGenericEntity('savings_goals', goal, isEdit, `${isEdit ? 'Updated' : 'Created'} goal ${goal.title}`), [saveGenericEntity]);

  const saveReminder = useCallback((rem: PaymentReminder, isEdit = false) =>
    saveGenericEntity('payment_reminders', rem, isEdit, `${isEdit ? 'Updated' : 'Created'} reminder ${rem.customerName}`), [saveGenericEntity]);

  const saveNote = useCallback((note: NoteItem, isEdit = false) =>
    saveGenericEntity('notes', note, isEdit, `${isEdit ? 'Updated' : 'Created'} note ${note.title}`), [saveGenericEntity]);

  const saveTask = useCallback((task: TaskItem, isEdit = false) =>
    saveGenericEntity('tasks', task, isEdit, `${isEdit ? 'Updated' : 'Created'} task ${task.title}`), [saveGenericEntity]);

  const saveDocument = useCallback((doc: DocumentItem, isEdit = false) =>
    saveGenericEntity('documents', doc, isEdit, `${isEdit ? 'Updated' : 'Uploaded'} document ${doc.title}`), [saveGenericEntity]);

  const deleteEntity = useCallback(async (entityType: EntityType, id: string, baseVersion?: string) => {
    const uid = userRef.current?.id;
    if (!uid) return;
    await upsertLocalEntity(uid, entityType, { id, isDeleted: true, updatedAt: new Date().toISOString() }, {
      enqueueSync: true,
      operation: 'DELETE',
      baseVersion: baseVersion || null,
      auditSummary: `Deleted ${entityType} ${id}`,
    });
    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
  }, [refreshLocalState, triggerSync]);

  const resolveConflict = useCallback(async (queueId: string, resolution: 'keep_local' | 'keep_server') => {
    const uid = userRef.current?.id;
    if (!uid) return;
    if (resolution === 'keep_server') {
      await updateSyncQueueStatus(queueId, 'synced', 0, 0, null);
    } else {
      const db = await getDb();
      await db.runAsync(`UPDATE sync_queue SET status = 'pending', base_version = NULL, last_error = NULL WHERE id = ?`, [queueId]);
    }
    await triggerSync(uid);
  }, [triggerSync]);

  return (
    <MobileAppContext.Provider
      value={{
        user,
        isAuthLoading,
        isBiometricLocked,
        unlockWithBiometric,
        signInSuccess,
        signOut,
        isOnline,
        syncPhase,
        syncProgress,
        pendingCount,
        conflictItems,
        triggerSync,
        resolveConflict,
        customers,
        transactions,
        invoices,
        expenses,
        products,
        savingsGoals,
        reminders,
        notes,
        tasks,
        documents,
        saveCustomer,
        addKhataTransaction,
        updateKhataTransaction,
        deleteTransaction,
        saveInvoice,
        saveExpense,
        saveProduct,
        saveSavingsGoal,
        saveReminder,
        saveNote,
        saveTask,
        saveDocument,
        deleteEntity,
        refreshLocalState,
        darkMode,
        toggleDarkMode,
        isSidebarOpen,
        setSidebarOpen,
        isQuickCollectOpen,
        collectCustomer,
        openCollectModal,
        closeCollectModal,
        isGlobalSearchOpen,
        setGlobalSearchOpen,
      }}
    >
      {children}
    </MobileAppContext.Provider>
  );
}

export function useMobileApp() {
  const ctx = useContext(MobileAppContext);
  if (!ctx) throw new Error('useMobileApp must be used inside MobileAppProvider');
  return ctx;
}
