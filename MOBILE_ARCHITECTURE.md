# MOBILE ARCHITECTURE — KhataPro / SmartKhata Native Android

**Target Platform:** Android Only (`minSdk 24`, `targetSdk 35`)  
**Workspace Folder:** `mobile-app/` (completely isolated from Next.js web `src/` and legacy `android-app/`)

---

## 1. Technology Stack

- **Core:** React Native + Expo SDK 52+ (Expo Development Build / Prebuild) + TypeScript 5 (strict)
- **Navigation:** Expo Router (typed file-based native stack + bottom tabs)
- **Local Persistence:** `expo-sqlite` (ACID local database + persistent offline sync queue)
- **Secure Storage:** `expo-secure-store` (session tokens, device ID, biometric lock flag)
- **Server & Realtime:** `@supabase/supabase-js` (Realtime WebSockets `khatapro_realtime_<userId>`) + TanStack Query (`@tanstack/react-query`) + REST API client pointing to existing Next.js backend
- **Native Capabilities:**
  - `expo-camera` / `expo-image-picker` / `expo-document-picker` (bills, receipts, avatars, QR)
  - `expo-print` & `expo-sharing` & `expo-file-system` (PDF invoices/statements + WhatsApp/Android share sheet)
  - `expo-local-authentication` (Biometric / Fingerprint app lock)
  - `expo-notifications` (reminders, P2P alerts, sync notifications)
  - `@react-native-community/netinfo` (real-time connectivity + background retry)
  - `react-native-qrcode-svg` (native UPI QR generation)
  - `react-native-razorpay` / Cashfree native checkout or in-app custom tab for verified gateway checkout (never trusting client-only status; always verifying via `/api/pay/confirm`, `/api/cashfree/verify`, `/api/razorpay/verify`).

---

## 2. Proposed `mobile-app/` Folder Structure

```text
mobile-app/
├── app.json / app.config.ts        # Expo Android config, permissions, adaptive icon, splash, deep links
├── package.json
├── tsconfig.json
├── assets/                         # Brand logo, adaptive icon, splash from public/brand-logo.png
└── src/
    ├── app/                        # Expo Router screens
    │   ├── _layout.tsx             # Root providers (QueryClient, SQLite, Auth, Theme, SyncEngine)
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   ├── register.tsx
    │   │   ├── otp-verify.tsx
    │   │   └── forgot-password.tsx
    │   ├── (tabs)/                 # Bottom Tab Navigator (5 primary tabs)
    │   │   ├── index.tsx           # Dashboard (KPIs, Net K-E-I, Pending, Charts)
    │   │   ├── khata.tsx           # Digital KhataBook (Customers + Groups)
    │   │   ├── invoices.tsx        # GST Billing & Invoicing
    │   │   ├── expenses.tsx        # Expense Tracker & Budget Cap
    │   │   └── more.tsx            # CRM, Collect, Inventory, Analytics, Backup, Settings, Admin
    │   ├── khata/[customerId].tsx  # Customer Ledger Chat, Keypad Udhar/Jama, Statements
    │   ├── khata/group/[groupId].tsx # Shared Group Ledger & Bill Split
    │   ├── customers/[id].tsx      # Customer Profile, Bank/UPI, Drive Vault, Business Card
    │   ├── invoices/create.tsx     # Invoice Builder (GST, Items, Charges, Templates)
    │   ├── collect/index.tsx       # Direct UPI QR, Cashfree, Razorpay, Payment Links
    │   ├── inventory/index.tsx
    │   ├── savings/index.tsx
    │   ├── reminders/index.tsx
    │   ├── documents/index.tsx
    │   ├── notes-tasks/index.tsx
    │   ├── analytics/index.tsx
    │   ├── backup/index.tsx
    │   ├── settings/index.tsx      # Business Profile, Security/2FA, Devices, Biometric
    │   └── admin/index.tsx         # Role-gated Admin Control Center
    ├── components/                 # Native UI components (SyncNotch, KeypadSheet, QRCard, Charts)
    ├── db/                         # Expo SQLite schema, migrations, DAOs, SyncQueueDAO
    ├── services/                   # API client, AuthService, SyncEngine, MediaUploadService, PdfService
    ├── hooks/                      # useNetworkStatus, useSyncQueue, useBiometricLock, usePermissions
    ├── stores/                     # Session, Theme, ActiveSyncState
    └── types/                      # Shared domain TypeScript models matching src/types/index.ts
```

---

## 3. API Reuse Strategy

- **Zero Duplication of Server Secrets:** All privileged operations (Google OAuth token exchange/encryption, Cashfree/Razorpay order creation & verification, SMTP OTP/Welcome emails, P2P mirroring, Admin User CRM, Database Reset) continue to run on the existing Next.js `/api/*` backend.
- **Public Env Only in APK:** `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (for Realtime WebSockets). Never embed `SUPABASE_SERVICE_ROLE_KEY`, `DRIVE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`, or gateway secrets.
- **Same Financial Formulas:** Mobile reuses exact web calculation rules:
  - Khata Net (`K`): `khataCredit - khataDebit` (excluding `excludeTransactions` customers)
  - Net Amount: `K - currentMonthExpenses`
  - Cashfree/Razorpay 2% PG fee on public checkout links; 0% on Direct UPI / UPI PG.
  - Invoice GST (`CGST + SGST` / `IGST`) and `stockDeducted` rules.
