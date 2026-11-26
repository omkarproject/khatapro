import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { ENV } from '@/config/env';
import { apiRequest } from './apiClient';
import {
  getDb,
  getLocalEntities,
  getSyncQueue,
  replaceLocalEntitiesBatch,
  updateSyncQueueStatus,
} from '@/db/sqlite';
import { SecureStorage } from './secureStorage';
import { Customer, Expense, Invoice, NoteItem, PaymentReminder, Product, SavingsGoal, SyncQueueItem, TaskItem, Transaction } from '@/types';

let supabaseRealtimeClient: ReturnType<typeof createClient> | null = null;

function getRealtimeClient() {
  if (!supabaseRealtimeClient) {
    supabaseRealtimeClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseRealtimeClient;
}

export interface SyncProgressCallback {
  (state: {
    phase: 'idle' | 'offline' | 'syncing' | 'synced' | 'conflict';
    progress: number;
    pendingCount: number;
    conflictCount: number;
  }): void;
}

let isSyncRunning = false;

export const SyncEngine = {
  subscribeRealtime(
    userId: string,
    onRemoteDataChange: () => void,
    onSessionRevoked: () => void
  ): () => void {
    const client = getRealtimeClient();
    const channel: RealtimeChannel = client.channel(`khatapro_realtime_${userId}`);

    channel
      .on('broadcast', { event: 'khatapro_device_sync' }, () => {
        onRemoteDataChange();
      })
      .on('broadcast', { event: 'khatapro_session_event' }, async (msg) => {
        const payload = msg.payload as any;
        if (!payload || payload.userId !== userId) return;
        const myDevId = await SecureStorage.getOrCreateDeviceId();
        if (
          payload.action === 'logout_all' ||
          (payload.action === 'logout_others' && payload.originDeviceId !== myDevId) ||
          (payload.action === 'logout_device' && payload.targetDeviceId === myDevId)
        ) {
          onSessionRevoked();
        }
      })
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
    };
  },

  async runFullSync(userId: string, onProgress?: SyncProgressCallback): Promise<{ ok: boolean; conflicts: number }> {
    if (!userId || isSyncRunning) return { ok: false, conflicts: 0 };
    isSyncRunning = true;

    try {
      const queue = await getSyncQueue(userId, ['pending', 'failed']);
      const nowMs = Date.now();
      const runnable = queue.filter(q => q.next_retry_at <= nowMs);
      const totalSteps = Math.max(1, runnable.length + 2);
      let completedSteps = 0;

      const emit = (phase: 'syncing' | 'synced' | 'conflict' | 'offline', pendingCount: number, conflictCount: number) => {
        const pct = Math.min(100, Math.max(1, Math.round((completedSteps / totalSteps) * 100)));
        onProgress?.({ phase, progress: phase === 'synced' ? 100 : pct, pendingCount, conflictCount });
      };

      emit('syncing', queue.length, 0);

      // 1. Fetch authoritative cloud snapshot first to detect conflicts before pushing financial edits
      const cloudRes = await apiRequest<{ success: boolean; data: any; version?: string }>(
        `/api/db/sync?userId=${encodeURIComponent(userId)}`,
        { userId }
      );
      completedSteps += 1;
      emit('syncing', queue.length, 0);

      const cloudData = cloudRes?.data || {};
      const cloudMapByType: Record<string, Map<string, any>> = {
        customers: new Map((cloudData.customers || []).map((x: any) => [x.id, x])),
        transactions: new Map((cloudData.transactions || []).map((x: any) => [x.id, x])),
        invoices: new Map((cloudData.invoices || []).map((x: any) => [x.id, x])),
        expenses: new Map((cloudData.expenses || []).map((x: any) => [x.id, x])),
        products: new Map((cloudData.products || []).map((x: any) => [x.id, x])),
        savings_goals: new Map((cloudData.savingsGoals || []).map((x: any) => [x.id, x])),
        payment_reminders: new Map((cloudData.reminders || []).map((x: any) => [x.id, x])),
        notes: new Map((cloudData.notes || []).map((x: any) => [x.id, x])),
        tasks: new Map((cloudData.tasks || []).map((x: any) => [x.id, x])),
      };

      // 2. Check FIFO queue for financial conflicts (never blindly overwrite newer server financial records)
      let conflictCount = 0;
      const deletedRecordIds: Record<string, string[]> = {};
      const confirmedQueueIds: string[] = [];

      for (const item of runnable) {
        await updateSyncQueueStatus(item.id, 'syncing');

        const serverItem = cloudMapByType[item.entity_type]?.get(item.entity_id);
        if (item.operation === 'UPDATE' && serverItem && item.base_version) {
          const serverTime = new Date(serverItem.updatedAt || serverItem.createdAt || 0).getTime();
          const baseTime = new Date(item.base_version).getTime();
          if (!isNaN(serverTime) && !isNaN(baseTime) && serverTime > baseTime) {
            await updateSyncQueueStatus(
              item.id,
              'conflict',
              item.retry_count,
              0,
              `Modified on another device at ${serverItem.updatedAt || 'later time'}`
            );
            conflictCount += 1;
            completedSteps += 1;
            emit('syncing', runnable.length - confirmedQueueIds.length, conflictCount);
            continue;
          }
        }

        if (item.operation === 'DELETE') {
          if (!deletedRecordIds[item.entity_type]) deletedRecordIds[item.entity_type] = [];
          deletedRecordIds[item.entity_type].push(item.entity_id);
        }

        confirmedQueueIds.push(item.id);
        completedSteps += 1;
        emit('syncing', Math.max(0, runnable.length - confirmedQueueIds.length), conflictCount);
      }

      // 3. Push local SQLite snapshot (including confirmed offline creations/edits) to server
      if (confirmedQueueIds.length > 0) {
        const deviceId = await SecureStorage.getOrCreateDeviceId();
        const [customers, transactions, invoices, products, expenses, savingsGoals, reminders, notes, tasks] =
          await Promise.all([
            getLocalEntities<Customer>(userId, 'customers', true),
            getLocalEntities<Transaction>(userId, 'transactions', true),
            getLocalEntities<Invoice>(userId, 'invoices', true),
            getLocalEntities<Product>(userId, 'products', true),
            getLocalEntities<Expense>(userId, 'expenses', true),
            getLocalEntities<SavingsGoal>(userId, 'savings_goals', true),
            getLocalEntities<PaymentReminder>(userId, 'payment_reminders', true),
            getLocalEntities<NoteItem>(userId, 'notes', true),
            getLocalEntities<TaskItem>(userId, 'tasks', true),
          ]);

        await apiRequest('/api/db/sync', {
          method: 'POST',
          userId,
          body: {
            userId,
            originDeviceId: deviceId,
            deletedRecordIds,
            data: {
              customers,
              transactions,
              invoices,
              products,
              expenses,
              savingsGoals,
              reminders,
              notes,
              tasks,
            },
          },
        });

        for (const qId of confirmedQueueIds) {
          await updateSyncQueueStatus(qId, 'synced', undefined, 0, null);
        }
      }

      // 4. Refresh local SQLite tables from authoritative cloud snapshot (protecting any unresolved conflicts)
      const freshCloud = confirmedQueueIds.length > 0
        ? await apiRequest<{ success: boolean; data: any; version?: string }>(`/api/db/sync?userId=${encodeURIComponent(userId)}`, { userId })
        : cloudRes;

      const fd = freshCloud?.data || cloudData;
      await Promise.all([
        replaceLocalEntitiesBatch(userId, 'customers', fd.customers || []),
        replaceLocalEntitiesBatch(userId, 'transactions', fd.transactions || []),
        replaceLocalEntitiesBatch(userId, 'invoices', fd.invoices || []),
        replaceLocalEntitiesBatch(userId, 'products', fd.products || []),
        replaceLocalEntitiesBatch(userId, 'expenses', fd.expenses || []),
        replaceLocalEntitiesBatch(userId, 'savings_goals', fd.savingsGoals || []),
        replaceLocalEntitiesBatch(userId, 'payment_reminders', fd.reminders || []),
        replaceLocalEntitiesBatch(userId, 'notes', fd.notes || []),
        replaceLocalEntitiesBatch(userId, 'tasks', fd.tasks || []),
      ]);

      const db = await getDb();
      const deviceId = await SecureStorage.getOrCreateDeviceId();
      await db.runAsync(
        `INSERT INTO sync_checkpoints (user_id, last_synced_at, cloud_version, device_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET last_synced_at = excluded.last_synced_at, cloud_version = excluded.cloud_version`,
        [userId, new Date().toISOString(), freshCloud?.version || '', deviceId]
      );

      completedSteps = totalSteps;
      const remaining = await getSyncQueue(userId, ['pending', 'failed', 'conflict']);
      const conflicts = remaining.filter(r => r.status === 'conflict').length;
      const pending = remaining.filter(r => r.status !== 'conflict').length;

      onProgress?.({
        phase: conflicts > 0 ? 'conflict' : pending === 0 ? 'synced' : 'syncing',
        progress: pending === 0 && conflicts === 0 ? 100 : 90,
        pendingCount: pending,
        conflictCount: conflicts,
      });

      return { ok: true, conflicts };
    } catch (err: any) {
      // Exponential backoff on failed queue items
      const activeQueue = await getSyncQueue(userId, ['syncing', 'pending']);
      for (const item of activeQueue) {
        const nextCount = item.retry_count + 1;
        const backoffMs = Math.min(30000, Math.pow(2, nextCount) * 1000);
        await updateSyncQueueStatus(item.id, 'failed', nextCount, Date.now() + backoffMs, err?.message || 'Network error');
      }
      onProgress?.({
        phase: 'offline',
        progress: 0,
        pendingCount: activeQueue.length,
        conflictCount: 0,
      });
      return { ok: false, conflicts: 0 };
    } finally {
      isSyncRunning = false;
    }
  },
};
