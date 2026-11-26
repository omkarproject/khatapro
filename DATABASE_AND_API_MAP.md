# DATABASE AND API MAP — KhataPro / SmartKhata

**Database:** Existing Production Supabase PostgreSQL (`https://efpszmfgiutgrjpaopnj.supabase.co`)  
**Storage Bucket:** `khatapro-media` (public, per-user path `${userId}/${folder}/${ts}_${rand}_${name}`)

---

## 1. Existing PostgreSQL Tables (19 Operational Tables + RLS)

| # | Table | Primary Key | Scope / Isolation | Purpose |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `profiles` | `id` (UUID) | `auth.uid() = id` | User profile, `role`, `phone`, `business_name`, `is_blocked`, `blocked_reason`. |
| 2 | `system_settings` | `user_id` (UUID) | `auth.uid() = user_id` | Business info, `dark_mode`, `payment_settings` JSONB (gateways, 2FA, UPI, categories, `deletedPeerIds`, `dismissedAlertIds`). |
| 3 | `customers` | `(id, user_id)` | `auth.uid() = user_id` | CRM contacts, `outstanding_balance`, `credit_limit`, `category`, `bank_accounts`, `upi_details`, `notes` (`__exclude_txns:true` flag). |
| 4 | `transactions` | `(id, user_id)` | `auth.uid() = user_id` | Khata entries (`type` = `'give'`/`'got'`), `attachments` (`__sk_meta` envelope for `origType`, `tags`, `editHistory`, `splitMembers`). |
| 5 | `products` | `(id, user_id)` | `auth.uid() = user_id` | Inventory items, SKU, barcode, stock, prices, `images`. |
| 6 | `invoices` | `(id, user_id)` | `auth.uid() = user_id` | GST/Non-GST invoices, `items` JSONB, tax breakdown, `payment_status`. |
| 7 | `expenses` | `(id, user_id)` | `auth.uid() = user_id` | Outflows, `receipt_url`, `receipt_urls`, `is_recurring`, `tags`. |
| 8 | `savings_goals` | `(id, user_id)` | `auth.uid() = user_id` | Goals, `deposits` JSONB, `document_url`. |
| 9 | `payment_reminders` | `(id, user_id)` | `auth.uid() = user_id` | Scheduled due reminders, `channels`, `sent_history`. |
| 10 | `documents` | `(id, user_id)` | `auth.uid() = user_id` | Document Vault metadata & URLs. |
| 11 | `notes` | `(id, user_id)` | `auth.uid() = user_id` | Rich notes, `is_locked`, `tags`. |
| 12 | `tasks` | `(id, user_id)` | `auth.uid() = user_id` | To-do tasks, `priority`, `completed`. |
| 13 | `passwords` | `(id, user_id)` | `auth.uid() = user_id` | Encrypted credential vault entries. |
| 14 | `authenticators` | `(id, user_id)` | `auth.uid() = user_id` | Stored 2FA TOTP secrets. |
| 15 | `customer_drive_folders` | `(id, user_id)` | `auth.uid() = user_id` | Per-customer Drive/Vault folder metadata. |
| 16 | `customer_drive_files` | `(id, user_id)` | `auth.uid() = user_id` | Per-customer Drive/Vault file metadata. |
| 17 | `google_drive_tokens` | `user_id` | `auth.uid() = user_id` | AES-256-GCM encrypted Google OAuth refresh/access tokens. |
| 18 | `google_drive_backups` | `(id, user_id)` | `auth.uid() = user_id` | Backup snapshot logs. |
| 19 | `user_devices` | `(id, user_id)` | `auth.uid() = user_id` | Active login sessions (`device_name`, `ip`, `last_active`, `is_revoked`). |
| 20 | `global_config` | `id` (TEXT) | Public read / Admin write | Stores `global_config` (branding/SMTP/Drive), `shared_khata_groups`, `support_ticket_*`, `login_lockout_*`. |

*(Note: `schema.sql` lists 19 user/config tables + `global_config` = 20 tables total.)*

---

## 2. Backend API Endpoints (`src/app/api/`)

### Authentication & Session
- `POST /api/auth/login` (GET checks lockout): Email/Phone/Username login + 3-attempt lockout + 2FA check.
- `POST /api/auth/register`: Direct account creation + welcome email.
- `POST /api/auth/otp/send` & `POST /api/auth/otp/verify`: 6-digit OTP for signup, login 2FA, and forgot password.
- `POST /api/auth/update-password`: Authenticated password update.
- `GET/POST /api/auth/check-availability`: Email/phone uniqueness check.
- `GET/POST /api/auth/devices`: Register device, list active devices, revoke single/other/all devices.

### Sync, P2P & Shared Groups
- `GET /api/db/sync`: Full cloud fetch (or lightweight `?checkVersion=true`).
- `POST /api/db/sync`: Batch upsert + explicit `deletedRecordIds` removal + `offloadSyncMediaToStorage` (Drive-first or `khatapro-media`) + `syncPeerMerchants` + Realtime broadcast.
- `GET/POST /api/db/test`: Supabase connectivity check.
- `GET/POST /api/groups` & `POST /api/groups/join`: Shared Khata groups, `@username` search, join requests, member/transaction sync.
- `GET /api/users/lookup`, `POST /api/users/p2p-link`, `POST /api/users/p2p-mutate`: Merchant lookup, P2P linking, and mirrored transaction edit/delete alerts.

### Payments & Currency
- `GET /api/pay/link-details`: Resolves dynamic `/pay/[cid]/[pid]` link details & 7-day expiry.
- `POST /api/pay/confirm`: Server-side verified payment settlement into `transactions` + `customers.outstanding_balance`.
- `GET/POST /api/cashfree/{config,order,verify}` & `POST /api/razorpay/{order,verify}`: Gateway order creation & signature/status verification.
- `GET /api/currency/rates`: Live exchange rates.

### Google Drive & Backups
- `GET /api/backup/google-drive/auth` & `callback`: OAuth 2.0 flow.
- `GET /api/backup/google-drive/status`: Connection & global toggle status.
- `POST /api/backup/google-drive/upload-file` & `GET view-file` & `POST delete-file` & `POST rename-file` & `GET preview` & `GET discover`.
- `POST /api/backup/google-drive/backup-now` & `POST restore` & `POST disconnect` & `GET/POST cron`.
- `POST /api/backup/telegram`: Telegram Bot backup dispatch.

### System, Support & Admin
- `GET/POST /api/system/config`: Global branding, broadcasts, maintenance, SMTP triggers, Drive global toggle.
- `GET/POST /api/support/tickets`: Merchant & Admin support tickets + chat messages.
- `GET/POST/PATCH/DELETE /api/admin/users`: User CRM management.
- `POST /api/admin/database-reset`: Factory reset (`full_reset`, `ledger_only`, `non_admin_users`) + Storage wipe.
- `GET/POST /api/admin/env-config`, `POST /api/admin/smtp/test`, `POST /api/admin/maintenance/bypass`.
