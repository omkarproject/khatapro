import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { SecureStorage } from '@/services/secureStorage';
import { AuthService } from '@/services/authService';
import { SyncEngine } from '@/services/syncEngine';
import {
  getDb,
  getLocalEntities,
  getSyncQueue,
  updateSyncQueueStatus,
  upsertLocalEntity,
} from '@/db/sqlite';
import {
  Customer,
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

  saveCustomer: (cust: Partial<Customer> & { name: string }, isEdit?: boolean) => Promise<Customer>;
  addKhataTransaction: (txn: Partial<Transaction> & { amount: number; type: Transaction['type'] }) => Promise<Transaction>;
  deleteTransaction: (txnId: string) => Promise<void>;
  refreshLocalState: () => Promise<void>;
}

const MobileAppContext = createContext<MobileAppContextValue | undefined>(undefined);

export function MobileAppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

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
    const [c, t, i, e, p, s, r, n, tk, queue] = await Promise.all([
      getLocalEntities<Customer>(uid, 'customers'),
      getLocalEntities<Transaction>(uid, 'transactions'),
      getLocalEntities<Invoice>(uid, 'invoices'),
      getLocalEntities<Expense>(uid, 'expenses'),
      getLocalEntities<Product>(uid, 'products'),
      getLocalEntities<SavingsGoal>(uid, 'savings_goals'),
      getLocalEntities<PaymentReminder>(uid, 'payment_reminders'),
      getLocalEntities<NoteItem>(uid, 'notes'),
      getLocalEntities<TaskItem>(uid, 'tasks'),
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
    await refreshLocalState(uid);
    if (isOnlineRef.current) triggerSync(uid);
  }, [transactions, refreshLocalState, triggerSync]);

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
        saveCustomer,
        addKhataTransaction,
        deleteTransaction,
        refreshLocalState,
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
