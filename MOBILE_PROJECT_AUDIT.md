# MOBILE PROJECT AUDIT — KhataPro / SmartKhata

**Audit Date:** 2026-11-26  
**Audited Codebase:** `c:\Users\Admin\Documents\khatapro` (Next.js 15.1.7 / React 19 / TypeScript 5 / Supabase PostgreSQL)  
**Target Mobile App:** Independent Native Android App (`mobile-app/`) using React Native + Expo Development Build + Expo Router + TypeScript + Expo SQLite + Expo SecureStore

---

## 1. Executive Summary

The existing KhataPro / SmartKhata web application is a full-stack Next.js 15 App Router SaaS platform backed by Supabase PostgreSQL, Supabase Auth, Supabase Storage (`khatapro-media`), Google Drive API v3, Cashfree PG, Razorpay, and Nodemailer SMTP.

Previously, `android-app/` (`com.smartkhata.app`, `SmartKhata-v1.0.0-release.apk`, 2.09 MB) was built as a **Kotlin + Jetpack Compose WebView wrapper** loading `https://smartkhata.netsell.in`. While functional for quick wrapping, it depends on the remote web bundle and browser `localStorage`/Service Worker.

**Phase 1 Goal:** Replace the WebView dependency with a **genuine, standalone native Android application** inside `mobile-app/` that shares the **exact same production Supabase database, user accounts, APIs, and business rules** while providing native Android screens, offline-first SQLite storage with an idempotent sync queue, native camera/PDF/UPI/WhatsApp/biometric integrations, and Play Store–ready APK/AAB builds.

---

## 2. Existing Web & Android Codebase Audit

### 2.1 Web Application (`src/`)
- **Framework & Runtime:** Next.js 15 (`App Router`), React 19, TypeScript 5, Tailwind CSS 3.4, `lucide-react`, `recharts`, `framer-motion`, `jspdf`, `exceljs`, `jszip`, `qrcode`, `nodemailer`, `googleapis`, `@supabase/supabase-js`.
- **State & Persistence (`src/context/AppContext.tsx`, `src/services/storage.ts`):**
  - Web uses per-user scoped `localStorage` keys (`skp_<key>_<userId>`) + `StorageService` + `mergeEntities` timestamp reconciliation + Supabase Realtime (`khatapro_realtime_<userId>`) + `BroadcastChannel`.
  - Offline mode on web relies on `public/sw.js` (Service Worker caching routes/RSC/static assets) and `skp_pending_offline_sync_<userId>`.
- **Server API Layer (`src/app/api/` — 43 route handlers):**
  - Auth & Devices: `/api/auth/login`, `/api/auth/register`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/update-password`, `/api/auth/check-availability`, `/api/auth/devices`.
  - Sync & Groups & P2P: `/api/db/sync`, `/api/db/test`, `/api/groups`, `/api/groups/join`, `/api/users/lookup`, `/api/users/p2p-link`, `/api/users/p2p-mutate`.
  - Payments: `/api/pay/confirm`, `/api/pay/link-details`, `/api/cashfree/config`, `/api/cashfree/order`, `/api/cashfree/verify`, `/api/razorpay/order`, `/api/razorpay/verify`, `/api/currency/rates`.
  - Google Drive & Backups: `/api/backup/google-drive/{auth,callback,status,upload-file,view-file,delete-file,rename-file,preview,discover,backup-now,restore,disconnect,cron}`, `/api/backup/telegram`.
  - Admin & System: `/api/system/config`, `/api/support/tickets`, `/api/admin/{users,database-reset,env-config,smtp/test,maintenance/bypass}`.

### 2.2 Existing `android-app/` Audit (WebView Wrapper)
- **Location:** `android-app/` (Package `com.smartkhata.app`, `minSdk = 24`, `targetSdk = 35`, `compileSdk = 36`, release keystore `android-app/smartkhata-release.jks`).
- **How it works:** `MainActivity.kt` renders a Jetpack Compose `Box` containing an `AndroidView(WebView)` pointing to `https://smartkhata.netsell.in`. It provides `AndroidNativeBridge` (`saveBase64File`, `printCurrentPage`), `onShowFileChooser` (Camera + Gallery/PDF), `DownloadManager`, UPI/WhatsApp intent interception, and `onPermissionRequest`.
- **Preservation Rule:** `android-app/` will **not** be deleted or modified; all new native React Native development lives strictly inside `mobile-app/`.

---

## 3. Critical Architectural Findings & Risks Discovered

1. **Next.js Server Actions vs Mobile:** The app uses REST-style Route Handlers (`src/app/api/.../route.ts`), NOT Next.js Server Actions — which is **ideal** for React Native `fetch` calls.
2. **Authentication Header Convention:** Web routes currently identify callers via `skp_auth_session` cookie or `X-Auth-Session: <userId>` header (`getCallerUserId`). Mobile must send `X-Auth-Session` (and we should avoid exposing `SUPABASE_SERVICE_ROLE_KEY` in the APK; all privileged DB/Drive/Gateway calls go through Next.js API routes).
3. **Virtual Tables Inside `global_config`:** Shared Khata Groups (`shared_khata_groups`), Support Tickets (`support_ticket_*`), Global Branding/SMTP/Drive config (`global_config`), and Login Lockouts (`login_lockout_*`) are stored as JSONB inside `public.global_config.maintenance_mode`. Mobile must read/write them through `/api/groups`, `/api/support/tickets`, and `/api/system/config` — never by directly mutating `global_config` from the client.
4. **Media Storage Dual Mode:**
   - When `googleDriveEnabled` is `true` and the merchant has connected Google Drive, uploads go **only** to Google Drive (`/api/backup/google-drive/upload-file`) and resolve via `/api/backup/google-drive/view-file?fileId=...`.
   - Otherwise, uploads go to `khatapro-media` Supabase Storage under `${userId}/${folder}/...`.
5. **Financial Conflict & Idempotency Risk:** Web's `mergeEntities` uses `updatedAt` last-write-wins for edits. For native mobile offline-first (`Phase 4`), financial transactions must use **stable UUIDs, idempotency keys, ordered sync queues, and explicit conflict detection** rather than silent overwrites.
6. **Payment Security:** Cashfree & Razorpay secrets live per-merchant in `system_settings.payment_settings` on the server. Mobile must NEVER store gateway secrets locally; it must create orders via `/api/cashfree/order` or `/api/razorpay/order` and verify settlements via `/api/cashfree/verify`, `/api/razorpay/verify`, and `/api/pay/confirm`.

---

## 4. Environment & Tooling Readiness

- **Java:** OpenJDK 17 (`17.0.19`) installed.
- **Android SDK:** `C:\Users\Admin\AppData\Local\Android\Sdk` with `android-35`, `android-36`, `build-tools 36.0.0`, and `android` CLI installed.
- **Node.js / TypeScript:** Installed and verified (`npx tsc --noEmit` & `npm run build` pass).
- **Supabase:** Existing production project (`https://efpszmfgiutgrjpaopnj.supabase.co`) will be reused directly.
