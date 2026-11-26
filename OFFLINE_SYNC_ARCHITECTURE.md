# OFFLINE SYNC ARCHITECTURE — Native Android (`expo-sqlite`)

---

## 1. Design Principles (Financial-Grade Offline-First)

1. **SQLite as Local Source of Truth:** All UI screens read from `expo-sqlite` tables (`customers`, `transactions`, `invoices`, `products`, `expenses`, `savings_goals`, `payment_reminders`, `documents`, `notes`, `tasks`, `groups`, `settings`).
2. **Persistent Ordered Sync Queue (`sync_queue`):** Every offline create, update, or delete writes atomically inside a SQLite transaction to BOTH the entity table AND `sync_queue`:
   - `id` (UUID v4)
   - `idempotency_key` (UUID v4, stable across retries)
   - `entity_type` (`customer`, `transaction`, `invoice`, `expense`, `product`, etc.)
   - `entity_id` (UUID / stable ID)
   - `operation` (`CREATE`, `UPDATE`, `DELETE`)
   - `payload_json` (canonical snapshot)
   - `base_version` (`updated_at` timestamp observed before local edit, for conflict detection!)
   - `status` (`pending`, `syncing`, `synced`, `failed`, `conflict`)
   - `retry_count`, `next_retry_at`, `last_error`, `created_at`
3. **Strict Financial Safety Rules:**
   - **Stable UUIDs:** Offline transactions use `txn_<uuidv4>` so retries never create duplicates.
   - **Ordered Execution:** Queue items execute FIFO by `created_at` (customer creation before its transactions; invoice before stock/ledger link).
   - **Conflict Detection (No Blind Financial Overwrite):** Before applying an `UPDATE` or `DELETE` on a financial record (`transaction`, `invoice`, `customer.creditLimit`), the sync engine compares `base_version` against the server's current `updated_at`. If the server record was modified by another device after `base_version`, the item is flagged as `conflict` and surfaced to the user with explicit **Keep Mine / Keep Server / View Diff** resolution — never silently overwritten.
   - **Exponential Backoff:** Failed network calls retry at `2s → 4s → 8s → 16s → 30s` max, pausing cleanly when `NetInfo` reports offline.
   - **Honest 100% Progress:** Sync progress (`0% → 100%`) is computed directly from confirmed server-acknowledged queue items (`syncedCount / totalPendingCount`), NEVER fake timers. `100% Synced` is shown only when `pending + syncing + failed + conflict == 0`.
   - **Media Offloading Queue:** Offline-captured photos/PDFs are stored in `FileSystem.documentDirectory` with local `file://` URIs and uploaded via `/api/backup/google-drive/upload-file` (Drive-first or `khatapro-media` fallback) as part of the ordered sync step before the parent transaction/expense payload is committed.
   - **Audit Trail & Checkpoints:** Every sync run records a `sync_checkpoints` row (`last_synced_at`, `cloud_version`, `device_id`) and preserves local `editHistory` audits on transactions.
