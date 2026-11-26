import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SyncOperation, SyncQueueItem, SyncQueueStatus } from '@/types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync('smartkhata_offline.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS local_entities (
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, entity_type, entity_id)
    );

    CREATE INDEX IF NOT EXISTS idx_local_entities_lookup
      ON local_entities (user_id, entity_type, is_deleted);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      base_version TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status
      ON sync_queue (user_id, status, created_at);

    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      user_id TEXT PRIMARY KEY,
      last_synced_at TEXT,
      cloud_version TEXT,
      device_id TEXT
    );

    CREATE TABLE IF NOT EXISTS local_audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  dbInstance = db;
  return db;
}

export async function upsertLocalEntity<T extends { id: string; updatedAt?: string }>(
  userId: string,
  entityType: string,
  entity: T,
  options?: {
    enqueueSync?: boolean;
    operation?: SyncOperation;
    baseVersion?: string | null;
    auditSummary?: string;
  }
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const isDeleted = (entity as any).isDeleted || (entity as any).status === 'deleted' ? 1 : 0;
  const payload = JSON.stringify({ ...entity, updatedAt: entity.updatedAt || now });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO local_entities (user_id, entity_type, entity_id, data_json, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET
         data_json = excluded.data_json,
         updated_at = excluded.updated_at,
         is_deleted = excluded.is_deleted`,
      [userId, entityType, entity.id, payload, entity.updatedAt || now, isDeleted]
    );

    if (options?.enqueueSync) {
      const queueId = `sq_${Crypto.randomUUID()}`;
      const idempotencyKey = `idem_${Crypto.randomUUID()}`;
      await db.runAsync(
        `INSERT INTO sync_queue
          (id, user_id, idempotency_key, entity_type, entity_id, operation, payload_json, base_version, status, retry_count, next_retry_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, ?)`,
        [
          queueId,
          userId,
          idempotencyKey,
          entityType,
          entity.id,
          options.operation || 'CREATE',
          payload,
          options.baseVersion ?? null,
          now,
        ]
      );
    }

    if (options?.auditSummary) {
      await db.runAsync(
        `INSERT INTO local_audit_log (id, user_id, entity_type, entity_id, action, summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`aud_${Crypto.randomUUID()}`, userId, entityType, entity.id, options.operation || 'UPSERT', options.auditSummary, now]
      );
    }
  });
}

export async function getLocalEntities<T>(userId: string, entityType: string, includeDeleted = false): Promise<T[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data_json: string }>(
    includeDeleted
      ? `SELECT data_json FROM local_entities WHERE user_id = ? AND entity_type = ? ORDER BY updated_at DESC`
      : `SELECT data_json FROM local_entities WHERE user_id = ? AND entity_type = ? AND is_deleted = 0 ORDER BY updated_at DESC`,
    [userId, entityType]
  );
  const items: T[] = [];
  for (const row of rows) {
    try {
      items.push(JSON.parse(row.data_json) as T);
    } catch {}
  }
  return items;
}

export async function replaceLocalEntitiesBatch<T extends { id: string; updatedAt?: string }>(
  userId: string,
  entityType: string,
  items: T[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    // Preserve items that still have pending/conflict local mutations in sync_queue
    const pendingRows = await db.getAllAsync<{ entity_id: string }>(
      `SELECT DISTINCT entity_id FROM sync_queue WHERE user_id = ? AND entity_type = ? AND status IN ('pending', 'syncing', 'failed', 'conflict')`,
      [userId, entityType]
    );
    const protectedIds = new Set(pendingRows.map(r => r.entity_id));

    await db.runAsync(
      `DELETE FROM local_entities WHERE user_id = ? AND entity_type = ?`,
      [userId, entityType]
    );

    for (const item of items) {
      if (!item?.id) continue;
      if (protectedIds.has(item.id)) continue;
      const isDel = (item as any).isDeleted || (item as any).status === 'deleted' ? 1 : 0;
      await db.runAsync(
        `INSERT OR REPLACE INTO local_entities (user_id, entity_type, entity_id, data_json, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, entityType, item.id, JSON.stringify(item), item.updatedAt || now, isDel]
      );
    }
  });
}

export async function getSyncQueue(userId: string, statuses?: SyncQueueStatus[]): Promise<SyncQueueItem[]> {
  const db = await getDb();
  if (statuses && statuses.length > 0) {
    const placeholders = statuses.map(() => '?').join(',');
    return db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE user_id = ? AND status IN (${placeholders}) ORDER BY created_at ASC`,
      [userId, ...statuses]
    );
  }
  return db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  );
}

export async function updateSyncQueueStatus(
  id: string,
  status: SyncQueueStatus,
  retryCount?: number,
  nextRetryAt?: number,
  lastError?: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = ?, retry_count = COALESCE(?, retry_count), next_retry_at = COALESCE(?, next_retry_at), last_error = ? WHERE id = ?`,
    [status, retryCount ?? null, nextRetryAt ?? null, lastError ?? null, id]
  );
}

export async function clearUserSqliteData(userId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM local_entities WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM sync_checkpoints WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM local_audit_log WHERE user_id = ?`, [userId]);
  });
}
